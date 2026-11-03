/**
 * AudioStreamer manages Web Audio API for Priya's voice assistant.
 * It records client mic (PCM 16kHz) and plays Gemini responses (PCM 24kHz).
 */
export class AudioStreamer {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micProcessor: ScriptProcessorNode | null = null;
  private playerAnalyser: AnalyserNode | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onAudioChunk: (base64Pcm16: string) => void;

  constructor(onAudioChunk: (base64Pcm16: string) => void) {
    this.onAudioChunk = onAudioChunk;
  }

  /**
   * Initialize audio context and analyser
   */
  public async init() {
    if (this.audioCtx) return;

    // Use default or fallback
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    
    // Some browsers do not support setting a target sampleRate on the main AudioContext directly,
    // causing a "Could not start audio source" or failure to initialize. We let it initialize
    // with standard hardware rate (e.g., 44100 - 48000Hz) and downsample in software.
    try {
      this.audioCtx = new AudioContextClass();
    } catch (e) {
      console.warn("Failed creating standard audio context. Retrying with options...", e);
      this.audioCtx = new AudioContextClass({ latencyCategory: "interactive" });
    }

    // Setup an AnalyserNode solely for output playback
    this.playerAnalyser = this.audioCtx.createAnalyser();
    this.playerAnalyser.fftSize = 256;
    this.playerAnalyser.connect(this.audioCtx.destination);
  }

  /**
   * Start microphone capture
   */
  public async startRecording() {
    await this.init();
    if (!this.audioCtx) throw new Error("Audio Context not initialized");

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    // Fallback chain for getUserMedia to accommodate restricted VM sound cards / sandboxes
    try {
      try {
        console.log("Applying high-quality mic constraints...");
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (e) {
        console.warn("High-quality mic constraints rejected. Falling back to simplistic audio...", e);
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
      }

      this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
      
      // Create ScriptProcessor with buffer size 2048 (single channel input).
      // Standard ScriptProcessor works legacy-wide for real-time PCM transmission.
      this.micProcessor = this.audioCtx.createScriptProcessor(2048, 1, 1);

      const sourceSampleRate = this.audioCtx.sampleRate;
      console.log(`Original capture sample rate: ${sourceSampleRate}Hz. Target: 16000Hz PCM.`);

      this.micProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Software Downsample: Convert from current hardware rate (e.g. 48000Hz) to 16000Hz expected by Gemini Live
        let samples = inputData;
        if (sourceSampleRate !== 16000) {
          samples = this.downsampleBuffer(inputData, sourceSampleRate, 16000);
        }

        // Convert Float32 array [-1.0, 1.0] to signed Int16 array [-32768, 32767]
        const pcm16 = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
          const sample = Math.max(-1, Math.min(1, samples[i]));
          pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Convert base64
        const base64 = this.arrayBufferToBase64(pcm16.buffer);
        this.onAudioChunk(base64);
      };

      this.micSource.connect(this.micProcessor);
      this.micProcessor.connect(this.audioCtx.destination);
    } catch (err) {
      console.error("Failed to capture user mic stream:", err);
      throw err;
    }
  }

  /**
   * Software linear downsampling helper from source rate to target rate
   */
  private downsampleBuffer(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return buffer;
    if (fromRate < toRate) return buffer; // No upsampling required

    const sampleRateRatio = fromRate / toRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    
    let offsetResult = 0;
    let offsetBuffer = 0;
    
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    
    return result;
  }

  /**
   * Stop microphone capture
   */
  public stopRecording() {
    if (this.micProcessor) {
      this.micProcessor.disconnect();
      this.micProcessor.onaudioprocess = null;
      this.micProcessor = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  /**
   * Standard helper to play a chunk of base64 PCM 24kHz sequential audio gaplessly.
   * Uses audio context clock scheduling to guarantee click-free playback.
   */
  public queueAudioChunk(base64Pcm: string) {
    if (!this.audioCtx || !this.playerAnalyser) return;

    try {
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      // 1. Convert base64 to Float32 values
      const float32Array = this.base64ToFloat32Array(base64Pcm);
      if (float32Array.length === 0) return;

      // 2. We request AudioBuffer at 24000Hz (the default output rate from Gemini)
      const buffer = this.audioCtx.createBuffer(1, float32Array.length, 24000);
      buffer.copyToChannel(float32Array, 0);

      // 3. Align next playback slot precisely
      const currentTime = this.audioCtx.currentTime;
      if (this.nextPlayTime < currentTime) {
        // Add a micro lag buffer to prevent initial jitter overlap
        this.nextPlayTime = currentTime + 0.05;
      }

      const sourceNode = this.audioCtx.createBufferSource();
      sourceNode.buffer = buffer;

      // Connect source to analyser, then destinations
      sourceNode.connect(this.playerAnalyser);

      // Schedule play precisely
      sourceNode.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;

      // Track active nodes for instant interruption clearing
      this.activeSources.push(sourceNode);
      sourceNode.onended = () => {
        this.activeSources = this.activeSources.filter((n) => n !== sourceNode);
      };
    } catch (err) {
      console.error("Failed scheduling audio queue playback:", err);
    }
  }

  /**
   * Interrupts/Silences all currently playing or queued audio responses immediately.
   */
  public interrupt() {
    console.log(`Silencing ${this.activeSources.length} playing audio nodes...`);
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped/ended
      }
    });
    this.activeSources = [];
    // Reset our queue clock completely
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
  }

  /**
   * Retrieves visual byte frequencies from Priya's scheduled speech stream.
   */
  public getAudioFrequencyData(): Uint8Array {
    if (!this.playerAnalyser) return new Uint8Array(128);
    const dataArray = new Uint8Array(this.playerAnalyser.frequencyBinCount);
    this.playerAnalyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Retrieves visual byte time-domain waves from Priya's slated speech stream.
   */
  public getAudioTimeDomainData(): Uint8Array {
    if (!this.playerAnalyser) return new Uint8Array(128);
    const dataArray = new Uint8Array(this.playerAnalyser.frequencyBinCount);
    this.playerAnalyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  /**
   * Completely dismantle resources
   */
  public destroy() {
    this.stopRecording();
    this.interrupt();
    if (this.audioCtx) {
      this.audioCtx.close().catch((err) => console.error(err));
      this.audioCtx = null;
    }
    this.playerAnalyser = null;
  }

  // --- Encoders & Decoders Helpers ---

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToFloat32Array(base64: string): Float32Array {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }
      return float32;
    } catch (e) {
      console.error("Decoder error:", e);
      return new Float32Array(0);
    }
  }
}
