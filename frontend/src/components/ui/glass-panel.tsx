"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "glow" | "interactive" | "static";
  noPadding?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, variant = "default", noPadding = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative rounded-[20px] border border-edge overflow-hidden",
          "bg-[var(--glass-bg)] backdrop-blur-[40px] saturate-150",
          "bg-gradient-to-br from-white/[0.08] from-0% to-transparent to-40%",
          variant === "interactive" &&
            "cursor-pointer transition-all duration-400 hover:border-edge-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3),0_0_40px_rgba(124,92,252,0.08)] hover:-translate-y-0.5",
          variant === "glow" &&
            "border-[var(--glow-btn-border)] shadow-[0_0_30px_rgba(124,92,252,0.1)]",
          variant === "static" &&
            "bg-gradient-to-br from-white/[0.05] from-0% to-transparent to-40%",
          !noPadding && "p-5",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlassPanel.displayName = "GlassPanel";
