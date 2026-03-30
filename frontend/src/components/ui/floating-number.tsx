"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface FloatingNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  color?: "accent" | "cyan" | "success" | "gold" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const colorMap = {
  accent: "text-accent-bright",
  cyan: "text-cyan-accent",
  success: "text-success",
  gold: "text-gold",
  danger: "text-danger",
};

const glowMap = {
  accent: "drop-shadow-[0_0_20px_var(--accent-glow-color)]",
  cyan: "drop-shadow-[0_0_20px_var(--cyan-glow-color)]",
  success: "drop-shadow-[0_0_20px_var(--success-glow-color)]",
  gold: "drop-shadow-[0_0_20px_var(--gold-glow-color)]",
  danger: "drop-shadow-[0_0_20px_var(--danger-glow-color)]",
};

const sizeMap = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-5xl lg:text-6xl",
};

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return <>{displayValue}</>;
}

export function FloatingNumber({
  value,
  prefix = "",
  suffix = "",
  label,
  color = "accent",
  size = "md",
  className,
}: FloatingNumberProps) {
  return (
    <motion.div
      className={cn("text-center", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={cn("font-display font-bold tracking-tight", sizeMap[size], colorMap[color], glowMap[color])}>
        {prefix}
        <AnimatedNumber value={value} />
        {suffix}
      </div>
      <p className="text-xs text-fg-faint uppercase tracking-[0.15em] font-medium mt-1.5">
        {label}
      </p>
    </motion.div>
  );
}
