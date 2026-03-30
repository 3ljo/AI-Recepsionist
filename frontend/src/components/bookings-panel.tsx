"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { GlassPanel } from "@/components/ui/glass-panel";
import { GlowButton } from "@/components/ui/glow-button";
import { CircularGauge } from "@/components/ui/circular-gauge";
import { FloatingNumber } from "@/components/ui/floating-number";
import { cn } from "@/lib/utils";
import {
  BedDouble,
  Calendar,
  Users,
  DoorOpen,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  User,
  Phone,
  X,
  Grid3X3,
  CalendarDays,
  Sparkles,
} from "lucide-react";

const BUSINESS_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const DAYS_TO_SHOW = 14;

interface Room {
  id: string;
  name: string;
  type: string;
  description: string;
  capacity: number;
  price_per_unit: number;
  price_unit: string;
  is_active: boolean;
}

interface Booking {
  id: string;
  resource_id: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_phone: string | null;
  guest_count: number;
  total_price: number | null;
  status: string;
  booked_via: string;
  created_at: string;
  resources?: { name: string } | null;
}

// -- helpers --
function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function daysBetween(a: string, b: string) {
  return Math.ceil(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
  );
}
function shortDay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}
function shortDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function isToday(d: Date) {
  return toDateStr(d) === toDateStr(new Date());
}
function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// -- booking bar colors --
const BOOKING_COLORS = [
  { bg: "color-mix(in srgb, var(--accent) 18%, transparent)", border: "color-mix(in srgb, var(--accent) 35%, transparent)", text: "text-accent-bright", glow: "color-mix(in srgb, var(--accent) 25%, transparent)" },
  { bg: "color-mix(in srgb, var(--cyan) 18%, transparent)", border: "color-mix(in srgb, var(--cyan) 35%, transparent)", text: "text-cyan-accent", glow: "color-mix(in srgb, var(--cyan) 25%, transparent)" },
  { bg: "color-mix(in srgb, var(--success) 18%, transparent)", border: "color-mix(in srgb, var(--success) 35%, transparent)", text: "text-success", glow: "color-mix(in srgb, var(--success) 25%, transparent)" },
  { bg: "color-mix(in srgb, var(--warning) 18%, transparent)", border: "color-mix(in srgb, var(--warning) 35%, transparent)", text: "text-warning", glow: "color-mix(in srgb, var(--warning) 25%, transparent)" },
  { bg: "color-mix(in srgb, var(--danger) 18%, transparent)", border: "color-mix(in srgb, var(--danger) 35%, transparent)", text: "text-danger", glow: "color-mix(in srgb, var(--danger) 25%, transparent)" },
  { bg: "color-mix(in srgb, var(--gold) 18%, transparent)", border: "color-mix(in srgb, var(--gold) 35%, transparent)", text: "text-gold", glow: "color-mix(in srgb, var(--gold) 25%, transparent)" },
];
function bookingColor(i: number) {
  return BOOKING_COLORS[i % BOOKING_COLORS.length];
}

type ViewMode = "grid" | "timeline";

// -- room status helpers --
function getRoomStatus(room: Room, bookings: Booking[], todayStr: string) {
  const todayBooking = bookings.find(
    (b) => b.resource_id === room.id && b.check_in <= todayStr && b.check_out > todayStr
  );
  if (!todayBooking) return { status: "available" as const, booking: null };

  if (todayBooking.check_in === todayStr) return { status: "arriving" as const, booking: todayBooking };
  const tomorrow = toDateStr(addDays(new Date(), 1));
  if (todayBooking.check_out === tomorrow) return { status: "departing" as const, booking: todayBooking };
  return { status: "occupied" as const, booking: todayBooking };
}

function getStayProgress(booking: Booking) {
  const start = new Date(booking.check_in + "T00:00:00").getTime();
  const end = new Date(booking.check_out + "T00:00:00").getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

const statusConfig = {
  available: {
    color: "var(--success)",
    glowClass: "room-available",
    label: "Available",
    badgeBg: "bg-success/10",
    badgeText: "text-success",
    badgeBorder: "border-success/25",
    shadow: "shadow-[0_0_30px_color-mix(in_srgb,var(--success)_15%,transparent)]",
  },
  occupied: {
    color: "var(--cyan)",
    glowClass: "room-occupied",
    label: "Occupied",
    badgeBg: "bg-cyan-accent/10",
    badgeText: "text-cyan-accent",
    badgeBorder: "border-cyan-accent/25",
    shadow: "shadow-[0_0_30px_color-mix(in_srgb,var(--cyan)_15%,transparent)]",
  },
  arriving: {
    color: "var(--accent)",
    glowClass: "room-arriving",
    label: "Arriving",
    badgeBg: "bg-accent/10",
    badgeText: "text-accent",
    badgeBorder: "border-accent/25",
    shadow: "shadow-[0_0_30px_color-mix(in_srgb,var(--accent)_15%,transparent)]",
  },
  departing: {
    color: "var(--warning)",
    glowClass: "room-departing",
    label: "Departing",
    badgeBg: "bg-warning/10",
    badgeText: "text-warning",
    badgeBorder: "border-warning/25",
    shadow: "shadow-[0_0_30px_color-mix(in_srgb,var(--warning)_15%,transparent)]",
  },
  maintenance: {
    color: "var(--warning)",
    glowClass: "room-maintenance",
    label: "Maintenance",
    badgeBg: "bg-warning/10",
    badgeText: "text-warning",
    badgeBorder: "border-warning/25",
    shadow: "shadow-[0_0_30px_color-mix(in_srgb,var(--warning)_15%,transparent)]",
  },
};

// -- stagger animation variants --
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
} as const;

// ================================================================
export function BookingsPanel() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [roomsRes, bookingsRes] = await Promise.all([
      supabase
        .from("resources")
        .select("*")
        .eq("business_id", BUSINESS_ID)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("bookings")
        .select("*, resources(name)")
        .eq("business_id", BUSINESS_ID)
        .eq("status", "confirmed")
        .gte("check_out", new Date().toISOString().split("T")[0])
        .order("check_in", { ascending: true }),
    ]);
    if (roomsRes.data) setRooms(roomsRes.data);
    if (bookingsRes.data) setBookings(bookingsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `business_id=eq.${BUSINESS_ID}` },
        () => fetchData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 600);
  };

  const todayStr = toDateStr(new Date());

  // -- computed stats --
  const occupiedCount = useMemo(
    () => rooms.filter((r) => bookings.some((b) => b.resource_id === r.id && b.check_in <= todayStr && b.check_out > todayStr)).length,
    [rooms, bookings, todayStr]
  );
  const occupancyPct = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;

  const todayRevenue = useMemo(
    () =>
      bookings
        .filter((b) => b.check_in <= todayStr && b.check_out > todayStr && b.total_price)
        .reduce((sum, b) => sum + (b.total_price || 0), 0),
    [bookings, todayStr]
  );

  const arrivalsToday = useMemo(
    () => bookings.filter((b) => b.check_in === todayStr).length,
    [bookings, todayStr]
  );
  const departuresToday = useMemo(
    () => bookings.filter((b) => b.check_out === todayStr).length,
    [bookings, todayStr]
  );

  // -- timeline data --
  const startDate = useMemo(() => addDays(new Date(), weekOffset * 7), [weekOffset]);
  const days = useMemo(
    () => Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(startDate, i)),
    [startDate]
  );
  const endDateStr = toDateStr(addDays(startDate, DAYS_TO_SHOW));
  const startDateStr = toDateStr(startDate);
  const visibleBookings = bookings.filter(
    (b) => b.check_in < endDateStr && b.check_out > startDateStr
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent/30 border-t-accent" />
            <div className="absolute inset-0 rounded-full bg-accent/10 blur-xl animate-pulse" />
          </div>
          <p className="text-fg-faint text-sm font-medium">Loading rooms...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* -- top stats bar -- */}
      <motion.div
        className="shrink-0 px-4 sm:px-6 pt-5 pb-4 border-b border-edge"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="w-5 h-5 text-accent" />
              <div className="absolute inset-0 blur-lg bg-accent/30" />
            </div>
            <h2 className="font-display text-xl font-bold text-fg tracking-tight">
              Rooms & Bookings
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center bg-[var(--glass-bg)] rounded-xl border border-edge p-1">
              <motion.button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  viewMode === "grid" ? "text-white" : "text-fg-faint hover:text-fg-muted"
                )}
              >
                {viewMode === "grid" && (
                  <motion.div
                    layoutId="viewToggle"
                    className="absolute inset-0 bg-accent/20 border border-accent/30 rounded-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Grid3X3 className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Spatial Grid</span>
              </motion.button>
              <motion.button
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  viewMode === "timeline" ? "text-white" : "text-fg-faint hover:text-fg-muted"
                )}
              >
                {viewMode === "timeline" && (
                  <motion.div
                    layoutId="viewToggle"
                    className="absolute inset-0 bg-accent/20 border border-accent/30 rounded-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <CalendarDays className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Timeline</span>
              </motion.button>
            </div>

            <GlowButton variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw
                className={cn("w-4 h-4 transition-transform duration-500", refreshing && "animate-spin")}
              />
            </GlowButton>
          </div>
        </div>

        {/* Animated stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassPanel
            variant="static"
            noPadding
            className="!rounded-2xl !p-3 flex items-center gap-3"
          >
            <CircularGauge
              value={occupancyPct}
              max={100}
              size={52}
              strokeWidth={3.5}
              color="var(--accent)"
              label=""
              className="shrink-0"
            />
            <div>
              <p className="font-display font-bold text-lg text-fg leading-tight">
                {occupancyPct}%
              </p>
              <p className="text-[10px] text-fg-faint uppercase tracking-[0.12em] font-medium">
                Occupancy
              </p>
            </div>
          </GlassPanel>

          <GlassPanel variant="static" noPadding className="!rounded-2xl !p-3 flex items-center justify-center">
            <FloatingNumber
              value={todayRevenue}
              prefix="$"
              label="Active Revenue"
              color="gold"
              size="sm"
            />
          </GlassPanel>

          <GlassPanel variant="static" noPadding className="!rounded-2xl !p-3 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-success" />
              <span className="font-display font-bold text-xl text-success">{arrivalsToday}</span>
            </div>
            <p className="text-[10px] text-fg-faint uppercase tracking-[0.12em] font-medium mt-0.5">
              Arrivals
            </p>
          </GlassPanel>

          <GlassPanel variant="static" noPadding className="!rounded-2xl !p-3 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-danger" />
              <span className="font-display font-bold text-xl text-danger">{departuresToday}</span>
            </div>
            <p className="text-[10px] text-fg-faint uppercase tracking-[0.12em] font-medium mt-0.5">
              Departures
            </p>
          </GlassPanel>
        </div>
      </motion.div>

      {/* -- main content area -- */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="p-4 sm:p-6"
            >
              <SpatialGrid
                rooms={rooms}
                bookings={bookings}
                todayStr={todayStr}
                hoveredRoom={hoveredRoom}
                setHoveredRoom={setHoveredRoom}
                onSelectBooking={setSelectedBooking}
              />
            </motion.div>
          ) : (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <TimelineView
                rooms={rooms}
                bookings={bookings}
                visibleBookings={visibleBookings}
                days={days}
                startDate={startDate}
                weekOffset={weekOffset}
                setWeekOffset={setWeekOffset}
                selectedBooking={selectedBooking}
                setSelectedBooking={setSelectedBooking}
                todayStr={todayStr}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* -- floating booking detail modal -- */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ================================================================
// SPATIAL GRID VIEW
// ================================================================
function SpatialGrid({
  rooms,
  bookings,
  todayStr,
  hoveredRoom,
  setHoveredRoom,
  onSelectBooking,
}: {
  rooms: Room[];
  bookings: Booking[];
  todayStr: string;
  hoveredRoom: string | null;
  setHoveredRoom: (id: string | null) => void;
  onSelectBooking: (b: Booking | null) => void;
}) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[var(--glass-bg)] border border-edge flex items-center justify-center mb-5">
          <BedDouble className="w-10 h-10 text-fg-faint" />
        </div>
        <p className="text-sm text-fg-faint font-medium">No rooms found</p>
        <p className="text-xs text-fg-faint mt-1">Check your Supabase &quot;resources&quot; table</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {rooms.map((room) => {
        const { status, booking } = getRoomStatus(room, bookings, todayStr);
        const config = statusConfig[status];
        const isHovered = hoveredRoom === room.id;
        const progress = booking ? getStayProgress(booking) : 0;

        return (
          <motion.div
            key={room.id}
            variants={itemVariants}
            onMouseEnter={() => setHoveredRoom(room.id)}
            onMouseLeave={() => setHoveredRoom(null)}
            onClick={() => {
              if (booking) onSelectBooking(booking);
            }}
            className="cursor-pointer"
          >
            <GlassPanel
              variant="interactive"
              noPadding
              className={cn(
                "!rounded-2xl overflow-hidden transition-shadow duration-500 group",
                isHovered && config.shadow
              )}
            >
              {/* Status glow line at top */}
              <div
                className="h-[2px] w-full"
                style={{
                  background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
                }}
              />

              <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `color-mix(in srgb, ${config.color} 7%, transparent)` }}
                      >
                        <BedDouble className="w-5 h-5" style={{ color: config.color }} />
                      </div>
                      {status === "available" && (
                        <motion.div
                          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
                          style={{ background: config.color }}
                          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-fg text-base tracking-tight">
                        {room.name}
                      </h3>
                      <p className="text-xs text-fg-faint font-medium capitalize">{room.type}</p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider",
                      config.badgeBg,
                      config.badgeText,
                      config.badgeBorder
                    )}
                  >
                    {config.label}
                  </span>
                </div>

                {/* Room details */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-fg-faint" />
                    <span className="text-xs text-fg-muted font-data">{room.capacity}p</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-fg-faint" />
                    <span className="text-xs text-fg-muted font-data">
                      ${room.price_per_unit}/{room.price_unit}
                    </span>
                  </div>
                </div>

                {/* Occupied: guest info + progress bar */}
                {booking && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="border-t border-edge pt-3 mt-1">
                      <div className="flex items-center gap-2 mb-2.5">
                        <User className="w-3.5 h-3.5 text-fg-faint" />
                        <span className="text-sm font-semibold text-fg truncate">
                          {booking.guest_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-fg-faint mb-1.5 font-data">
                        <span>{booking.check_in}</span>
                        <span>{booking.check_out}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full bg-[var(--glass-bg-hover)] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: config.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <p className="text-[10px] text-fg-faint mt-1 text-right font-data">
                        {progress}% of stay
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Expand hint on hover */}
                <AnimatePresence>
                  {isHovered && booking && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="text-[10px] text-accent font-medium mt-2 text-center"
                    >
                      Click for details
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </GlassPanel>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ================================================================
// TIMELINE VIEW
// ================================================================
function TimelineView({
  rooms,
  bookings,
  visibleBookings,
  days,
  startDate,
  weekOffset,
  setWeekOffset,
  selectedBooking,
  setSelectedBooking,
  todayStr,
}: {
  rooms: Room[];
  bookings: Booking[];
  visibleBookings: Booking[];
  days: Date[];
  startDate: Date;
  weekOffset: number;
  setWeekOffset: (fn: (w: number) => number) => void;
  selectedBooking: Booking | null;
  setSelectedBooking: (b: Booking | null) => void;
  todayStr: string;
}) {
  // Calculate today line position
  const todayOffset = useMemo(() => {
    const todayDate = new Date();
    const start = startDate.getTime();
    const end = addDays(startDate, DAYS_TO_SHOW).getTime();
    const now = todayDate.getTime();
    if (now < start || now > end) return null;
    return ((now - start) / (end - start)) * 100;
  }, [startDate]);

  return (
    <div className="flex flex-col">
      {/* Calendar navigation */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-edge flex items-center justify-between">
        <GlowButton variant="ghost" size="icon" onClick={() => setWeekOffset((w: number) => w - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </GlowButton>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-fg tracking-tight font-display">
            {shortDate(days[0])} &mdash; {shortDate(days[days.length - 1])}
          </span>
          {weekOffset !== 0 && (
            <GlowButton
              variant="secondary"
              size="sm"
              onClick={() => setWeekOffset(() => 0)}
            >
              Today
            </GlowButton>
          )}
        </div>

        <GlowButton variant="ghost" size="icon" onClick={() => setWeekOffset((w: number) => w + 1)}>
          <ChevronRight className="w-4 h-4" />
        </GlowButton>
      </div>

      {/* Timeline grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="sticky top-0 z-10 backdrop-blur-2xl bg-[var(--surface)]/80 border-b border-edge flex">
            <div className="w-40 sm:w-48 shrink-0 p-2.5 pl-5 text-[10px] font-semibold text-fg-faint uppercase tracking-[0.15em] flex items-center">
              Room
            </div>
            {days.map((d) => {
              const today = isToday(d);
              const weekend = isWeekend(d);
              return (
                <div
                  key={toDateStr(d)}
                  className={cn(
                    "flex-1 min-w-[52px] p-1.5 text-center border-l border-edge transition-colors",
                    weekend && "bg-[var(--glass-bg)]",
                    today && "bg-accent/[0.06]"
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] uppercase tracking-wider font-semibold",
                      today ? "text-accent" : "text-fg-faint"
                    )}
                  >
                    {shortDay(d)}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-semibold mt-0.5 font-data",
                      today ? "text-accent" : "text-fg-muted"
                    )}
                  >
                    {d.getDate()}
                  </p>
                  {today && (
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-accent mx-auto mt-0.5"
                      animate={{
                        boxShadow: [
                          "0 0 4px color-mix(in srgb, var(--accent) 50%, transparent)",
                          "0 0 12px color-mix(in srgb, var(--accent) 80%, transparent)",
                          "0 0 4px color-mix(in srgb, var(--accent) 50%, transparent)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Room rows */}
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg)] border border-edge flex items-center justify-center mb-4">
                <BedDouble className="w-8 h-8 text-fg-faint" />
              </div>
              <p className="text-sm text-fg-faint font-medium">No rooms found</p>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              {rooms.map((room, roomIdx) => {
                const roomBookings = visibleBookings.filter((b) => b.resource_id === room.id);
                const occupied = bookings.some(
                  (b) => b.resource_id === room.id && b.check_in <= todayStr && b.check_out > todayStr
                );

                return (
                  <motion.div
                    key={room.id}
                    variants={itemVariants}
                    className="flex border-b border-edge group hover:bg-[var(--glass-bg)] transition-all duration-300"
                  >
                    {/* Room info */}
                    <div className="w-40 sm:w-48 shrink-0 p-3 pl-5 flex items-center gap-2.5">
                      <div className="relative">
                        <div
                          className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0",
                            occupied ? "bg-cyan-accent" : "bg-success"
                          )}
                        />
                        {!occupied && (
                          <motion.div
                            className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-success/40"
                            animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg truncate tracking-tight">
                          {room.name}
                        </p>
                        <p className="text-[11px] text-fg-faint truncate font-data">
                          {room.capacity}p &middot; ${room.price_per_unit}
                        </p>
                      </div>
                    </div>

                    {/* Day cells + booking bars */}
                    <div className="flex flex-1 relative" style={{ minHeight: 60 }}>
                      {/* Background cells */}
                      {days.map((d) => (
                        <div
                          key={toDateStr(d)}
                          className={cn(
                            "flex-1 min-w-[52px] border-l border-edge/50 transition-colors",
                            isWeekend(d) && "bg-[var(--glass-bg)]",
                            isToday(d) && "bg-accent/[0.03]"
                          )}
                        />
                      ))}

                      {/* Today vertical line */}
                      {todayOffset !== null && (
                        <motion.div
                          className="absolute top-0 bottom-0 w-px z-10"
                          style={{
                            left: `${todayOffset}%`,
                            background: "linear-gradient(to bottom, color-mix(in srgb, var(--accent) 60%, transparent), color-mix(in srgb, var(--accent) 10%, transparent))",
                            boxShadow: "0 0 8px color-mix(in srgb, var(--accent) 40%, transparent)",
                          }}
                          animate={{
                            boxShadow: [
                              "0 0 8px color-mix(in srgb, var(--accent) 30%, transparent)",
                              "0 0 16px color-mix(in srgb, var(--accent) 60%, transparent)",
                              "0 0 8px color-mix(in srgb, var(--accent) 30%, transparent)",
                            ],
                          }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                      )}

                      {/* Booking bars */}
                      {roomBookings.map((booking, bIdx) => {
                        const bStart = new Date(booking.check_in + "T00:00:00");
                        const bEnd = new Date(booking.check_out + "T00:00:00");
                        const gridStart = startDate;
                        const gridEnd = addDays(startDate, DAYS_TO_SHOW);

                        const visStart = bStart < gridStart ? gridStart : bStart;
                        const visEnd = bEnd > gridEnd ? gridEnd : bEnd;

                        const offsetDays = daysBetween(toDateStr(gridStart), toDateStr(visStart));
                        const spanDays = daysBetween(toDateStr(visStart), toDateStr(visEnd));

                        if (spanDays <= 0) return null;

                        const leftPct = (offsetDays / DAYS_TO_SHOW) * 100;
                        const widthPct = (spanDays / DAYS_TO_SHOW) * 100;
                        const clr = bookingColor(roomIdx + bIdx);
                        const clippedLeft = bStart < gridStart;
                        const clippedRight = bEnd > gridEnd;
                        const isSelected = selectedBooking?.id === booking.id;

                        return (
                          <motion.button
                            key={booking.id}
                            onClick={() =>
                              setSelectedBooking(
                                selectedBooking?.id === booking.id ? null : booking
                              )
                            }
                            className={cn(
                              "absolute top-2.5 bottom-2.5 flex items-center gap-1.5 px-2.5 cursor-pointer",
                              "backdrop-blur-md border transition-all duration-300",
                              clippedLeft ? "rounded-l-none" : "rounded-l-xl",
                              clippedRight ? "rounded-r-none" : "rounded-r-xl",
                              isSelected && "ring-2 ring-accent/50 brightness-125 z-20"
                            )}
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              background: clr.bg,
                              borderColor: clr.border,
                              boxShadow: isSelected
                                ? `0 0 20px ${clr.glow}`
                                : "none",
                            }}
                            whileHover={{
                              scale: 1.02,
                              boxShadow: `0 0 20px ${clr.glow}`,
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            <span
                              className={cn(
                                "text-[11px] font-semibold truncate",
                                clr.text
                              )}
                            >
                              {booking.guest_name}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// BOOKING DETAIL MODAL (floating glass panel)
// ================================================================
function BookingDetailModal({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const nights = daysBetween(booking.check_in, booking.check_out);
  const checkIn = new Date(booking.check_in + "T00:00:00");
  const checkOut = new Date(booking.check_out + "T00:00:00");
  const overlayRef = useRef<HTMLDivElement>(null);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <motion.div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-[var(--surface)]/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-3xl border border-edge-2",
          "bg-[var(--glass-bg)] backdrop-blur-[60px] saturate-150",
          "bg-gradient-to-br from-[var(--glass-bg-hover)] from-0% to-transparent to-40%",
          "shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_40px_color-mix(in_srgb,var(--accent)_8%,transparent)]",
          "overflow-hidden"
        )}
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Top glow line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-display text-xl font-bold text-fg tracking-tight">
                  {booking.guest_name}
                </h3>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/25 uppercase tracking-wider">
                  Confirmed
                </span>
              </div>
              <p className="text-xs text-fg-faint mt-1.5 font-medium">
                {booking.resources?.name} &middot; Booked via{" "}
                <span className="text-fg-muted">{booking.booked_via?.replace("_", " ")}</span>
              </p>
            </div>
            <GlowButton variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </GlowButton>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <DetailCell
              icon={<Calendar className="w-4 h-4 text-accent" />}
              label="Check-in"
              value={fmt(checkIn)}
            />
            <DetailCell
              icon={<Calendar className="w-4 h-4 text-danger" />}
              label="Check-out"
              value={fmt(checkOut)}
            />
            <DetailCell
              icon={<Clock className="w-4 h-4 text-cyan-accent" />}
              label="Duration"
              value={`${nights} night${nights !== 1 ? "s" : ""}`}
            />
            <DetailCell
              icon={<DollarSign className="w-4 h-4 text-gold" />}
              label="Total"
              value={booking.total_price ? `$${booking.total_price}` : "\u2014"}
            />
            <DetailCell
              icon={<Users className="w-4 h-4 text-warning" />}
              label="Guests"
              value={`${booking.guest_count}`}
            />
            <DetailCell
              icon={<Phone className="w-4 h-4 text-success" />}
              label="Phone"
              value={booking.guest_phone || "\u2014"}
            />
          </div>

          {/* Stay progress */}
          {(() => {
            const progress = getStayProgress(booking);
            if (progress <= 0 || progress >= 100) return null;
            return (
              <div className="border-t border-edge pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-fg-faint font-medium">Stay progress</span>
                  <span className="text-xs text-fg-muted font-data">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--glass-bg-hover)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ================================================================
// DETAIL CELL (used in modal)
// ================================================================
function DetailCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--glass-bg)] border border-edge backdrop-blur-sm">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.12em] text-fg-faint font-semibold">
          {label}
        </p>
        <p className="text-xs font-semibold text-fg truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}
