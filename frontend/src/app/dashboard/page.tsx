"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChatWidget } from "@/components/chat-widget";
import { VoiceWidget } from "@/components/voice-widget";
import { BookingsPanel } from "@/components/bookings-panel";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  MessageSquare,
  Mic,
  BedDouble,
  LogOut,
  Activity,
  Wifi,
  WifiOff,
  Menu,
  X,
} from "lucide-react";
import { getStatus } from "@/lib/api";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "voice" | "bookings">("chat");
  const [user, setUser] = useState<any>(null);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setUser(session.user);
      }
    });

    getStatus()
      .then(setServerStatus)
      .catch(() => setServerStatus(null));

    const interval = setInterval(() => {
      getStatus()
        .then(setServerStatus)
        .catch(() => setServerStatus(null));
    }, 30000);

    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const switchTab = (tab: "chat" | "voice" | "bookings") => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          <p className="text-on-surface-3 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface transition-colors duration-300">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72
          lg:relative lg:z-auto lg:w-64
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          border-r border-edge bg-surface-2/80 backdrop-blur-xl flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-edge">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AI Receptionist" className="w-9 h-9 rounded-xl object-cover shadow-md shadow-blue-500/20" />
              <div>
                <h1 className="text-sm font-semibold text-on-surface">
                  AI Receptionist
                </h1>
                <p className="text-xs text-on-surface-3">Dashboard</p>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-3 text-on-surface-3 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <NavButton
            active={activeTab === "chat"}
            onClick={() => switchTab("chat")}
            icon={<MessageSquare className="w-4 h-4" />}
            label="Chat"
          />
          <NavButton
            active={activeTab === "voice"}
            onClick={() => switchTab("voice")}
            icon={<Mic className="w-4 h-4" />}
            label="Voice Call"
          />
          <NavButton
            active={activeTab === "bookings"}
            onClick={() => switchTab("bookings")}
            icon={<BedDouble className="w-4 h-4" />}
            label="Rooms & Bookings"
          />
        </nav>

        {/* Server status */}
        <div className="p-3 border-t border-edge">
          <div className="px-3 py-3 rounded-xl bg-surface-3/50 mb-3">
            <div className="flex items-center gap-2 mb-2.5">
              <Activity className="w-3.5 h-3.5 text-on-surface-3" />
              <span className="text-xs font-medium text-on-surface-2">
                System Status
              </span>
            </div>
            {serverStatus ? (
              <div className="space-y-2">
                <StatusRow
                  label="Server"
                  ok={serverStatus.status === "healthy"}
                />
                <StatusRow
                  label="Database"
                  ok={
                    serverStatus.services?.supabase?.status === "connected"
                  }
                />
                <StatusRow
                  label="AI Engine"
                  ok={
                    serverStatus.services?.anthropic?.status !== "error"
                  }
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-red-500">
                <WifiOff className="w-3 h-3" />
                Offline
              </div>
            )}
          </div>

          {/* User */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-xs font-medium text-white">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <span className="text-xs text-on-surface-2 truncate">
                {user.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-edge flex items-center justify-between px-4 sm:px-6 bg-surface-2/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-surface-3 text-on-surface-2 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {activeTab === "chat" && <MessageSquare className="w-4 h-4 text-blue-500" />}
            {activeTab === "voice" && <Mic className="w-4 h-4 text-blue-500" />}
            {activeTab === "bookings" && <BedDouble className="w-4 h-4 text-blue-500" />}
            <h2 className="text-sm font-medium text-on-surface">
              {activeTab === "chat" ? "Chat with AI" : activeTab === "voice" ? "Voice Call" : "Rooms & Bookings"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {serverStatus && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-on-surface-3">
                <Wifi className="w-3 h-3 text-emerald-500" />
                <span>
                  {serverStatus.active_calls || 0} active call
                  {serverStatus.active_calls !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && <ChatWidget />}
          {activeTab === "voice" && <VoiceWidget />}
          {activeTab === "bookings" && <BookingsPanel />}
        </div>
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
        active
          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm"
          : "text-on-surface-2 hover:text-on-surface hover:bg-surface-3"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-on-surface-3">{label}</span>
      <div className="flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            ok ? "bg-emerald-500 animate-pulse" : "bg-red-500"
          }`}
        />
        <span
          className={`text-xs font-medium ${
            ok ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {ok ? "OK" : "Down"}
        </span>
      </div>
    </div>
  );
}
