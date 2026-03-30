"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "./ui/glass-panel";
import { GlowButton } from "./ui/glow-button";
import {
  Building2,
  Bot,
  BedDouble,
  Plug,
  Users,
  CreditCard,
  Code,
  ChevronRight,
  Save,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { stagger, fadeUp } from "@/lib/animations";

type Tab = "hotel" | "ai" | "rooms" | "integrations" | "team" | "billing" | "api";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "hotel", label: "Hotel Profile", icon: Building2 },
  { id: "ai", label: "AI Configuration", icon: Bot },
  { id: "rooms", label: "Rooms", icon: BedDouble },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "api", label: "API & Webhooks", icon: Code },
];

function GlassInput({
  label,
  value,
  placeholder,
  type = "text",
  textarea = false,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-fg-faint mb-1.5 block tracking-wide">
        {label}
      </label>
      {textarea ? (
        <textarea
          defaultValue={value}
          placeholder={placeholder}
          rows={3}
          className="glass-input w-full px-4 py-3 text-sm resize-none"
        />
      ) : (
        <input
          type={type}
          defaultValue={value}
          placeholder={placeholder}
          className="glass-input w-full px-4 py-3 text-sm"
        />
      )}
    </div>
  );
}

function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-fg-muted">{label}</span>
      <button
        onClick={() => setOn(!on)}
        className={cn(
          "w-11 h-6 rounded-full transition-all duration-300 relative",
          on
            ? "bg-accent shadow-[0_0_12px_var(--accent-glow)]"
            : "bg-[var(--glass-bg-hover)]"
        )}
      >
        <motion.div
          className="w-4.5 h-4.5 rounded-full bg-white absolute top-[3px]"
          animate={{ left: on ? 22 : 3 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{ width: 18, height: 18 }}
        />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("hotel");

  return (
    <motion.div
      className="min-h-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1200px] mx-auto"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp} className="mb-6">
        <h1 className="font-display text-2xl font-bold text-fg tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-fg-faint mt-1">
          Configure your AI receptionist and hotel profile
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sidebar tabs */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <GlassPanel noPadding className="p-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 relative",
                    isActive
                      ? "text-fg bg-[var(--glass-bg)]"
                      : "text-fg-faint hover:text-fg-muted hover:bg-[var(--glass-bg)]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                  {!isActive && (
                    <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-50" />
                  )}
                </button>
              );
            })}
          </GlassPanel>
        </motion.div>

        {/* Content */}
        <motion.div variants={fadeUp} className="lg:col-span-9">
          <GlassPanel>
            {activeTab === "hotel" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-fg mb-1">
                    Hotel Profile
                  </h2>
                  <p className="text-xs text-fg-faint">
                    Information the AI tells callers about your hotel
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <GlassInput label="Hotel Name" value="Grand Azure Hotel" />
                  <GlassInput label="Phone Number" value="+1 (555) 000-0100" />
                  <GlassInput label="Address" value="123 Ocean Drive, Miami Beach, FL" />
                  <GlassInput label="Website" value="grandazure.com" />
                </div>
                <GlassInput
                  label="Description"
                  textarea
                  value="A luxury boutique hotel in Miami Beach offering stunning ocean views, world-class dining, and personalized AI-powered guest services."
                />
                <GlassInput
                  label="Check-in / Check-out Times"
                  value="Check-in: 3:00 PM / Check-out: 11:00 AM"
                />
                <div className="pt-4 border-t border-edge">
                  <GlowButton variant="primary" size="md">
                    <Save className="w-4 h-4" /> Save Changes
                  </GlowButton>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-fg mb-1">
                    AI Configuration
                  </h2>
                  <p className="text-xs text-fg-faint">
                    Customize how your AI receptionist behaves
                  </p>
                </div>
                <GlassInput label="AI Name" value="Azure AI" />
                <GlassInput
                  label="Greeting Message"
                  textarea
                  value="Hello! Thank you for calling the Grand Azure Hotel. How can I help you today?"
                />
                <GlassInput
                  label="Personality / Tone"
                  value="Professional, warm, and helpful — like a luxury concierge"
                />
                <div>
                  <label className="text-xs font-medium text-fg-faint mb-1.5 block tracking-wide">
                    Voice Selection
                  </label>
                  <div className="flex items-center gap-3">
                    <select className="glass-input px-4 py-3 text-sm flex-1 appearance-none">
                      <option>Sarah (Female, American)</option>
                      <option>James (Male, British)</option>
                      <option>Aiko (Female, Neutral)</option>
                    </select>
                    <button className="glass-input px-4 py-3 text-sm flex items-center gap-2 text-fg-muted hover:text-fg transition-colors">
                      <Volume2 className="w-4 h-4" /> Preview
                    </button>
                  </div>
                </div>
                <Toggle label="Auto-answer incoming calls" defaultOn />
                <Toggle label="Send follow-up SMS after booking" defaultOn />
                <Toggle label="Enable call recording" />
                <div className="pt-4 border-t border-edge">
                  <GlowButton variant="primary" size="md">
                    <Save className="w-4 h-4" /> Save Changes
                  </GlowButton>
                </div>
              </div>
            )}

            {activeTab === "rooms" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-fg mb-1">
                      Room Management
                    </h2>
                    <p className="text-xs text-fg-faint">
                      Add, edit, or remove rooms
                    </p>
                  </div>
                  <GlowButton variant="primary" size="sm">
                    + Add Room
                  </GlowButton>
                </div>
                {[
                  { name: "Deluxe Suite 201", type: "Deluxe", price: "$159" },
                  { name: "Deluxe Suite 202", type: "Deluxe", price: "$179" },
                  { name: "Presidential Suite", type: "Presidential", price: "$349" },
                  { name: "Standard Room 101", type: "Standard", price: "$89" },
                  { name: "Standard Room 102", type: "Standard", price: "$89" },
                ].map((room) => (
                  <div
                    key={room.name}
                    className="flex items-center justify-between p-4 rounded-xl bg-[var(--glass-bg)] border border-edge hover:bg-[var(--glass-bg-hover)] transition-all"
                  >
                    <div>
                      <p className="text-sm font-semibold text-fg">
                        {room.name}
                      </p>
                      <p className="text-xs text-fg-faint mt-0.5">
                        {room.type} &middot; {room.price}/night
                      </p>
                    </div>
                    <GlowButton variant="ghost" size="sm">
                      Edit
                    </GlowButton>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "integrations" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-fg mb-1">
                    Integrations
                  </h2>
                  <p className="text-xs text-fg-faint">
                    Connected services and APIs
                  </p>
                </div>
                {[
                  { name: "Vapi", desc: "Voice AI platform for phone calls", connected: true },
                  { name: "Supabase", desc: "Database and authentication", connected: true },
                  { name: "11Labs", desc: "AI voice synthesis", connected: true },
                  { name: "Deepgram", desc: "Speech-to-text transcription", connected: true },
                  { name: "Stripe", desc: "Payment processing", connected: false },
                  { name: "Google Calendar", desc: "Calendar sync", connected: false },
                ].map((int) => (
                  <div
                    key={int.name}
                    className="flex items-center justify-between p-4 rounded-xl bg-[var(--glass-bg)] border border-edge"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          int.connected ? "bg-success" : "bg-[var(--glass-bg-hover)]"
                        )}
                      />
                      <div>
                        <p className="text-sm font-semibold text-fg">
                          {int.name}
                        </p>
                        <p className="text-xs text-fg-faint">{int.desc}</p>
                      </div>
                    </div>
                    <GlowButton
                      variant={int.connected ? "ghost" : "secondary"}
                      size="sm"
                    >
                      {int.connected ? "Configure" : "Connect"}
                    </GlowButton>
                  </div>
                ))}
              </div>
            )}

            {(activeTab === "team" ||
              activeTab === "billing" ||
              activeTab === "api") && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--glass-bg)] border border-edge flex items-center justify-center mb-4">
                  {activeTab === "team" && <Users className="w-7 h-7 text-fg-faint" />}
                  {activeTab === "billing" && <CreditCard className="w-7 h-7 text-fg-faint" />}
                  {activeTab === "api" && <Code className="w-7 h-7 text-fg-faint" />}
                </div>
                <h3 className="font-display text-lg font-semibold text-fg-muted mb-2">
                  Coming Soon
                </h3>
                <p className="text-sm text-fg-faint max-w-sm">
                  This section is under development and will be available in a
                  future update.
                </p>
              </div>
            )}
          </GlassPanel>
        </motion.div>
      </div>

      <div className="pb-20" />
    </motion.div>
  );
}
