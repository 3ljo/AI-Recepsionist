"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  BedDouble,
  Calendar,
  User,
  DoorOpen,
  Ban,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const BUSINESS_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

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

export function BookingsPanel() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

    // Real-time subscription for bookings changes
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `business_id=eq.${BUSINESS_ID}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getBookingsForRoom = (roomId: string) =>
    bookings.filter((b) => b.resource_id === roomId);

  const isRoomBookedToday = (roomId: string) => {
    const today = new Date().toISOString().split("T")[0];
    return bookings.some(
      (b) => b.resource_id === roomId && b.check_in <= today && b.check_out > today
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

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

  const totalRooms = rooms.length;
  const bookedToday = rooms.filter((r) => isRoomBookedToday(r.id)).length;
  const availableToday = totalRooms - bookedToday;
  const upcomingBookings = bookings.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header stats */}
      <div className="p-4 sm:p-6 border-b border-edge">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-on-surface">
            Rooms & Bookings
          </h3>
          <button
            onClick={handleRefresh}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-3 text-on-surface-3 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Total Rooms"
            value={totalRooms}
            icon={<BedDouble className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="Available Today"
            value={availableToday}
            icon={<DoorOpen className="w-4 h-4" />}
            color="emerald"
          />
          <StatCard
            label="Upcoming"
            value={upcomingBookings}
            icon={<Calendar className="w-4 h-4" />}
            color="amber"
          />
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 p-4 sm:p-6 space-y-3">
        <h4 className="text-xs font-medium text-on-surface-3 uppercase tracking-wider mb-3">
          Room Status
        </h4>

        {rooms.length === 0 ? (
          <div className="text-center py-12">
            <BedDouble className="w-10 h-10 text-on-surface-3 mx-auto mb-3" />
            <p className="text-sm text-on-surface-3">No rooms found</p>
            <p className="text-xs text-on-surface-3 mt-1">
              Check that your Supabase &quot;resources&quot; table has data
            </p>
          </div>
        ) : (
          rooms.map((room) => {
            const roomBookings = getBookingsForRoom(room.id);
            const bookedNow = isRoomBookedToday(room.id);
            const isExpanded = expandedRoom === room.id;

            return (
              <div
                key={room.id}
                className="rounded-xl border border-edge bg-surface-2/60 overflow-hidden transition-colors"
              >
                {/* Room header */}
                <button
                  onClick={() =>
                    setExpandedRoom(isExpanded ? null : room.id)
                  }
                  className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-surface-3/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        bookedNow
                          ? "bg-red-500 animate-pulse"
                          : "bg-emerald-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {room.name}
                      </p>
                      <p className="text-xs text-on-surface-3">
                        Up to {room.capacity} guests &middot; ${room.price_per_unit}/{room.price_unit}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        bookedNow
                          ? "bg-red-500/10 text-red-500"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {bookedNow ? "Occupied" : "Available"}
                    </span>
                    {roomBookings.length > 0 && (
                      <span className="text-xs text-on-surface-3">
                        {roomBookings.length}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-on-surface-3" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-on-surface-3" />
                    )}
                  </div>
                </button>

                {/* Expanded bookings */}
                {isExpanded && (
                  <div className="border-t border-edge px-3 sm:px-4 py-3 space-y-2 bg-surface-3/30">
                    {room.description && (
                      <p className="text-xs text-on-surface-3 mb-2">
                        {room.description}
                      </p>
                    )}

                    {roomBookings.length === 0 ? (
                      <p className="text-xs text-on-surface-3 py-2">
                        No upcoming bookings for this room.
                      </p>
                    ) : (
                      roomBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-2/80 border border-edge"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-on-surface truncate">
                              {booking.guest_name}
                            </p>
                            <p className="text-xs text-on-surface-3">
                              {formatDate(booking.check_in)} &rarr;{" "}
                              {formatDate(booking.check_out)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {booking.total_price && (
                                <span className="text-xs text-on-surface-2">
                                  ${booking.total_price}
                                </span>
                              )}
                              <span className="text-xs text-on-surface-3">
                                {booking.guest_count} guest{booking.guest_count !== 1 ? "s" : ""}
                              </span>
                              <span className="text-xs text-on-surface-3 capitalize">
                                via {booking.booked_via?.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Recent cancelled bookings */}
        {bookings.length > 0 && (
          <div className="mt-6">
            <h4 className="text-xs font-medium text-on-surface-3 uppercase tracking-wider mb-3">
              Active Bookings Summary
            </h4>
            <div className="space-y-1.5">
              {bookings.slice(0, 10).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-1.5 px-2 text-xs"
                >
                  <span className="text-on-surface-2 truncate mr-2">
                    {b.guest_name} &middot; {b.resources?.name}
                  </span>
                  <span className="text-on-surface-3 shrink-0">
                    {formatDate(b.check_in)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "amber";
}) {
  const colors = {
    blue: "text-blue-500 bg-blue-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    amber: "text-amber-500 bg-amber-500/10",
  };

  return (
    <div className="rounded-xl bg-surface-3/50 p-3">
      <div className={`w-7 h-7 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-lg font-semibold text-on-surface tabular-nums">{value}</p>
      <p className="text-xs text-on-surface-3">{label}</p>
    </div>
  );
}
