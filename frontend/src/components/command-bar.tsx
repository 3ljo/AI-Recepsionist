"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  MessageSquare,
  Phone,
  BedDouble,
  Activity,
  Settings,
  LogOut,
} from "lucide-react";
import { AIOrb } from "./ui/ai-orb";
import { ThemeToggle } from "./theme-toggle";

export type NavSection = "hub" | "chat" | "voice" | "rooms" | "activity" | "settings";

interface CommandBarProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  onLogout: () => void;
  serverOnline?: boolean;
  userInitial?: string;
}

const navItems: { id: NavSection; label: string; icon: React.ElementType }[] = [
  { id: "hub", label: "AI Hub", icon: Sparkles },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "voice", label: "Voice", icon: Phone },
  { id: "rooms", label: "Rooms", icon: BedDouble },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

export function CommandBar({
  active,
  onNavigate,
  onLogout,
  serverOnline = true,
  userInitial = "U",
}: CommandBarProps) {
  return (
    <>
      {/* Desktop Command Bar — top */}
      <motion.header
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center px-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="w-full max-w-[1400px] mx-auto flex items-center gap-3 px-4 py-2 rounded-2xl bg-[var(--panel-bg)] backdrop-blur-[60px] saturate-150 border border-edge">
          {/* AI Status */}
          <div className="flex items-center gap-3 pr-4 border-r border-edge">
            <div className="relative">
              <AIOrb size="sm" state={serverOnline ? "active" : "idle"} />
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold text-fg tracking-tight">
                AI Receptionist
              </p>
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    serverOnline ? "bg-[var(--dot-success)]" : "bg-[var(--dot-danger)]"
                  )}
                />
                <span className="text-[10px] text-fg-faint font-medium">
                  {serverOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => {
              const isActive = active === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                    isActive
                      ? "text-fg"
                      : "text-fg-faint hover:text-fg-muted"
                  )}
                >
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-[var(--glass-bg-hover)] border border-edge-2"
                        layoutId="nav-active"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </AnimatePresence>
                  <Icon
                    className={cn(
                      "w-4 h-4 relative z-10 transition-all duration-300",
                      isActive && "drop-shadow-[0_0_8px_var(--accent-glow-color)]"
                    )}
                  />
                  <span className="relative z-10 hidden lg:block">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User area */}
          <div className="flex items-center gap-2 pl-4 border-l border-edge">
            <ThemeToggle />
            <button
              onClick={onLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-faint hover:text-fg-muted hover:bg-[var(--glass-bg)] transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-bright)] flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {userInitial}
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Bottom Dock */}
      <motion.nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-around py-2.5 rounded-2xl bg-[var(--panel-bg)] backdrop-blur-[60px] saturate-150 border border-edge">
          {navItems.slice(0, 5).map((item) => {
            const isActive = active === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300",
                  isActive ? "text-fg" : "text-fg-faint"
                )}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-[var(--glass-bg-hover)]"
                    layoutId="mobile-nav-active"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10" />
                <span className="text-[9px] font-medium relative z-10 tracking-wider uppercase">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
}
