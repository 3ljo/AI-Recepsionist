"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AIOrbProps {
  size?: "sm" | "md" | "lg" | "xl";
  state?: "idle" | "active" | "speaking" | "listening";
  className?: string;
}

const sizes = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-28 h-28",
  xl: "w-40 h-40",
};

export function AIOrb({ size = "md", state = "idle", className }: AIOrbProps) {
  const isActive = state !== "idle";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer pulse rings */}
      {isActive && (
        <>
          <motion.div
            className="absolute rounded-full"
            style={{ inset: "-20%", border: "1px solid var(--orb-ring-active)" }}
            animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ inset: "-40%", border: "1px solid var(--orb-ring-active)" }}
            animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{ inset: "-60%", border: "1px solid var(--orb-ring-active)" }}
            animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </>
      )}

      {/* Glow backdrop */}
      <motion.div
        className={cn(
          "absolute rounded-full blur-[60px]",
          sizes[size]
        )}
        style={{ background: isActive ? "var(--orb-glow-active)" : "var(--orb-glow-idle)" }}
        animate={
          isActive
            ? { scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }
            : { scale: [0.98, 1.02, 0.98], opacity: [0.1, 0.2, 0.1] }
        }
        transition={{ duration: isActive ? 2 : 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main orb */}
      <motion.div
        className={cn(
          "relative rounded-full flex items-center justify-center",
          sizes[size],
          !isActive && "border border-edge"
        )}
        style={{
          background: isActive ? "var(--orb-active-bg)" : "var(--orb-idle-bg)",
          ...(isActive
            ? { boxShadow: "0 0 60px var(--orb-glow-active), 0 0 120px var(--orb-glow-idle)" }
            : {}),
        }}
        animate={
          isActive
            ? { scale: [0.98, 1.02, 0.98] }
            : { scale: [0.98, 1.02, 0.98], opacity: [0.8, 1, 0.8] }
        }
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Inner shine */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/10 to-transparent" />

        {/* Rotating ring */}
        <svg
          className={cn(
            "absolute",
            size === "xl" ? "w-[110%] h-[110%]" : "w-[120%] h-[120%]"
          )}
          viewBox="0 0 100 100"
        >
          <motion.circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={isActive ? "var(--orb-ring-active)" : "var(--orb-ring-idle)"}
            strokeWidth="0.5"
            strokeDasharray="8 12"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "50px 50px" }}
          />
        </svg>

        {/* Center content — waveform when speaking */}
        {state === "speaking" ? (
          <div className="flex items-end gap-[2px] h-6">
            {[...Array(7)].map((_, i) => (
              <motion.div
                key={i}
                className="w-[2px] bg-white/90 rounded-full"
                animate={{ scaleY: [0.2, 1, 0.2] }}
                transition={{
                  duration: 0.4 + Math.random() * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.07,
                }}
                style={{ height: "100%" }}
              />
            ))}
          </div>
        ) : state === "listening" ? (
          <motion.div
            className="w-3 h-3 rounded-full bg-white"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        ) : (
          <div
            className={cn(
              "rounded-full",
              isActive ? "w-2 h-2" : "w-3 h-3",
              size === "xl" && "w-4 h-4",
              size === "lg" && "w-3 h-3"
            )}
            style={{ background: isActive ? "white" : "var(--orb-idle-dot)" }}
          />
        )}
      </motion.div>
    </div>
  );
}
