"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CircularGaugeProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  className?: string;
}

export function CircularGauge({
  value,
  max = 100,
  size = 90,
  strokeWidth = 4,
  color = "#7C5CFC",
  label,
  className,
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(value / max, 1);
  const offset = circumference * (1 - percentage);

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <svg width={size} height={size} className="circular-gauge">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="circular-gauge-track"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="circular-gauge-fill"
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-lg text-fg">
          {Math.round(value)}%
        </span>
      </div>
      <p className="text-[10px] text-fg-faint uppercase tracking-[0.15em] font-medium mt-2">
        {label}
      </p>
    </div>
  );
}
