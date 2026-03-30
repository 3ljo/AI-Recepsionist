"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getStatus } from "@/lib/api";
import { CommandBar, type NavSection } from "@/components/command-bar";
import { HubPage } from "@/components/hub-page";
import { ChatWidget } from "@/components/chat-widget";
import { VoiceWidget } from "@/components/voice-widget";
import { BookingsPanel } from "@/components/bookings-panel";
import { ActivityPage } from "@/components/activity-page";
import { SettingsPage } from "@/components/settings-page";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState<NavSection>("hub");
  const [user, setUser] = useState<any>(null);
  const [serverOnline, setServerOnline] = useState(false);
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
      .then((s) => setServerOnline(s?.status === "healthy"))
      .catch(() => setServerOnline(false));

    const interval = setInterval(() => {
      getStatus()
        .then((s) => setServerOnline(s?.status === "healthy"))
        .catch(() => setServerOnline(false));
    }, 30000);

    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen relative">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent/30 border-t-accent" />
            <div className="absolute inset-0 rounded-full bg-accent/10 blur-xl animate-breathe" />
          </div>
          <p className="text-fg-faint text-sm font-medium tracking-wide">
            Initializing command interface...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10">
      <CommandBar
        active={activeSection}
        onNavigate={setActiveSection}
        onLogout={handleLogout}
        serverOnline={serverOnline}
        userInitial={user.email?.[0]?.toUpperCase() || "U"}
      />

      {/* Main content area */}
      <main className="pt-20 md:pt-20 pb-24 md:pb-6 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={
              activeSection === "chat" || activeSection === "voice"
                ? "h-[calc(100vh-80px)] md:h-[calc(100vh-80px)]"
                : ""
            }
          >
            {activeSection === "hub" && (
              <HubPage onNavigate={setActiveSection} />
            )}
            {activeSection === "chat" && <ChatWidget />}
            {activeSection === "voice" && <VoiceWidget />}
            {activeSection === "rooms" && <BookingsPanel />}
            {activeSection === "activity" && <ActivityPage />}
            {activeSection === "settings" && <SettingsPage />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
