"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Radio, Clock } from "lucide-react";
import { AIOrb } from "@/components/ui/ai-orb";
import { GlassPanel } from "@/components/ui/glass-panel";
import { GlowButton } from "@/components/ui/glow-button";
import { callRecords, dashboardStats } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ── Status-to-orb-state mapping ──────────────────────────
function orbState(
  status: "idle" | "connecting" | "connected" | "speaking" | "listening"
): "idle" | "active" | "speaking" | "listening" {
  switch (status) {
    case "speaking":
      return "speaking";
    case "listening":
      return "listening";
    case "connected":
      return "active";
    case "connecting":
      return "active";
    default:
      return "idle";
  }
}

// ── Time formatting helpers ──────────────────────────────
function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function formatCallDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ── Outcome badge colors ─────────────────────────────────
function outcomeColor(outcome: "answered" | "missed" | "voicemail") {
  switch (outcome) {
    case "answered":
      return "bg-success/15 text-success border-success/20";
    case "missed":
      return "bg-danger/15 text-danger border-danger/20";
    case "voicemail":
      return "bg-amber-400/15 text-amber-400 border-amber-400/20";
  }
}

// ══════════════════════════════════════════════════════════
// VOICE WIDGET
// ══════════════════════════════════════════════════════════
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

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Duration timer
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

  // ── Vapi integration (preserved exactly) ───────────────
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

  // ── Sorted call records (newest first) ─────────────────
  const sortedCalls = [...callRecords].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="flex h-full gap-5 overflow-hidden">
      {/* ── MAIN CALL INTERFACE ─────────────────────────── */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Ambient background shift for live call */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="absolute inset-0 pointer-events-none z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent)]/[0.03] via-transparent to-[var(--cyan-accent)]/[0.02]" />
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent)]/[0.04] rounded-full blur-[120px]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[var(--cyan-accent)]/[0.03] rounded-full blur-[100px]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top bar — LIVE indicator */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="flex items-center justify-center gap-2.5 py-3 relative z-10"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-danger"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-danger/80 font-data">
                Live Call
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center content area */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
          {/* AI Orb */}
          <motion.div
            className="mb-8"
            layout
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <AIOrb
              size="xl"
              state={orbState(status)}
              className={cn(
                "transition-all duration-700",
                status === "connecting" && "opacity-60"
              )}
            />
          </motion.div>

          {/* Status text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              className="text-center mb-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-display font-semibold text-fg mb-1.5 tracking-tight">
                {status === "idle" && "Standing by"}
                {status === "connecting" && "Connecting..."}
                {status === "connected" && "Connected"}
                {status === "speaking" && "AI Speaking"}
                {status === "listening" && "Listening..."}
              </h2>

              {/* Caller info during active call */}
              {isActive && (
                <motion.div
                  className="flex items-center justify-center gap-2 text-fg-faint text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Radio className="w-3 h-3 text-success animate-pulse" />
                  <span>AI Receptionist</span>
                  <span className="text-fg-faint">|</span>
                  <span>Voice Channel</span>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Live call timer */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <div
                  className="font-data text-5xl font-bold tracking-widest tabular-nums"
                  style={{
                    color: "var(--accent)",
                    textShadow: "0 0 30px var(--accent-glow-color), 0 0 60px var(--accent-glow-color)",
                  }}
                >
                  {formatDuration(duration)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Idle state — floating info chips */}
          <AnimatePresence>
            {status === "idle" && (
              <motion.div
                className="flex flex-wrap items-center justify-center gap-3 mb-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--glass-bg)] border border-edge text-xs text-fg-muted">
                  <Clock className="w-3 h-3 text-accent/60" />
                  <span>Last call: 2 hours ago</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--glass-bg)] border border-edge text-xs text-fg-muted">
                  <Phone className="w-3 h-3 text-cyan-accent/60" />
                  <span>Calls today: {dashboardStats.callsHandled}</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--glass-bg)] border border-edge text-xs text-fg-muted">
                  <Radio className="w-3 h-3 text-success/60" />
                  <span>{dashboardStats.callSuccessRate}% success rate</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Idle state — phone number display */}
          <AnimatePresence>
            {status === "idle" && (
              <motion.p
                className="text-fg-faint text-xs font-data tracking-wider mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                AI Voice Line &middot; +1 (555) 000-0100
              </motion.p>
            )}
          </AnimatePresence>

          {/* Live transcript */}
          <AnimatePresence>
            {isActive && transcript.length > 0 && (
              <motion.div
                className="w-full max-w-lg mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <GlassPanel
                  noPadding
                  className="max-h-48 overflow-y-auto"
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-success"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-fg-faint">
                        Live Transcript
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {transcript.map((t, i) => (
                        <motion.div
                          key={i}
                          className="flex gap-2.5 text-sm"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <span
                            className={cn(
                              "shrink-0 text-[11px] font-bold font-data uppercase mt-0.5",
                              t.role === "assistant"
                                ? "text-accent"
                                : "text-cyan-accent"
                            )}
                          >
                            {t.role === "assistant" ? "AI" : "You"}
                          </span>
                          <span className="text-fg leading-relaxed">
                            {t.text}
                          </span>
                        </motion.div>
                      ))}
                      <div ref={transcriptEndRef} />
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex items-center gap-4 relative z-10">
            <AnimatePresence mode="wait">
              {status === "idle" ? (
                <motion.div
                  key="start"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative"
                >
                  {/* Breathing glow behind the button */}
                  <motion.div
                    className="absolute inset-[-8px] rounded-full bg-[var(--accent)]/20 blur-xl"
                    animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <GlowButton
                    variant="primary"
                    size="lg"
                    onClick={startCall}
                    className="rounded-full px-10 h-14 relative"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Start Call</span>
                  </GlowButton>
                </motion.div>
              ) : (
                <motion.div
                  key="active"
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  {/* Mute button */}
                  <GlowButton
                    variant={isMuted ? "danger" : "secondary"}
                    size="icon"
                    onClick={toggleMute}
                    className="w-14 h-14 rounded-full"
                  >
                    {isMuted ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </GlowButton>

                  {/* End call button */}
                  <GlowButton
                    variant="danger"
                    size="lg"
                    onClick={endCall}
                    className="rounded-full px-8 h-14"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>End Call</span>
                  </GlowButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Subtle bottom gradient */}
        <div className="h-8 shrink-0" />
      </div>

      {/* ── CALL HISTORY SIDE PANEL ─────────────────────── */}
      <div className="w-80 shrink-0 hidden lg:flex flex-col overflow-hidden">
        <GlassPanel
          variant="static"
          noPadding
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b border-edge">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-display font-semibold text-fg">
                Recent Calls
              </h3>
              <span className="text-[11px] font-data text-fg-faint">
                {dashboardStats.callsHandled} today
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-fg-faint">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {dashboardStats.callsAnswered} answered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                {dashboardStats.callsMissed} missed
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {dashboardStats.callsVoicemail} voicemail
              </span>
            </div>
          </div>

          {/* Call list — timeline style */}
          <div className="flex-1 overflow-y-auto p-4 space-y-0">
            {sortedCalls.map((call, idx) => (
              <div key={call.id} className="flex gap-3 group">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full border-2 shrink-0",
                      call.outcome === "answered"
                        ? "bg-success/30 border-success"
                        : call.outcome === "missed"
                        ? "bg-danger/30 border-danger"
                        : "bg-amber-400/30 border-amber-400"
                    )}
                  />
                  {idx < sortedCalls.length - 1 && (
                    <div className="w-px flex-1 bg-[var(--panel-border)] my-1" />
                  )}
                </div>

                {/* Call info */}
                <div className="pb-5 min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-fg truncate">
                      {call.callerName || call.callerNumber}
                    </span>
                    <span className="text-[10px] font-data text-fg-faint shrink-0 ml-2">
                      {formatTimestamp(call.timestamp)}
                    </span>
                  </div>

                  {!call.callerName && (
                    <p className="text-[11px] font-data text-fg-faint mb-1">
                      {call.callerNumber}
                    </p>
                  )}
                  {call.callerName && (
                    <p className="text-[11px] font-data text-fg-faint mb-1">
                      {call.callerNumber}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize",
                        outcomeColor(call.outcome)
                      )}
                    >
                      {call.outcome}
                    </span>
                    {call.duration > 0 && (
                      <span className="text-[10px] font-data text-fg-faint">
                        {formatCallDuration(call.duration)}
                      </span>
                    )}
                  </div>

                  {call.summary && (
                    <p className="text-[11px] text-fg-faint leading-relaxed mt-1.5 line-clamp-2">
                      {call.summary}
                    </p>
                  )}

                  {call.bookingResult && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-accent" />
                      <span className="text-[10px] font-medium text-accent/70">
                        {call.bookingResult}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer stats */}
          <div className="p-4 pt-3 border-t border-edge">
            <div className="flex items-center justify-between text-[11px] text-fg-faint">
              <span>Avg duration: {dashboardStats.avgCallDuration}</span>
              <span>{dashboardStats.callSuccessRate}% handled</span>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
