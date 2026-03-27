"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from "lucide-react";

export function VoiceWidget() {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "speaking" | "listening"
  >("idle");
  const [vapi, setVapi] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<
    { role: string; text: string }[]
  >([]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      status === "connected" ||
      status === "speaking" ||
      status === "listening"
    ) {
      interval = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startCall = useCallback(async () => {
    setStatus("connecting");
    setDuration(0);
    setTranscript([]);

    try {
      const Vapi = (await import("@vapi-ai/web")).default;
      const vapiInstance = new Vapi(
        process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || ""
      );

      vapiInstance.on("call-start", () => {
        setStatus("connected");
      });

      vapiInstance.on("speech-start", () => {
        setStatus("speaking");
      });

      vapiInstance.on("speech-end", () => {
        setStatus("listening");
      });

      vapiInstance.on("message", (msg: any) => {
        if (msg.type === "transcript" && msg.transcriptType === "final") {
          setTranscript((prev) => [
            ...prev,
            { role: msg.role, text: msg.transcript },
          ]);
        }
      });

      vapiInstance.on("call-end", () => {
        setStatus("idle");
        setIsMuted(false);
      });

      vapiInstance.on("error", (err: any) => {
        console.error("Vapi error:", err);
        setStatus("idle");
      });

      await vapiInstance.start(
        process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || ""
      );

      setVapi(vapiInstance);
    } catch (err) {
      console.error("Failed to start call:", err);
      setStatus("idle");
    }
  }, []);

  const endCall = useCallback(() => {
    if (vapi) {
      vapi.stop();
      setVapi(null);
    }
    setStatus("idle");
    setIsMuted(false);
  }, [vapi]);

  const toggleMute = useCallback(() => {
    if (vapi) {
      vapi.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [vapi, isMuted]);

  const isActive =
    status === "connected" || status === "speaking" || status === "listening";

  return (
    <div className="flex flex-col h-full">
      {/* Visual area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
        {/* Pulsing orb */}
        <div className="relative mb-8">
          {/* Pulse rings */}
          {isActive && (
            <>
              <div className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-blue-500/15 animate-pulse-ring" />
              <div
                className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-indigo-500/10 animate-pulse-ring"
                style={{ animationDelay: "0.4s" }}
              />
              <div
                className="absolute inset-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-purple-500/8 animate-pulse-ring"
                style={{ animationDelay: "0.8s" }}
              />
            </>
          )}

          {/* Main orb */}
          <div
            className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center transition-all duration-500 ${
              isActive
                ? "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-2xl shadow-blue-500/30 animate-glow-pulse"
                : status === "connecting"
                ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-2xl shadow-amber-500/20"
                : "bg-surface-3 border-2 border-edge-2"
            }`}
          >
            {status === "idle" && (
              <Phone className="w-10 h-10 sm:w-12 sm:h-12 text-on-surface-3" />
            )}
            {status === "connecting" && (
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-white border-t-transparent" />
            )}
            {status === "speaking" && (
              <div className="flex items-end gap-1 h-8">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-white rounded-full sound-bar"
                    style={{ height: "100%" }}
                  />
                ))}
              </div>
            )}
            {(status === "connected" || status === "listening") && (
              <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-pulse" />
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-2xl font-semibold text-on-surface mb-1">
            {status === "idle" && "Ready to call"}
            {status === "connecting" && "Connecting..."}
            {status === "connected" && "Connected"}
            {status === "speaking" && "AI is speaking..."}
            {status === "listening" && "Listening..."}
          </h3>
          {isActive && (
            <p className="text-on-surface-2 font-mono text-lg tabular-nums">
              {formatTime(duration)}
            </p>
          )}
          {status === "idle" && (
            <p className="text-on-surface-3 text-sm max-w-xs mx-auto">
              Click below to start a voice conversation with the AI receptionist
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {status === "idle" ? (
            <Button
              onClick={startCall}
              variant="primary"
              size="lg"
              className="rounded-full px-8 sm:px-10 h-14 text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <Phone className="w-5 h-5 mr-2" />
              Start Call
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
                className="rounded-full w-12 h-12 sm:w-14 sm:h-14"
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
              <Button
                onClick={endCall}
                variant="destructive"
                size="lg"
                className="rounded-full px-8 h-14 text-base shadow-xl shadow-red-500/25"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Call
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Live transcript */}
      {transcript.length > 0 && (
        <div className="border-t border-edge p-4 max-h-48 overflow-y-auto bg-surface-2/30 backdrop-blur-sm">
          <h4 className="text-xs font-medium text-on-surface-3 uppercase tracking-wider mb-3">
            Live Transcript
          </h4>
          <div className="space-y-2.5">
            {transcript.map((t, i) => (
              <div
                key={i}
                className="flex gap-2 text-sm animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span
                  className={`font-medium shrink-0 ${
                    t.role === "assistant"
                      ? "text-blue-500"
                      : "text-on-surface-2"
                  }`}
                >
                  {t.role === "assistant" ? "AI:" : "You:"}
                </span>
                <span className="text-on-surface">{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
