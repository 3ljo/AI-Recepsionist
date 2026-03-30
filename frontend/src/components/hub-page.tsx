"use client";

import { motion } from "framer-motion";
import { GlassPanel } from "./ui/glass-panel";
import { AIOrb } from "./ui/ai-orb";
import { FloatingNumber } from "./ui/floating-number";
import { CircularGauge } from "./ui/circular-gauge";
import { ActivityItem } from "./ui/activity-item";
import { GlowButton } from "./ui/glow-button";
import {
  Phone,
  MessageSquare,
  BedDouble,
  FileText,
  ArrowRight,
} from "lucide-react";
import {
  rooms,
  dashboardStats,
  activityEvents,
  aiStatusMessage,
} from "@/lib/mock-data";
import { stagger, fadeUp } from "@/lib/animations";
import type { NavSection } from "./command-bar";

interface HubPageProps {
  onNavigate: (section: NavSection) => void;
}

export function HubPage({ onNavigate }: HubPageProps) {
  const recentEvents = activityEvents.slice(0, 6);

  return (
    <motion.div
      className="min-h-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ── AI Presence ── */}
      <motion.div variants={fadeUp} className="flex flex-col items-center text-center mb-10">
        <AIOrb size="lg" state="active" className="mb-6" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-fg tracking-tight mb-2">
          AI Receptionist
        </h1>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-fg-faint font-medium tracking-wider uppercase">
            Online &middot; Listening
          </span>
        </div>
        <motion.p
          className="text-sm text-fg-faint max-w-lg leading-relaxed font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          &quot;{aiStatusMessage}&quot;
        </motion.p>
      </motion.div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left — Today's Pulse */}
        <motion.div variants={fadeUp} className="lg:col-span-5 xl:col-span-4">
          <GlassPanel className="h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-sm font-semibold text-fg-muted tracking-tight">
                Today&apos;s Pulse
              </h2>
              <span className="text-[10px] text-fg-faint font-mono uppercase tracking-wider">
                Live
              </span>
            </div>
            <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
              {recentEvents.map((event, i) => (
                <ActivityItem
                  key={event.id}
                  icon={event.icon}
                  accentColor={event.accentColor}
                  title={event.title}
                  description={event.description}
                  timestamp={event.timestamp}
                  metadata={event.metadata}
                  index={i}
                />
              ))}
            </div>
          </GlassPanel>
        </motion.div>

        {/* Center — Room Matrix */}
        <motion.div variants={fadeUp} className="lg:col-span-4 xl:col-span-5">
          <GlassPanel className="h-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-sm font-semibold text-fg-muted tracking-tight">
                Room Matrix
              </h2>
              <button
                onClick={() => onNavigate("rooms")}
                className="text-[10px] text-fg-faint hover:text-fg-muted transition-colors font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rooms.map((room, i) => (
                <motion.div
                  key={room.id}
                  className={`rounded-2xl p-4 border border-edge bg-[var(--glass-bg)] transition-all duration-300 hover:bg-[var(--glass-bg-hover)] cursor-pointer ${
                    room.status === "available"
                      ? "room-available"
                      : room.status === "occupied"
                      ? "room-occupied"
                      : "room-maintenance"
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-fg tracking-tight">
                        {room.name}
                      </p>
                      <p className="text-xs font-mono text-fg-faint mt-0.5">
                        ${room.price}/night
                      </p>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        room.status === "available"
                          ? "text-success bg-success/10"
                          : room.status === "occupied"
                          ? "text-cyan-accent bg-cyan-accent/10"
                          : "text-warning bg-warning/10"
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  {room.status === "occupied" && room.currentGuest && (
                    <>
                      <p className="text-xs text-fg-muted mb-2">
                        {room.currentGuest}
                      </p>
                      <div className="w-full h-1 rounded-full bg-[var(--glass-bg)] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-accent to-accent"
                          initial={{ width: 0 }}
                          animate={{ width: `${room.stayProgress || 0}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <p className="text-[10px] text-fg-faint mt-1 font-mono">
                        {room.stayProgress}% of stay
                      </p>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </GlassPanel>
        </motion.div>

        {/* Right — Vital Signs */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <div className="space-y-5 h-full flex flex-col">
            <GlassPanel className="flex-1 flex flex-col items-center justify-center py-8">
              <CircularGauge
                value={dashboardStats.occupancy}
                color="var(--accent)"
                label="Occupancy"
                size={100}
                strokeWidth={5}
              />
            </GlassPanel>

            <GlassPanel className="flex-1">
              <FloatingNumber
                value={dashboardStats.revenueToday}
                prefix="$"
                label="Revenue Today"
                color="gold"
                size="md"
              />
            </GlassPanel>

            <GlassPanel className="flex-1">
              <FloatingNumber
                value={dashboardStats.callsHandled}
                label="Calls Handled"
                color="cyan"
                size="md"
              />
              <p className="text-center text-[11px] text-fg-faint mt-2 font-mono">
                {dashboardStats.callSuccessRate}% success rate
              </p>
            </GlassPanel>

            <GlassPanel className="flex-1">
              <FloatingNumber
                value={dashboardStats.upcomingCheckins}
                label="Arriving Tomorrow"
                color="success"
                size="md"
              />
              <p className="text-center text-xs text-fg-faint mt-2">
                {dashboardStats.nextGuest}
              </p>
            </GlassPanel>
          </div>
        </motion.div>
      </div>

      {/* ── Quick Actions ── */}
      <motion.div
        variants={fadeUp}
        className="flex flex-wrap gap-3 justify-center mt-8 pb-8"
      >
        <GlowButton
          variant="secondary"
          size="md"
          onClick={() => onNavigate("rooms")}
        >
          <BedDouble className="w-4 h-4" /> New Booking
        </GlowButton>
        <GlowButton
          variant="secondary"
          size="md"
          onClick={() => onNavigate("voice")}
        >
          <Phone className="w-4 h-4" /> Call AI
        </GlowButton>
        <GlowButton
          variant="secondary"
          size="md"
          onClick={() => onNavigate("rooms")}
        >
          <BedDouble className="w-4 h-4" /> View All Rooms
        </GlowButton>
        <GlowButton
          variant="secondary"
          size="md"
          onClick={() => onNavigate("activity")}
        >
          <FileText className="w-4 h-4" /> Today&apos;s Report
        </GlowButton>
      </motion.div>
    </motion.div>
  );
}
