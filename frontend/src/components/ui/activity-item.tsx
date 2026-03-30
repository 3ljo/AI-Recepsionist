"use client";

import { motion } from "framer-motion";
import {
  Phone,
  PhoneMissed,
  MessageSquare,
  Calendar,
  DoorOpen,
  LogOut,
  XCircle,
  Settings,
  Voicemail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  phone: Phone,
  phoneMissed: PhoneMissed,
  message: MessageSquare,
  calendar: Calendar,
  doorOpen: DoorOpen,
  checkout: LogOut,
  cancellation: XCircle,
  system: Settings,
  voicemail: Voicemail,
};

const accentMap: Record<string, { bg: string; text: string; glow: string }> = {
  accent: {
    bg: "bg-accent/10",
    text: "text-accent-bright",
    glow: "shadow-[0_0_12px_var(--accent-glow-color)]",
  },
  cyan: {
    bg: "bg-cyan-accent/10",
    text: "text-cyan-accent",
    glow: "shadow-[0_0_12px_var(--cyan-glow-color)]",
  },
  emerald: {
    bg: "bg-success/10",
    text: "text-success",
    glow: "shadow-[0_0_12px_var(--success-glow-color)]",
  },
  success: {
    bg: "bg-success/10",
    text: "text-success",
    glow: "shadow-[0_0_12px_var(--success-glow-color)]",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    glow: "shadow-[0_0_12px_var(--warning-glow-color)]",
  },
  danger: {
    bg: "bg-danger/10",
    text: "text-danger",
    glow: "shadow-[0_0_12px_var(--danger-glow-color)]",
  },
  gold: {
    bg: "bg-gold/10",
    text: "text-gold",
    glow: "shadow-[0_0_12px_var(--gold-glow-color)]",
  },
};

interface ActivityItemProps {
  icon: string;
  accentColor: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, string>;
  index?: number;
}

export function ActivityItem({
  icon,
  accentColor,
  title,
  description,
  timestamp,
  metadata,
  index = 0,
}: ActivityItemProps) {
  const IconComponent = iconMap[icon] || Settings;
  const accent = accentMap[accentColor] || accentMap.accent;

  const time = new Date(timestamp);
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <motion.div
      className="activity-item flex items-start gap-3.5 px-4 py-3.5 rounded-2xl border border-transparent"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.06,
      }}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          accent.bg,
          accent.glow
        )}
      >
        <IconComponent className={cn("w-4 h-4", accent.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-fg truncate">
            {title}
          </h4>
          <span className="text-[11px] font-mono text-fg-faint shrink-0">
            {timeStr}
          </span>
        </div>
        <p className="text-xs text-fg-faint mt-0.5 truncate">{description}</p>
        {metadata && (
          <div className="flex gap-3 mt-1.5">
            {Object.entries(metadata).map(([key, val]) => (
              <span key={key} className="text-[10px] text-fg-faint font-mono">
                {key}: <span className="text-fg-faint">{val}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
