// ══════════════════════════════════════════════════════════
// MOCK DATA — Realistic hotel data for the AI Command Interface
// ══════════════════════════════════════════════════════════

export interface Room {
  id: number;
  name: string;
  type: "standard" | "deluxe" | "presidential";
  capacity: number;
  price: number;
  floor: number;
  status: "available" | "occupied" | "maintenance";
  currentGuest?: string;
  checkIn?: string;
  checkOut?: string;
  stayProgress?: number;
}

export interface Booking {
  id: string;
  roomId: number;
  roomName: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: "confirmed" | "pending" | "cancelled";
  bookedVia: "ai_phone" | "ai_chat" | "manual";
  createdAt: string;
}

export interface CallRecord {
  id: string;
  callerNumber: string;
  callerName?: string;
  duration: number;
  outcome: "answered" | "missed" | "voicemail";
  bookingResult?: string;
  timestamp: string;
  summary?: string;
}

export interface ChatConversation {
  id: string;
  guestName?: string;
  guestNumber?: string;
  lastMessage: string;
  messageCount: number;
  timestamp: string;
  resolved: boolean;
}

export interface ActivityEvent {
  id: string;
  type: "call" | "chat" | "booking" | "checkin" | "checkout" | "cancellation" | "system";
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  accentColor: string;
  metadata?: Record<string, string>;
}

// ── Today's date helpers ─────────────────────────────────
const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split("T")[0];

function daysFromNow(n: number) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number) {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ── Rooms ────────────────────────────────────────────────
export const rooms: Room[] = [
  {
    id: 1,
    name: "Deluxe Suite 201",
    type: "deluxe",
    capacity: 3,
    price: 159,
    floor: 2,
    status: "occupied",
    currentGuest: "Maria Garcia",
    checkIn: daysAgo(2),
    checkOut: daysFromNow(3),
    stayProgress: 40,
  },
  {
    id: 2,
    name: "Deluxe Suite 202",
    type: "deluxe",
    capacity: 3,
    price: 179,
    floor: 2,
    status: "available",
  },
  {
    id: 3,
    name: "Presidential Suite",
    type: "presidential",
    capacity: 5,
    price: 349,
    floor: 3,
    status: "occupied",
    currentGuest: "James Wilson",
    checkIn: daysAgo(1),
    checkOut: daysFromNow(4),
    stayProgress: 20,
  },
  {
    id: 4,
    name: "Standard Room 101",
    type: "standard",
    capacity: 2,
    price: 89,
    floor: 1,
    status: "maintenance",
  },
  {
    id: 5,
    name: "Standard Room 102",
    type: "standard",
    capacity: 2,
    price: 89,
    floor: 1,
    status: "available",
  },
];

// ── Bookings ─────────────────────────────────────────────
export const bookings: Booking[] = [
  {
    id: "bk-001",
    roomId: 1,
    roomName: "Deluxe Suite 201",
    guestName: "Maria Garcia",
    guestPhone: "+1 555-0142",
    guestEmail: "maria.garcia@email.com",
    guestCount: 2,
    checkIn: daysAgo(2),
    checkOut: daysFromNow(3),
    totalPrice: 795,
    status: "confirmed",
    bookedVia: "ai_phone",
    createdAt: daysAgo(5),
  },
  {
    id: "bk-002",
    roomId: 3,
    roomName: "Presidential Suite",
    guestName: "James Wilson",
    guestPhone: "+1 555-0198",
    guestEmail: "j.wilson@corp.com",
    guestCount: 3,
    checkIn: daysAgo(1),
    checkOut: daysFromNow(4),
    totalPrice: 1745,
    status: "confirmed",
    bookedVia: "ai_phone",
    createdAt: daysAgo(3),
  },
  {
    id: "bk-003",
    roomId: 2,
    roomName: "Deluxe Suite 202",
    guestName: "Sophie Chen",
    guestPhone: "+1 555-0267",
    guestCount: 2,
    checkIn: daysFromNow(1),
    checkOut: daysFromNow(4),
    totalPrice: 537,
    status: "confirmed",
    bookedVia: "ai_chat",
    createdAt: daysAgo(1),
  },
  {
    id: "bk-004",
    roomId: 5,
    roomName: "Standard Room 102",
    guestName: "Ahmed Hassan",
    guestPhone: "+1 555-0334",
    guestCount: 1,
    checkIn: daysFromNow(2),
    checkOut: daysFromNow(5),
    totalPrice: 267,
    status: "confirmed",
    bookedVia: "manual",
    createdAt: todayStr,
  },
  {
    id: "bk-005",
    roomId: 1,
    roomName: "Deluxe Suite 201",
    guestName: "Elena Rossi",
    guestPhone: "+1 555-0421",
    guestCount: 2,
    checkIn: daysFromNow(5),
    checkOut: daysFromNow(8),
    totalPrice: 477,
    status: "pending",
    bookedVia: "ai_phone",
    createdAt: todayStr,
  },
];

// ── Call Records ─────────────────────────────────────────
export const callRecords: CallRecord[] = [
  {
    id: "call-001",
    callerNumber: "+1 555-0142",
    callerName: "Maria Garcia",
    duration: 194,
    outcome: "answered",
    bookingResult: "Booked Deluxe Suite 201",
    timestamp: `${todayStr}T09:14:00`,
    summary: "Guest inquired about deluxe rooms. AI checked availability and completed booking for 5 nights.",
  },
  {
    id: "call-002",
    callerNumber: "+1 555-0198",
    callerName: "James Wilson",
    duration: 247,
    outcome: "answered",
    bookingResult: "Booked Presidential Suite",
    timestamp: `${todayStr}T09:45:00`,
    summary: "Corporate guest requested premium accommodation. Booked Presidential Suite with late checkout.",
  },
  {
    id: "call-003",
    callerNumber: "+1 555-0511",
    duration: 0,
    outcome: "missed",
    timestamp: `${todayStr}T10:30:00`,
  },
  {
    id: "call-004",
    callerNumber: "+1 555-0267",
    callerName: "Sophie Chen",
    duration: 156,
    outcome: "answered",
    timestamp: `${todayStr}T11:20:00`,
    summary: "Guest asked about parking and breakfast options. Provided hotel amenity information.",
  },
  {
    id: "call-005",
    callerNumber: "+1 555-0689",
    duration: 45,
    outcome: "voicemail",
    timestamp: `${todayStr}T13:15:00`,
    summary: "Caller left voicemail asking about group rates for upcoming conference.",
  },
  {
    id: "call-006",
    callerNumber: "+1 555-0334",
    callerName: "Ahmed Hassan",
    duration: 132,
    outcome: "answered",
    bookingResult: "Inquiry only",
    timestamp: `${todayStr}T14:22:00`,
    summary: "Guest asked about Standard Room availability for next week. Provided pricing and amenities.",
  },
  {
    id: "call-007",
    callerNumber: "+1 555-0421",
    callerName: "Elena Rossi",
    duration: 210,
    outcome: "answered",
    bookingResult: "Booked Deluxe Suite 201",
    timestamp: `${todayStr}T15:48:00`,
    summary: "International guest booked a deluxe suite for next week. Requested airport transfer information.",
  },
];

// ── Chat Conversations ───────────────────────────────────
export const chatConversations: ChatConversation[] = [
  {
    id: "chat-001",
    guestName: "Sophie Chen",
    lastMessage: "Perfect, I'll check in tomorrow afternoon. Thank you!",
    messageCount: 8,
    timestamp: `${todayStr}T10:30:00`,
    resolved: true,
  },
  {
    id: "chat-002",
    guestName: "Anonymous Guest",
    lastMessage: "What time is breakfast served?",
    messageCount: 3,
    timestamp: `${todayStr}T12:15:00`,
    resolved: true,
  },
  {
    id: "chat-003",
    guestName: "David Park",
    guestNumber: "+1 555-0778",
    lastMessage: "Can I get a late checkout on Sunday?",
    messageCount: 5,
    timestamp: `${todayStr}T14:45:00`,
    resolved: false,
  },
  {
    id: "chat-004",
    guestName: "Lisa Thompson",
    lastMessage: "Thanks for the room recommendation!",
    messageCount: 12,
    timestamp: `${daysAgo(1)}T16:20:00`,
    resolved: true,
  },
];

// ── Activity Stream ──────────────────────────────────────
export const activityEvents: ActivityEvent[] = [
  {
    id: "evt-001",
    type: "call",
    title: "AI answered call",
    description: "Maria Garcia — Booked Deluxe Suite 201 for 5 nights",
    timestamp: `${todayStr}T09:14:00`,
    icon: "phone",
    accentColor: "emerald",
    metadata: { caller: "+1 555-0142", duration: "3m 14s" },
  },
  {
    id: "evt-002",
    type: "booking",
    title: "New booking created",
    description: "Presidential Suite — James Wilson, 5 nights ($1,745)",
    timestamp: `${todayStr}T09:47:00`,
    icon: "calendar",
    accentColor: "accent",
    metadata: { source: "AI Phone", room: "Presidential Suite" },
  },
  {
    id: "evt-003",
    type: "chat",
    title: "Chat conversation",
    description: "Guest asked about parking and breakfast options",
    timestamp: `${todayStr}T10:30:00`,
    icon: "message",
    accentColor: "cyan",
  },
  {
    id: "evt-004",
    type: "checkin",
    title: "Guest checked in",
    description: "Maria Garcia → Deluxe Suite 201",
    timestamp: `${todayStr}T11:00:00`,
    icon: "doorOpen",
    accentColor: "success",
  },
  {
    id: "evt-005",
    type: "call",
    title: "Missed call",
    description: "Unknown caller +1 555-0511 — No voicemail",
    timestamp: `${todayStr}T10:30:00`,
    icon: "phoneMissed",
    accentColor: "danger",
  },
  {
    id: "evt-006",
    type: "call",
    title: "AI answered call",
    description: "Sophie Chen — Parking and amenities inquiry",
    timestamp: `${todayStr}T11:20:00`,
    icon: "phone",
    accentColor: "emerald",
    metadata: { caller: "+1 555-0267", duration: "2m 36s" },
  },
  {
    id: "evt-007",
    type: "call",
    title: "Voicemail received",
    description: "Caller asking about group conference rates",
    timestamp: `${todayStr}T13:15:00`,
    icon: "voicemail",
    accentColor: "warning",
  },
  {
    id: "evt-008",
    type: "chat",
    title: "Chat conversation",
    description: "David Park asked about late checkout on Sunday",
    timestamp: `${todayStr}T14:45:00`,
    icon: "message",
    accentColor: "cyan",
  },
  {
    id: "evt-009",
    type: "booking",
    title: "New booking created",
    description: "Deluxe Suite 201 — Elena Rossi, 3 nights ($477)",
    timestamp: `${todayStr}T15:50:00`,
    icon: "calendar",
    accentColor: "accent",
    metadata: { source: "AI Phone", room: "Deluxe Suite 201" },
  },
  {
    id: "evt-010",
    type: "call",
    title: "AI answered call",
    description: "Elena Rossi — Booked room + airport transfer inquiry",
    timestamp: `${todayStr}T15:48:00`,
    icon: "phone",
    accentColor: "emerald",
    metadata: { caller: "+1 555-0421", duration: "3m 30s" },
  },
];

// ── Dashboard Stats ──────────────────────────────────────
export const dashboardStats = {
  occupancy: 60,
  revenueToday: 687,
  revenueWeek: 4280,
  callsHandled: 7,
  callsAnswered: 5,
  callsMissed: 1,
  callsVoicemail: 1,
  callSuccessRate: 86,
  upcomingCheckins: 2,
  upcomingCheckouts: 0,
  avgCallDuration: "2m 14s",
  totalRooms: 5,
  availableRooms: 2,
  nextGuest: "Sophie Chen",
  nextGuestDate: tomorrowStr,
  topRoom: "Deluxe Suite 201",
  avgStayDuration: 3.8,
};

// ── Revenue data for charts ──────────────────────────────
export const revenueData = [
  { date: daysAgo(13), revenue: 420, occupancy: 40 },
  { date: daysAgo(12), revenue: 510, occupancy: 40 },
  { date: daysAgo(11), revenue: 380, occupancy: 20 },
  { date: daysAgo(10), revenue: 690, occupancy: 60 },
  { date: daysAgo(9), revenue: 750, occupancy: 60 },
  { date: daysAgo(8), revenue: 600, occupancy: 40 },
  { date: daysAgo(7), revenue: 430, occupancy: 40 },
  { date: daysAgo(6), revenue: 520, occupancy: 40 },
  { date: daysAgo(5), revenue: 680, occupancy: 60 },
  { date: daysAgo(4), revenue: 710, occupancy: 60 },
  { date: daysAgo(3), revenue: 590, occupancy: 40 },
  { date: daysAgo(2), revenue: 640, occupancy: 60 },
  { date: daysAgo(1), revenue: 720, occupancy: 60 },
  { date: todayStr, revenue: 687, occupancy: 60 },
];

// ── Booking source breakdown ─────────────────────────────
export const bookingSources = [
  { source: "AI Phone", percentage: 45, count: 9, color: "#7C5CFC" },
  { source: "AI Chat", percentage: 30, count: 6, color: "#22D3EE" },
  { source: "Manual", percentage: 25, count: 5, color: "#D4A853" },
];

// ── Peak hours data ──────────────────────────────────────
export const peakHours = [
  { hour: "8 AM", calls: 1 },
  { hour: "9 AM", calls: 3 },
  { hour: "10 AM", calls: 2 },
  { hour: "11 AM", calls: 2 },
  { hour: "12 PM", calls: 1 },
  { hour: "1 PM", calls: 1 },
  { hour: "2 PM", calls: 2 },
  { hour: "3 PM", calls: 3 },
  { hour: "4 PM", calls: 2 },
  { hour: "5 PM", calls: 1 },
  { hour: "6 PM", calls: 0 },
  { hour: "7 PM", calls: 1 },
];

// ── AI Status Message ────────────────────────────────────
export const aiStatusMessage =
  "All systems nominal. 2 guests checked in today. 1 missed call. Suite 201 is your best seller this week.";

export const aiBriefing =
  "Today was strong — 60% occupancy with $687 in revenue. The Presidential Suite is your top performer this week. You had 7 calls, 5 handled successfully. 2 guests arrive tomorrow. Sophie Chen is checking into Deluxe Suite 202, and Ahmed Hassan has Standard Room 102 reserved.";
