"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface GlowButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

const variants = {
  primary:
    "bg-gradient-to-r from-[var(--glow-btn-from)] to-[var(--glow-btn-to)] text-white border-[var(--glow-btn-border)] shadow-[0_0_20px_var(--glow-btn-shadow)] hover:shadow-[0_0_30px_var(--glow-btn-shadow)] hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
  secondary:
    "bg-[var(--glass-bg)] text-fg border-edge hover:bg-[var(--glass-bg-hover)] hover:border-edge-2 hover:text-fg",
  danger:
    "bg-danger/10 text-danger border-danger/20 hover:bg-danger/15 hover:shadow-[0_0_20px_var(--danger-glow-color)]",
  ghost:
    "bg-transparent text-fg-muted border-transparent hover:bg-[var(--glass-bg)] hover:text-fg",
};

const sizeMap = {
  sm: "px-3.5 py-2 text-xs rounded-xl gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-8 py-3.5 text-base rounded-2xl gap-2.5",
  icon: "w-10 h-10 rounded-xl flex items-center justify-center",
};

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center font-semibold border transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
          variants[variant],
          sizeMap[size],
          className
        )}
        whileTap={{ scale: 0.97 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
GlowButton.displayName = "GlowButton";
