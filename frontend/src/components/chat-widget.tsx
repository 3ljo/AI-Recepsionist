"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  MessageSquare,
  BedDouble,
  Calendar,
  Info,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { sendMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AIOrb } from "./ui/ai-orb";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 24 },
  },
} as const;

const messageBubbleVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 320, damping: 28 },
  },
  exit: { opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.15 } },
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimeBadge(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Returns true if two dates are more than 3 minutes apart. */
function shouldShowTimestamp(a: Date | null, b: Date): boolean {
  if (!a) return true;
  return b.getTime() - a.getTime() > 3 * 60 * 1000;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TimestampBadge({ date }: { date: Date }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-center py-3"
    >
      <span className="font-data text-[10px] tracking-widest uppercase text-fg-faint bg-[var(--glass-bg)] border border-edge rounded-full px-3 py-1">
        {formatTimeBadge(date)}
      </span>
    </motion.div>
  );
}

function TypingWaveform() {
  const bars = [0, 1, 2, 3, 4];
  return (
    <div className="flex items-end gap-[3px] h-5 px-1">
      {bars.map((i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-[var(--accent)] to-[var(--accent-bright)]"
          animate={{
            height: ["6px", "18px", "8px", "16px", "6px"],
          }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

interface SuggestionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function SuggestionCard({
  icon,
  title,
  description,
  onClick,
}: SuggestionCardProps) {
  return (
    <motion.button
      variants={cardVariants}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center gap-3 p-6 rounded-2xl w-full max-w-[220px]",
        "bg-[var(--glass-bg)] border border-edge backdrop-blur-xl",
        "hover:border-[var(--accent)]/30 hover:bg-[var(--glass-bg-hover)]",
        "transition-colors duration-300 cursor-pointer text-center"
      )}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,var(--accent-glow-color)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent-bright)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-accent-bright group-hover:shadow-[0_0_20px_var(--accent-glow-color)] transition-shadow duration-500">
        {icon}
      </div>
      <div>
        <p className="font-display font-semibold text-fg text-sm mb-1">
          {title}
        </p>
        <p className="text-[11px] leading-relaxed text-fg-faint">
          {description}
        </p>
      </div>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [callId] = useState(`web-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasMessages = messages.length > 0;

  /* Auto-scroll on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ---- API logic (preserved from original) ---- */

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendMessage(text, callId);
      const aiMsg: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: Message = {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, callId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const prefill = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      {/* ===== Messages / Empty State ===== */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            /* ----------- Empty state ----------- */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center h-full px-6 py-12"
            >
              {/* AI Orb */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                  damping: 20,
                  delay: 0.1,
                }}
                className="mb-8"
              >
                <AIOrb size="xl" state="idle" />
              </motion.div>

              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="text-center mb-10"
              >
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-fg tracking-tight mb-2">
                  I&apos;m ready to help
                </h2>
                <p className="text-sm text-fg-faint max-w-sm leading-relaxed">
                  Ask me anything about rooms, reservations, or hotel services
                </p>
              </motion.div>

              {/* Suggestion cards */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap justify-center gap-4"
              >
                <SuggestionCard
                  icon={<BedDouble className="w-5 h-5" />}
                  title="Book a Room"
                  description="Reserve the perfect room for your stay"
                  onClick={() => prefill("I'd like to book a room")}
                />
                <SuggestionCard
                  icon={<Calendar className="w-5 h-5" />}
                  title="Check Availability"
                  description="See what's open on your dates"
                  onClick={() => prefill("What rooms are available?")}
                />
                <SuggestionCard
                  icon={<Info className="w-5 h-5" />}
                  title="Hotel Information"
                  description="Amenities, policies, and more"
                  onClick={() => prefill("Tell me about the hotel")}
                />
              </motion.div>
            </motion.div>
          ) : (
            /* ----------- Conversation ----------- */
            <motion.div
              key="conversation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-1 p-4 sm:p-6 max-w-3xl mx-auto w-full"
            >
              {messages.map((msg, i) => {
                const prevTimestamp = i > 0 ? messages[i - 1].timestamp : null;
                const showTime = shouldShowTimestamp(prevTimestamp, msg.timestamp);

                return (
                  <div key={i}>
                    {showTime && <TimestampBadge date={msg.timestamp} />}

                    <motion.div
                      variants={messageBubbleVariants}
                      initial="hidden"
                      animate="visible"
                      className={cn(
                        "flex gap-2.5 sm:gap-3 mb-2",
                        msg.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      {/* AI Avatar */}
                      {msg.role === "assistant" && (
                        <div className="shrink-0 mt-1">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-bright)] flex items-center justify-center shadow-lg shadow-[var(--accent-glow-color)]">
                            <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={cn(
                          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-gradient-to-br from-[var(--accent)] to-[var(--accent-bright)] text-white rounded-br-md shadow-lg shadow-[var(--accent-glow-color)]"
                            : "bg-[var(--msg-ai-bg)] border border-[var(--panel-border)] text-fg rounded-bl-md backdrop-blur-md"
                        )}
                      >
                        {msg.role === "assistant" ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold text-[var(--accent-bright)]">{children}</strong>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-2 last:mb-0 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 last:mb-0 space-y-1">{children}</ol>,
                              li: ({ children }) => <li>{children}</li>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>

                      {/* User Avatar */}
                      {msg.role === "user" && (
                        <div className="shrink-0 mt-1">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--glass-bg)] border border-edge flex items-center justify-center backdrop-blur-sm">
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-fg-muted" />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    variants={messageBubbleVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex gap-2.5 sm:gap-3 mb-2"
                  >
                    <div className="shrink-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-bright)] flex items-center justify-center shadow-lg shadow-[var(--accent-glow-color)]">
                        <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      </div>
                    </div>
                    <div className="bg-[var(--msg-ai-bg)] border border-[var(--panel-border)] rounded-2xl rounded-bl-md px-4 py-3 backdrop-blur-md">
                      <TypingWaveform />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Input Bar ===== */}
      <div className="relative shrink-0 px-4 sm:px-6 pb-4 pt-3">
        {/* Fade-out gradient above input */}
        <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        <div className="relative max-w-3xl mx-auto">
          {/* Glow border effect */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[var(--accent)]/20 via-[var(--accent-bright)]/10 to-[var(--accent)]/20 opacity-0 focus-within:opacity-100 transition-opacity duration-500 blur-[1px] pointer-events-none peer-focus:opacity-100" />

          <div className="relative flex items-center gap-2.5 bg-[var(--glass-bg)] border border-edge rounded-2xl backdrop-blur-xl px-4 py-2 focus-within:border-[var(--accent)]/30 focus-within:shadow-[0_0_30px_var(--accent-glow-color)] transition-all duration-500">
            <Sparkles className="w-4 h-4 text-fg-faint shrink-0" />

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={loading}
              className="glass-input flex-1 bg-transparent border-none outline-none text-sm text-fg placeholder:text-fg-faint disabled:opacity-40 font-[inherit]"
            />

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className={cn(
                "glow-button shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
                input.trim() && !loading
                  ? "bg-gradient-to-br from-[var(--accent)] to-[var(--accent-bright)] text-white shadow-lg shadow-[var(--accent-glow-color)] hover:shadow-[var(--glow-btn-shadow)]"
                  : "bg-[var(--glass-bg)] text-fg-faint cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
