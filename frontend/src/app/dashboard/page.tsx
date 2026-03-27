"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChatWidget } from "@/components/chat-widget";
import { VoiceWidget } from "@/components/voice-widget";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MessageSquare,
  Mic,
  LogOut,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";
import { getStatus } from "@/lib/api";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "voice">("chat");
  const [user, setUser] = useState<any>(null);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setUser(session.user);
      }
    });

    // Check server status
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        {/* Logo */}
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">
                AI Receptionist
              </h1>
              <p className="text-xs text-zinc-500">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              activeTab === "chat"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              activeTab === "voice"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Mic className="w-4 h-4" />
            Voice Call
          </button>
        </nav>

        {/* Server status */}
        <div className="p-3 border-t border-zinc-800">
          <div className="px-3 py-2 rounded-lg bg-zinc-800/50 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400">
                System Status
              </span>
            </div>
            {serverStatus ? (
              <div className="space-y-1.5">
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
              <div className="flex items-center gap-2 text-xs text-red-400">
                <WifiOff className="w-3 h-3" />
                Offline
              </div>
            )}
          </div>

          {/* User */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-white">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <span className="text-xs text-zinc-400 truncate">
                {user.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30">
          <div className="flex items-center gap-2">
            {activeTab === "chat" ? (
              <MessageSquare className="w-4 h-4 text-blue-400" />
            ) : (
              <Mic className="w-4 h-4 text-blue-400" />
            )}
            <h2 className="text-sm font-medium text-white">
              {activeTab === "chat" ? "Chat with AI" : "Voice Call"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {serverStatus && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>
                  {serverStatus.active_calls || 0} active call
                  {serverStatus.active_calls !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" ? <ChatWidget /> : <VoiceWidget />}
        </div>
      </main>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            ok ? "bg-emerald-400" : "bg-red-400"
          }`}
        />
        <span className={`text-xs ${ok ? "text-emerald-400" : "text-red-400"}`}>
          {ok ? "OK" : "Down"}
        </span>
      </div>
    </div>
  );
}
