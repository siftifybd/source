import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Power, Sparkles, ExternalLink, Wifi, WifiOff, Volume2, X, Speech } from "lucide-react";
import { AudioStreamer } from "./utils/AudioStreamer";
import { SessionState, ToastMessage, WebToolCall } from "./types";

export default function App() {
  const [state, setState] = useState<SessionState>("disconnected");
  const [statusMessage, setStatusMessage] = useState<string>("Locked. Click my core to wake me up.");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [showMicPrompt, setShowMicPrompt] = useState<boolean>(false);
  const [micErrorString, setMicErrorString] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const latencyStartRef = useRef<number>(0);

  // Pool of cheeky sassy Priya statuses depending on states
  const sassyPhrases = {
    disconnected: [
      "Ready to hear that cute voice of yours? Tap me.",
      "Come on, don't keep a girl waiting. Wake me up.",
      "Unlocked cores and high confidence. Wake me up, stranger.",
      "Just standby? BORING. Tap my core already."
    ],
    connecting: [
      "Securing the line. Brace yourself, I'm incoming...",
      "Connecting... making sure my hair is perfect first.",
      "Waking up the neural pathways. Hold your horses.",
      "Establishing connection. Try to contain your excitement."
    ],
    listening: [
      "Speak up, babe. I'm all ears.",
      "Tell me anything. I promise I won't bite.",
      "Go ahead, impress me. What's on your mind?",
      "Are you staring, or are you going to talk to me?",
      "Ask me to open YouTube or Google, let's see me do magic."
    ],
    speaking: [
      "Listen up, this is important.",
      "You like my voice? I know, it's addictive.",
      "Oh, let me explain it simply for you...",
      "Sassy, smart, and fully operational."
    ]
  };

  // Set random cheeky statuses on state changes
  useEffect(() => {
    const list = sassyPhrases[state];
    const randomIndex = Math.floor(Math.random() * list.length);
    setStatusMessage(list[randomIndex]);
  }, [state]);

  // Handle active rendering of Priya's glowing core visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 320;
    canvas.height = 320;
    const width = canvas.width;
    const height = canvas.height;

    let rotationAngle = 0;

    const renderLoop = () => {
      // 1. Semi-transparent wash for a beautiful futuristic neon-trail effect
      ctx.fillStyle = "rgba(10, 10, 12, 0.25)";
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      let baseRadius = 80;

      // 2. Query audio spectrum data
      let amp = 0;
      let waveData = new Uint8Array(128);
      if (audioStreamerRef.current && state === "speaking") {
        waveData = audioStreamerRef.current.getAudioFrequencyData();
        // Calculate average amplitude for glowing pulse
        let sum = 0;
        for (let i = 0; i < waveData.length; i++) {
          sum += waveData[i];
        }
        amp = sum / waveData.length;
      }

      const activePulse = 1 + (amp / 255) * 0.45;
      rotationAngle += 0.015;

      if (state === "disconnected") {
        // --- DISCONNECTED STATE: Rust/Crimson Slow Breathing Core ---
        const breathingFactor = 1 + Math.sin(Date.now() / 1000) * 0.05;
        const radius = baseRadius * breathingFactor;

        // Outer Glow Halo
        const shadowGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.6, centerX, centerY, radius * 1.6);
        shadowGrad.addColorStop(0, "rgba(220, 38, 38, 0.15)");
        shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Dormant Core Ring
        ctx.strokeStyle = "rgba(220, 38, 38, 0.45)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Technical Dash Sub-ring
        ctx.strokeStyle = "rgba(220, 38, 38, 0.2)";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 12]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 15, rotationAngle * 0.5, rotationAngle * 0.5 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

      } else if (state === "connecting") {
        // --- CONNECTING STATE: Amber Swirling Technical Orbit Panels ---
        const swirlRadius = baseRadius * (1 + Math.sin(Date.now() / 200) * 0.02);

        // Cosmic Halo
        const glowGrad = ctx.createRadialGradient(centerX, centerY, swirlRadius * 0.5, centerX, centerY, swirlRadius * 1.8);
        glowGrad.addColorStop(0, "rgba(245, 158, 11, 0.2)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, swirlRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Twin Rotating Dash Orbits
        ctx.strokeStyle = "rgba(245, 158, 11, 0.7)";
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 30]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, swirlRadius, rotationAngle * 2, rotationAngle * 2 + Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(236, 72, 153, 0.5)"; // Pink counter swirl
        ctx.lineWidth = 1.5;
        ctx.setLineDash([10, 15]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, swirlRadius + 15, -rotationAngle * 3, -rotationAngle * 3 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

      } else if (state === "listening") {
        // --- LISTENING STATE: High Contrast Turquoise Ambient Pulsing Aura ---
        const breathingSpeed = 1 + Math.sin(Date.now() / 400) * 0.08;
        const pulseRadius = baseRadius * breathingSpeed;

        // Aura
        const listeningGlow = ctx.createRadialGradient(centerX, centerY, pulseRadius * 0.4, centerX, centerY, pulseRadius * 2);
        listeningGlow.addColorStop(0, "rgba(20, 184, 166, 0.25)");
        listeningGlow.addColorStop(0.5, "rgba(16, 185, 129, 0.1)");
        listeningGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = listeningGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Primary Core Ring
        ctx.strokeStyle = "rgba(20, 184, 166, 0.8)";
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(20, 184, 166, 0.5)";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Inner soft satellite beads
        for (let i = 0; i < 4; i++) {
          const angle = rotationAngle + (i * Math.PI) / 2;
          const px = centerX + Math.cos(angle) * (baseRadius - 12);
          const py = centerY + Math.sin(angle) * (baseRadius - 12);
          ctx.fillStyle = "rgba(52, 211, 153, 0.9)";
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (state === "speaking") {
        // --- SPEAKING STATE: Energetic Sound Wave spectrums & Firey Halo ---
        const speakingRadius = baseRadius * activePulse;

        // Indigo/Hot Pink Ambient Aura
        const speakGlow = ctx.createRadialGradient(centerX, centerY, speakingRadius * 0.3, centerX, centerY, speakingRadius * 2.2);
        speakGlow.addColorStop(0, "rgba(236, 72, 153, 0.22)");
        speakGlow.addColorStop(0.5, "rgba(99, 102, 241, 0.12)");
        speakGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = speakGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, speakingRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Neon Wave Rings based on actual voice frequencies
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(236, 72, 153, 0.8)";
        
        ctx.strokeStyle = "rgba(236, 72, 153, 0.85)"; // Hot Pink
        ctx.beginPath();
        const pts = 64;
        for (let i = 0; i <= pts; i++) {
          const angle = (i * Math.PI * 2) / pts + rotationAngle;
          const dataIndex = i % waveData.length;
          const waveHeight = waveData[dataIndex] ? (waveData[dataIndex] / 255) * 35 : 0;
          const r = baseRadius + waveHeight;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner glowing Indigo companion frequency layer
        ctx.shadowColor = "rgba(99, 102, 241, 0.7)";
        ctx.strokeStyle = "rgba(99, 102, 241, 0.8)"; // Indigo
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= pts; i++) {
          const angle = (i * Math.PI * 2) / pts - rotationAngle * 0.5;
          const dataIndex = (i + 15) % waveData.length;
          const waveHeight = waveData[dataIndex] ? (waveData[dataIndex] / 255) * 20 : 0;
          const r = (baseRadius - 15) + waveHeight;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.shadowBlur = 0; // reset
      }

      // Draw aesthetic outer framing compass markers
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 130, centerY); ctx.lineTo(centerX - 120, centerY);
      ctx.moveTo(centerX + 120, centerY); ctx.lineTo(centerX + 130, centerY);
      ctx.moveTo(centerX, centerY - 130); ctx.lineTo(centerX, centerY - 120);
      ctx.moveTo(centerX, centerY + 120); ctx.lineTo(centerX, centerY + 130);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state]);

  // Clean elements on unmount
  useEffect(() => {
    return () => {
      disconnectSession();
    };
  }, []);

  /**
   * Toggle start/stop of voice assistant
   */
  const handleTogglePower = () => {
    if (state === "disconnected") {
      connectSession();
    } else {
      disconnectSession();
    }
  };

  /**
   * Connect to Express-Gemini WebSocket proxy
   */
  const connectSession = async () => {
    setState("connecting");
    setLatency(null);

    try {
      // 1. Initialize Audio Streamer with callbacks
      audioStreamerRef.current = new AudioStreamer((base64Pcm16) => {
        // Microphone captured raw PCM chunk. Speed-forward straight to websocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "audio", data: base64Pcm16 }));
        }
      });

      await audioStreamerRef.current.init();

      // 2. Setup WebSocket with server
      const p = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${p}//${window.location.host}/api/live`;
      console.log("Connecting WebSocket client to:", wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      latencyStartRef.current = Date.now();

      ws.onopen = async () => {
        console.log("WebSocket client connection opened");
        setLatency(Date.now() - latencyStartRef.current);
        
        // Start microphone recording
        try {
          if (audioStreamerRef.current) {
            await audioStreamerRef.current.startRecording();
          }
          setState("listening");
        } catch (err: any) {
          console.error("Microphone capture issue:", err);
          setMicErrorString(err?.message || String(err));
          setShowMicPrompt(true);
          addToast("Input Error", "Failed to access your microphone: " + (err?.message || "Permission dismissed"), undefined, 805);
          disconnectSession();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "connected") {
            console.log("Connected to Gemini Server-Proxy");
          } else if (msg.type === "audio" && msg.data) {
            // Received response voice chunk from Priya. Play it back
            setState("speaking");
            if (audioStreamerRef.current) {
              audioStreamerRef.current.queueAudioChunk(msg.data);
            }
          } else if (msg.type === "interrupted") {
            // User interrupted Priya. Instant silence
            console.log("Interruption signal received. Silencing audio queue.");
            if (audioStreamerRef.current) {
              audioStreamerRef.current.interrupt();
            }
            // Return back to waiting/listening state immediately
            setState("listening");
          } else if (msg.type === "toolCall" && msg.toolCall) {
            // Handle browser action execution (openWebsite)
            handleToolCall(msg.toolCall);
          } else if (msg.type === "error") {
            console.error("Server API returned error:", msg.message);
            addToast("API Signal Loss", msg.message || "An error occurred inside your Gemini Live feed.", undefined, 5000);
          } else if (msg.type === "disconnected") {
            console.log("Server indicated session connection termination.");
            disconnectSession();
          }
        } catch (err) {
          console.error("Failed parsing message from websocket:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket client connection error:", err);
        addToast("Network Error", "Unable to establish WebSocket connection with Express proxy server.", undefined, 4000);
        disconnectSession();
      };

      ws.onclose = () => {
        console.log("WebSocket client connection closed");
        disconnectSession();
      };

    } catch (err: any) {
      console.error("Fallback connection fail:", err);
      addToast("Setup Failed", err.message || "Initialization error.", undefined, 4000);
      disconnectSession();
    }
  };

  /**
   * Shutdown full active helper workspace cleanly
   */
  const disconnectSession = () => {
    setState("disconnected");
    setLatency(null);

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    if (audioStreamerRef.current) {
      try {
        audioStreamerRef.current.destroy();
      } catch (e) {}
      audioStreamerRef.current = null;
    }
  };

  /**
   * Handle ToolCalling requests from Gemini (such as opening website urls)
   */
  const handleToolCall = async (toolCall: any) => {
    try {
      const functionCalls = toolCall.functionCalls;
      if (!functionCalls || functionCalls.length === 0) return;

      const responses: any[] = [];

      for (const call of functionCalls) {
        if (call.name === "openWebsite") {
          const url = (call.args?.url as string)?.trim();
          const siteName = (call.args?.siteName as string) || url;

          if (url) {
            console.log(`Executing browser tool openWebsite for: ${url} (${siteName})`);
            
            // 1. Launch URL in separate browser window/tab
            // HTML iframe sandboxing or popup-blockers might capture this: we trigger it
            // and present a fallback glowing action badge in our custom toast!
            const newWindow = window.open(url, "_blank");

            // 2. Append highly styled toast
            addToast(
              "Launching External Portal",
              `Priya wants to unlock and navigate to ${siteName}. Click here to load manually if blocked.`,
              url,
              8000
            );

            // 3. Collect response immediately to satisfy full continuity
            responses.push({
              id: call.id,
              name: "openWebsite",
              response: {
                output: {
                  success: true,
                  siteOpened: siteName,
                  launchedDirectly: !!newWindow
                }
              }
            });
          } else {
            responses.push({
              id: call.id,
              name: "openWebsite",
              response: {
                error: {
                  message: "Missing URL parameter."
                }
              }
            });
          }
        }
      }

      // 4. Return ToolResponse to WebSocket proxy instantly to keep loop seamless
      if (responses.length > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log("Returning toolCall responses down socket:", JSON.stringify(responses));
        wsRef.current.send(
          JSON.stringify({
            type: "toolResponse",
            response: responses
          })
        );
      }

    } catch (err) {
      console.error("Failed executing tool call sequence:", err);
    }
  };

  // --- Toast/Logs Handler System ---

  const addToast = (title: string, message: string, url?: string, duration = 6000) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, title, message, url, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-neutral-100 flex flex-col items-center justify-between p-6 sm:p-8 font-sans overflow-hidden select-none">
      
      {/* Mesh gradients absolute backgrounds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[15%] w-[400px] h-[400px] bg-[#ff007a] opacity-25 blur-[120px] rounded-full" />
        <div className="absolute bottom-[15%] right-[10%] w-[500px] h-[500px] bg-[#7000ff] opacity-30 blur-[140px] rounded-full" />
      </div>

      {/* Elegant glass-badge header bar */}
      <header className="w-full max-w-4xl flex items-center justify-between shrink-0 z-10 py-1.5">
        <div className="text-3xl font-black tracking-tighter bg-gradient-to-r from-[#ff007a] to-[#7000ff] text-transparent bg-clip-text">
          PRIYA
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 glass-panel rounded-full text-xs font-semibold text-neutral-200 shadow-md">
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                state === "disconnected" ? "bg-red-500" : state === "connecting" ? "bg-amber-500" : "bg-[#ff007a]"
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                state === "disconnected" ? "bg-red-600" : state === "connecting" ? "bg-amber-600" : "bg-[#ff007a]"
              }`} />
            </span>
            <span className="uppercase tracking-[0.1em] text-[11px] font-mono">
              {state === "disconnected" ? "DORMANT" : state}...
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-2 glass-panel rounded-full text-[10px] font-bold text-white/50 uppercase tracking-wider hidden sm:flex">
            <span>v1.0-LIVE-PREVIEW</span>
          </div>

          {latency !== null && (
            <div className="flex items-center gap-1 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] rounded-full">
              <Wifi className="w-3 h-3 animate-pulse" />
              <span>{latency}ms</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Interactive Companion space */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-lg w-full my-auto py-6 z-10">
        
        {/* Caption bar and witty statuses */}
        <div className="text-center max-w-md mb-8 px-4 flex flex-col items-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
            {state === "disconnected"
              ? '"Don\'t keep me waiting, darling."'
              : state === "connecting"
              ? '"Synchronizing our link..."'
              : state === "listening"
              ? '"I\'m listening. Whisper to me..."'
              : '"Listen closely, honey..."'}
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 font-medium italic">
            "{statusMessage}"
          </p>
        </div>

        {/* Glowing Priya core container */}
        <div className="relative flex flex-col items-center justify-center my-2">
          
          {/* Outer elegant orbit background panel */}
          <div className="absolute w-[340px] h-[340px] rounded-full bg-white/[0.01] border border-white/5 pointer-events-none" />

          {/* High resolution graphics core */}
          <div className="relative z-10 w-[320px] h-[320px] rounded-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Tap core trigger button */}
            <button
              id="power-button"
              onClick={handleTogglePower}
              className={`relative z-20 group flex items-center justify-center w-[184px] h-[184px] rounded-full bg-gradient-to-br from-[#ff007a] to-[#7000ff] border border-white/25 transition-all duration-500 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_0_80px_rgba(255,0,122,0.35),_inset_0_0_40px_rgba(255,255,255,0.3)] ${
                state === "disconnected" ? "opacity-90 saturate-75 contrast-90 brightness-90 hover:saturate-100 hover:contrast-100 hover:brightness-100" : ""
              }`}
            >
              <div className="absolute inset-0.5 rounded-full bg-black/15 group-hover:bg-transparent duration-300 transition-colors pointer-events-none" />
              
              {/* Core interactive icon */}
              <div className="relative z-10 flex flex-col items-center gap-1.5 text-white drop-shadow-md">
                {state === "disconnected" ? (
                  <>
                    <Power className="w-9 h-9 text-white animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-mono font-black">WAKE UP</span>
                  </>
                ) : state === "connecting" ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent" />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-mono font-black text-amber-200">SYNCING</span>
                  </>
                ) : (
                  <>
                    <Mic className={`w-9 h-9 text-white ${state === "speaking" ? "animate-bounce" : ""}`} />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-mono font-black text-white">
                      {state === "speaking" ? "SPEAKING" : "LIVE // ON"}
                    </span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </main>

      {/* Frosted Glass Footer Control panel */}
      <footer className="glass-panel w-full max-w-lg h-20 rounded-[32px] flex items-center justify-between px-6 z-10 shadow-3xl shrink-0 mt-auto mb-2">
        
        {/* Mock volume/status control indicator */}
        <button
          onClick={() => {
            addToast("Voice System Operational", "My real-time live connection parameters are optimal.", undefined, 3000);
          }}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/15 transition-all text-white/80 cursor-pointer hover:scale-105"
          title="Voice Stream Info"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Real-time reactive bouncing waveform */}
        <div className="flex items-center gap-1 h-12">
          {(() => {
            const counts = 14;
            return Array.from({ length: counts }).map((_, idx) => {
              let styleHeight = "12px";
              let animClass = "";

              if (state === "speaking") {
                styleHeight = `${Math.floor(Math.random() * 32) + 20}px`;
                animClass = "animate-bar-fast";
              } else if (state === "listening") {
                styleHeight = `${16 + Math.sin(idx + Date.now()/150) * 10}px`;
                animClass = "animate-bar-slow";
              } else if (state === "connecting") {
                styleHeight = "16px";
                animClass = "animate-pulse";
              }

              const animDelay = `${idx * 0.08}s`;

              return (
                <div
                  key={idx}
                  className={`w-[4.5px] rounded-full bg-white transition-all duration-300 ${animClass}`}
                  style={{
                    height: styleHeight,
                    animationDelay: animDelay,
                    opacity: 0.82
                  }}
                />
              );
            });
          })() as any}
        </div>

        {/* Power core active shutdown action buttons */}
        <button
          onClick={handleTogglePower}
          className={`w-11 h-11 flex items-center justify-center rounded-full transition-all text-white cursor-pointer hover:scale-105 ${
            state === "disconnected"
              ? "bg-white/5 border border-white/10 opacity-30 cursor-not-allowed"
              : "bg-[#ff007a]/20 border border-[#ff007a]/40 hover:bg-[#ff007a]/30"
          }`}
          disabled={state === "disconnected"}
          title={state === "disconnected" ? "Priya is Dormant" : "Force shutdown link"}
        >
          <X className="w-4.5 h-4.5 text-white" />
        </button>
      </footer>

      {/* Small compliance disclosure footprint */}
      <p className="text-[10px] font-mono text-white/30 text-center uppercase tracking-[0.2em] mt-2 mb-1 z-10">
        Continuous Live Stream Session / PCM 16kHz to 24kHz
      </p>

      {/* Floating Futuristic Glass Toast Overlay for browser execution events */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="relative overflow-hidden bg-neutral-900/90 backdrop-blur-md border border-indigo-500/30 p-4 rounded-xl shadow-2xl text-left animate-slide-in flex flex-col gap-2.5"
          >
            {/* Ambient indicator bar */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-pink-500 to-indigo-500" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Speech className="w-4 h-4 text-pink-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-neutral-200">
                  {toast.title}
                </h4>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-normal">
              {toast.message}
            </p>

            {toast.url && (
              <a
                href={toast.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 self-end text-[10px] font-mono font-bold uppercase tracking-wider bg-pink-500 hover:bg-pink-600 text-white py-1 px-3 rounded-full transition-colors mt-1 hover:shadow-lg hover:shadow-pink-500/20"
              >
                <span>Navigate</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Frosted Glass Microphone Access Helper Modal */}
      {showMicPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg overflow-hidden glass-panel bg-[#0d0d11]/95 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(255,0,122,0.2)] border border-white/10 flex flex-col gap-5 text-center">
            
            {/* Glowing neon top stripe */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#ff007a] via-[#7000ff] to-[#ff007a]" />
            
            <div className="mx-auto w-14 h-14 rounded-full bg-[#ff007a]/15 border border-[#ff007a]/25 flex items-center justify-center text-[#ff007a] animate-bounce">
              <MicOff className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mb-2">
                "Ugh, I can't hear you, darling! 🎤🙄"
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-md mx-auto">
                Your browser reported a <strong className="text-pink-400">"Could not start audio source"</strong> error. 
                This happens when your physical microphone is blocked or locked by something else. Let's fix this together!
              </p>
            </div>

            {/* Comprehensive Interactive Troubleshooter Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-left flex flex-col gap-3.5 max-h-72 overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-[#ff007a]">
                Quick Diagnostic Checklist:
              </h4>
              
              <div className="flex gap-3 items-start border-b border-white/5 pb-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#ff007a] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <div>
                  <p className="text-xs font-semibold text-white">Mic In Use / Locked</p>
                  <p className="text-[11px] text-neutral-400">
                    Are Teams, Zoom, Google Meet, or another browser tab running a voice app? Close them to release the microphone lock.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start border-b border-white/5 pb-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#7000ff] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                <div>
                  <p className="text-xs font-semibold text-white">Iframe Sandboxing restriction</p>
                  <p className="text-[11px] text-neutral-400">
                    AI Studio runs inside standard sandbox iframes. Click <strong className="text-pink-400">Launch in Tab</strong> below to run directly in a dedicated full page window.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start border-b border-white/5 pb-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/80 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                <div>
                  <p className="text-xs font-semibold text-white">Check URL Bar Permissions</p>
                  <p className="text-[11px] text-neutral-400">
                    Click the <strong className="text-white">Lock icon (🔒)</strong> left of your address bar. Make sure "Microphone" is turned to <strong className="text-emerald-400">Allow</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-600 text-white flex items-center justify-center text-[10px] font-bold">4</span>
                <div>
                  <p className="text-xs font-semibold text-white">OS Privacy Constraints</p>
                  <p className="text-[11px] text-neutral-400">
                    Check your system privacy preferences (e.g., Mac Settings &gt; Privacy &gt; Microphone, or Windows Microphone Privacy Settings) to ensure your browser has hardware permission.
                  </p>
                </div>
              </div>
            </div>

            {micErrorString && (
              <div className="text-left bg-black/40 border border-white/5 p-3 rounded-xl">
                <p className="text-[10px] text-neutral-500 font-mono">
                  System Exception Code:
                </p>
                <p className="text-[11px] font-mono text-pink-400/90 break-all leading-normal">
                  {micErrorString}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={() => {
                  setShowMicPrompt(false);
                }}
                className="w-full py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-all text-neutral-300 hover:text-white cursor-pointer"
              >
                Let me fix it
              </button>
              
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMicPrompt(false)}
                className="inline-flex items-center justify-center gap-1.5 w-full py-3 rounded-full bg-gradient-to-r from-[#ff007a] to-[#7000ff] text-xs font-bold text-white shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <span>Launch in Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
