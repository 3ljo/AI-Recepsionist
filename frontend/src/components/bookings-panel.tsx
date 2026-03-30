"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
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

// ── helpers ──────────────────────────────────────────────
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

// ── color palette for booking bars ───────────────────────
const BOOKING_COLORS = [
  { bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-400", dot: "bg-blue-400" },
  { bg: "bg-violet-500/20", border: "border-violet-500/40", text: "text-violet-400", dot: "bg-violet-400" },
  { bg: "bg-emerald-500/20", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-400" },
  { bg: "bg-amber-500/20", border: "border-amber-500/40", text: "text-amber-400", dot: "bg-amber-400" },
  { bg: "bg-rose-500/20", border: "border-rose-500/40", text: "text-rose-400", dot: "bg-rose-400" },
  { bg: "bg-cyan-500/20", border: "border-cyan-500/40", text: "text-cyan-400", dot: "bg-cyan-400" },
];
function bookingColor(i: number) {
  return BOOKING_COLORS[i % BOOKING_COLORS.length];
}

// ═════════════════════════════════════════════════════════
export function BookingsPanel() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // ── data fetching ────────────────────────────────────
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
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 500);
  };

  // ── derived data ─────────────────────────────────────
  const startDate = useMemo(() => addDays(new Date(), weekOffset * 7), [weekOffset]);
  const days = useMemo(
    () => Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(startDate, i)),
    [startDate]
  );

  const todayStr = toDateStr(new Date());
  const bookedToday = rooms.filter((r) =>
    bookings.some((b) => b.resource_id === r.id && b.check_in <= todayStr && b.check_out > todayStr)
  ).length;

  // bookings that overlap the visible range
  const endDateStr = toDateStr(addDays(startDate, DAYS_TO_SHOW));
  const startDateStr = toDateStr(startDate);
  const visibleBookings = bookings.filter(
    (b) => b.check_in < endDateStr && b.check_out > startDateStr
  );

  // ── loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          <p className="text-on-surface-3 text-sm">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── top bar: stats + nav ─────────────────────── */}
      <div className="shrink-0 p-4 sm:p-5 border-b border-edge bg-surface-2/40 backdrop-blur-sm">
        {/* Stats row */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Stat icon={<BedDouble className="w-3.5 h-3.5" />} value={rooms.length} label="Rooms" />
          <Stat icon={<DoorOpen className="w-3.5 h-3.5" />} value={rooms.length - bookedToday} label="Free today" accent="emerald" />
          <Stat icon={<Calendar className="w-3.5 h-3.5" />} value={bookings.length} label="Bookings" accent="amber" />

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-3 text-on-surface-3 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Calendar nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-3 text-on-surface-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-on-surface">
              {shortDate(days[0])} &mdash; {shortDate(days[days.length - 1])}
            </span>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs text-blue-500 hover:text-blue-400 transition-colors font-medium"
              >
                Today
              </button>
            )}
          </div>

          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-3 text-on-surface-3 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── calendar grid ────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b border-edge flex">
            {/* Room label column */}
            <div className="w-40 sm:w-48 shrink-0 p-2 pl-4 text-xs font-medium text-on-surface-3 uppercase tracking-wider flex items-center">
              Room
            </div>
            {/* Day columns */}
            {days.map((d) => {
              const today = isToday(d);
              const weekend = isWeekend(d);
              return (
                <div
                  key={toDateStr(d)}
                  className={`flex-1 min-w-[52px] p-1.5 text-center border-l border-edge/50 ${
                    weekend ? "bg-surface-3/30" : ""
                  }`}
                >
                  <p className={`text-[10px] uppercase tracking-wider ${today ? "text-blue-500 font-semibold" : "text-on-surface-3"}`}>
                    {shortDay(d)}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${today ? "text-blue-500" : "text-on-surface-2"}`}>
                    {d.getDate()}
                  </p>
                  {today && <div className="w-1 h-1 rounded-full bg-blue-500 mx-auto mt-0.5" />}
                </div>
              );
            })}
          </div>

          {/* Room rows */}
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BedDouble className="w-10 h-10 text-on-surface-3 mb-3" />
              <p className="text-sm text-on-surface-3">No rooms found</p>
              <p className="text-xs text-on-surface-3 mt-1">
                Check your Supabase &quot;resources&quot; table
              </p>
            </div>
          ) : (
            rooms.map((room, roomIdx) => {
              const roomBookings = visibleBookings.filter((b) => b.resource_id === room.id);
              const occupied = bookings.some(
                (b) => b.resource_id === room.id && b.check_in <= todayStr && b.check_out > todayStr
              );

              return (
                <div key={room.id} className="flex border-b border-edge/50 group hover:bg-surface-2/30 transition-colors">
                  {/* Room info */}
                  <div className="w-40 sm:w-48 shrink-0 p-3 pl-4 flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${occupied ? "bg-red-400" : "bg-emerald-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{room.name}</p>
                      <p className="text-[11px] text-on-surface-3 truncate">
                        {room.capacity}p &middot; ${room.price_per_unit}
                      </p>
                    </div>
                  </div>

                  {/* Day cells with booking bars */}
                  <div className="flex flex-1 relative" style={{ minHeight: 52 }}>
                    {/* Grid lines */}
                    {days.map((d) => (
                      <div
                        key={toDateStr(d)}
                        className={`flex-1 min-w-[52px] border-l border-edge/30 ${
                          isWeekend(d) ? "bg-surface-3/15" : ""
                        } ${isToday(d) ? "bg-blue-500/5" : ""}`}
                      />
                    ))}

                    {/* Booking bars (absolute positioned) */}
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
                      const clipped_left = bStart < gridStart;
                      const clipped_right = bEnd > gridEnd;

                      return (
                        <button
                          key={booking.id}
                          onClick={() => setSelectedBooking(selectedBooking?.id === booking.id ? null : booking)}
                          className={`absolute top-1.5 bottom-1.5 ${clr.bg} border ${clr.border} flex items-center gap-1.5 px-2 cursor-pointer hover:brightness-125 transition-all ${
                            clipped_left ? "rounded-l-none" : "rounded-l-lg"
                          } ${clipped_right ? "rounded-r-none" : "rounded-r-lg"} ${
                            selectedBooking?.id === booking.id ? "ring-2 ring-blue-500/50 brightness-125" : ""
                          }`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        >
                          <span className={`text-[11px] font-medium ${clr.text} truncate`}>
                            {booking.guest_name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── booking detail drawer ────────────────────── */}
      {selectedBooking && (
        <BookingDetail
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// Stat pill
// ═════════════════════════════════════════════════════════
function Stat({
  icon,
  value,
  label,
  accent = "blue",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent?: "blue" | "emerald" | "amber";
}) {
  const ring = {
    blue: "border-blue-500/20",
    emerald: "border-emerald-500/20",
    amber: "border-amber-500/20",
  }[accent];
  const iconClr = {
    blue: "text-blue-500",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
  }[accent];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${ring} bg-surface-3/40`}>
      <span className={iconClr}>{icon}</span>
      <span className="text-sm font-semibold text-on-surface tabular-nums">{value}</span>
      <span className="text-xs text-on-surface-3">{label}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// Booking detail card (slides up from bottom)
// ═════════════════════════════════════════════════════════
function BookingDetail({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const nights = daysBetween(booking.check_in, booking.check_out);
  const checkIn = new Date(booking.check_in + "T00:00:00");
  const checkOut = new Date(booking.check_out + "T00:00:00");

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="shrink-0 border-t border-edge bg-surface-2/80 backdrop-blur-xl animate-slide-up">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-base font-semibold text-on-surface">
              {booking.guest_name}
            </h4>
            <p className="text-xs text-on-surface-3 mt-0.5">
              {booking.resources?.name} &middot; Booked via {booking.booked_via?.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-on-surface-3 hover:text-on-surface transition-colors px-2 py-1 rounded-lg hover:bg-surface-3"
          >
            Close
          </button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DetailCell
            icon={<Calendar className="w-3.5 h-3.5 text-blue-500" />}
            label="Check-in"
            value={fmt(checkIn)}
          />
          <DetailCell
            icon={<Calendar className="w-3.5 h-3.5 text-rose-500" />}
            label="Check-out"
            value={fmt(checkOut)}
          />
          <DetailCell
            icon={<Clock className="w-3.5 h-3.5 text-violet-500" />}
            label="Duration"
            value={`${nights} night${nights !== 1 ? "s" : ""}`}
          />
          <DetailCell
            icon={<DollarSign className="w-3.5 h-3.5 text-emerald-500" />}
            label="Total"
            value={booking.total_price ? `$${booking.total_price}` : "—"}
          />
          <DetailCell
            icon={<Users className="w-3.5 h-3.5 text-amber-500" />}
            label="Guests"
            value={`${booking.guest_count}`}
          />
          <DetailCell
            icon={<Phone className="w-3.5 h-3.5 text-cyan-500" />}
            label="Phone"
            value={booking.guest_phone || "—"}
          />
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-surface-3/40">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-on-surface-3">{label}</p>
        <p className="text-xs font-medium text-on-surface truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}
