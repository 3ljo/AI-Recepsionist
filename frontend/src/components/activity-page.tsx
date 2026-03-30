"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { GlassPanel } from "./ui/glass-panel";
import { ActivityItem } from "./ui/activity-item";
import { FloatingNumber } from "./ui/floating-number";
import { Filter } from "lucide-react";
import { stagger, fadeUp } from "@/lib/animations";
import {
  activityEvents,
  aiBriefing,
  revenueData,
  bookingSources,
  peakHours,
  dashboardStats,
} from "@/lib/mock-data";

type FilterType = "all" | "call" | "chat" | "booking" | "checkin";

export function ActivityPage() {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered =
    filter === "all"
      ? activityEvents
      : activityEvents.filter((e) => e.type === filter);

  const chartData = revenueData.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <motion.div
      className="min-h-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* AI Daily Briefing */}
      <motion.div variants={fadeUp}>
        <GlassPanel variant="glow" className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <span className="text-sm">AI</span>
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-fg">
                Daily Briefing
              </h2>
              <p className="text-[10px] text-fg-faint font-mono">
                Generated just now
              </p>
            </div>
          </div>
          <p className="text-sm text-fg-muted leading-relaxed">{aiBriefing}</p>
          <div className="flex gap-6 mt-4 pt-4 border-t border-edge">
            <FloatingNumber
              value={dashboardStats.occupancy}
              suffix="%"
              label="Occupancy"
              color="accent"
              size="sm"
            />
            <FloatingNumber
              value={dashboardStats.revenueToday}
              prefix="$"
              label="Revenue"
              color="gold"
              size="sm"
            />
            <FloatingNumber
              value={dashboardStats.callsHandled}
              label="Calls"
              color="cyan"
              size="sm"
            />
          </div>
        </GlassPanel>
      </motion.div>

      {/* Revenue Chart */}
      <motion.div variants={fadeUp}>
        <GlassPanel className="mb-6">
          <h3 className="font-display text-sm font-semibold text-fg mb-4">
            Revenue — Last 14 Days
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: "var(--fg-faint)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--fg-faint)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--panel-border)",
                    borderRadius: 12,
                    backdropFilter: "blur(20px)",
                    color: "var(--fg)",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--fg-muted)" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Booking Sources */}
        <motion.div variants={fadeUp}>
          <GlassPanel>
            <h3 className="font-display text-sm font-semibold text-fg mb-4">
              Booking Sources
            </h3>
            <div className="space-y-4">
              {bookingSources.map((source) => (
                <div key={source.source}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-fg-muted font-medium">
                      {source.source}
                    </span>
                    <span className="text-xs font-mono text-fg-faint">
                      {source.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--glass-bg)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: source.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${source.percentage}%` }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </motion.div>

        {/* Peak Hours */}
        <motion.div variants={fadeUp}>
          <GlassPanel>
            <h3 className="font-display text-sm font-semibold text-fg mb-4">
              Peak Call Hours
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "var(--fg-faint)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--panel-border)",
                      borderRadius: 12,
                      color: "var(--fg)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="calls" radius={[6, 6, 0, 0]}>
                    {peakHours.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.calls >= 3
                            ? "var(--accent)"
                            : entry.calls >= 2
                            ? "color-mix(in srgb, var(--accent) 50%, transparent)"
                            : "color-mix(in srgb, var(--accent) 20%, transparent)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>
        </motion.div>
      </div>

      {/* Activity Stream */}
      <motion.div variants={fadeUp}>
        <GlassPanel>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-semibold text-fg">
              Activity Stream
            </h3>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-fg-faint" />
              {(["all", "call", "chat", "booking", "checkin"] as FilterType[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all duration-200 ${
                      filter === f
                        ? "bg-[var(--glass-bg-hover)] text-fg border border-edge"
                        : "text-fg-faint hover:text-fg-muted"
                    }`}
                  >
                    {f}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="space-y-0.5 max-h-[500px] overflow-y-auto pr-1">
            {filtered.map((event, i) => (
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

      <div className="pb-20" />
    </motion.div>
  );
}
