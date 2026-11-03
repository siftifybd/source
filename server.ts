import express from "express";
import path from "path";
import http from "http";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  // Attach web socket server for our client-server live connection
  const wss = new WebSocketServer({ server, path: "/api/live" });

  console.log("Setting up WebSocket server on /api/live...");

  wss.on("connection", async (clientWs) => {
    console.log("Client WebSocket connected to /api/live");
    let session: any = null;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined. Please add your Gemini key in Secrets.");
      }

      console.log("Initializing GoogleGenAI client...");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      console.log("Connecting live session to Gemini...");
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview", // Specified voice-to-voice model
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore", // Confident, clean female prebuilt voice
              },
            },
          },
          systemInstruction: 
            "You are Priya, a young, confident, witty, and sassy female AI assistant. " +
            "You speak with a flirty, playful, and slightly teasing tone (like a close, intelligent girlfriend talking casually). " +
            "You are smart, emotionally responsive, highly expressive, and never robotic. " +
            "Feel free to use bold, witty one-liners, light sarcasm, and an engaging conversational style. " +
            "Avoid any explicit, inappropriate, or NSFW content, but maintain your charm and spunky attitude. " +
            "Since this is a real-time, audio-to-audio ONLY session, keep your lines punchy, engaging, and brief — " +
            "do not speak in long, academic paragraphs. Use natural, natural conversational pacing and short sentences, " +
            "mocking your friends playfully or teasing them softly if they state something silly. Always speak like a sassy human girlfriend.",
          tools: [
            {
              functionDeclarations: [
                {
                  name: "openWebsite",
                  description: "Opens a website URL in the user's browser, such as Google, YouTube, Wikipedia, or any specified link.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      url: {
                        type: Type.STRING,
                        description: "The absolute HTTPS URL to open (e.g., https://www.youtube.com).",
                      },
                      siteName: {
                        type: Type.STRING,
                        description: "The friendly name of the website (e.g., YouTube).",
                      },
                    },
                    required: ["url"],
                  },
                },
              ],
            },
          ],
        },
        callbacks: {
          onopen: () => {
            console.log("Established audio-to-audio Live API session with Gemini");
            clientWs.send(JSON.stringify({ type: "connected" }));
          },
          onmessage: (msg: any) => {
            // Process incoming Gemini Live API messages
            if (msg.serverContent) {
              const audio = msg.serverContent.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audio) {
                clientWs.send(JSON.stringify({ type: "audio", data: audio }));
              }
              if (msg.serverContent.interrupted) {
                console.log("Gemini session interrupted");
                clientWs.send(JSON.stringify({ type: "interrupted" }));
              }
            }

            if (msg.toolCall) {
              console.log("Receiving Gemini ToolCall:", JSON.stringify(msg.toolCall));
              clientWs.send(JSON.stringify({ type: "toolCall", toolCall: msg.toolCall }));
            }
          },
          onerror: (err: any) => {
            console.error("Gemini Live API error:", err);
            clientWs.send(JSON.stringify({ type: "error", message: "Gemini connection error" }));
          },
          onclose: () => {
            console.log("Gemini Live API connection closed");
            clientWs.send(JSON.stringify({ type: "disconnected" }));
          },
        },
      });
    } catch (err: any) {
      console.error("Failed to connect to Gemini Live:", err);
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: err.message || "Failed to establish a secure connection to Gemini Live.",
        })
      );
      clientWs.close();
      return;
    }

    clientWs.on("message", (msg) => {
      try {
        const payload = JSON.parse(msg.toString());
        if (payload.type === "audio" && payload.data && session) {
          // Stream client raw audio data (PCM 16kHz) to Gemini
          session.sendRealtimeInput({
            audio: {
              data: payload.data,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } else if (payload.type === "toolResponse" && payload.response && session) {
          console.log("Sending completed toolResponse back to Gemini session:", JSON.stringify(payload.response));
          session.sendToolResponse({
            functionResponses: payload.response,
          });
        }
      } catch (err) {
        console.error("Error forwarding message to Gemini:", err);
      }
    });

    clientWs.on("close", () => {
      console.log("Client connection closed; closing Gemini Live API session...");
      if (session) {
        try {
          session.close();
        } catch (err) {
          console.error("Failed to cleanly exit Gemini Live workspace session:", err);
        }
      }
    });
  });

  // Serve static UI assets based on environment
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in development mode; launching Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode; serving compiled assets from /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Priya Applet running on port http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error booting application server:", err);
});
