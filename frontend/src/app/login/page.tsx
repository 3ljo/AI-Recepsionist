"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Sparkles, Shield, Zap, ArrowRight } from "lucide-react";
import { AIOrb } from "@/components/ui/ai-orb";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3.5 mb-12">
              <AIOrb size="sm" state="active" />
              <div>
                <h1 className="font-display text-xl font-bold text-fg tracking-tight">
                  AI Receptionist
                </h1>
                <p className="text-xs text-fg-faint font-medium tracking-wider uppercase">
                  Command Interface
                </p>
              </div>
            </div>

            <h2 className="font-display text-4xl xl:text-5xl font-bold text-fg mb-5 leading-[1.1] tracking-tight">
              Your intelligent
              <br />
              <span className="gradient-text-vivid">front desk</span>
            </h2>
            <p className="text-fg-faint text-lg mb-16 max-w-md leading-relaxed">
              AI-powered phone receptionist that handles bookings, answers
              questions, and never takes a day off.
            </p>
          </motion.div>

          <div className="space-y-3">
            {[
              { icon: <Sparkles className="w-5 h-5" />, title: "Natural Conversations", desc: "Sounds like a real receptionist" },
              { icon: <Zap className="w-5 h-5" />, title: "Instant Bookings", desc: "Checks availability and books in seconds" },
              { icon: <Shield className="w-5 h-5" />, title: "24/7 Coverage", desc: "Never miss a call, day or night" },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="flex items-start gap-4 p-4 rounded-2xl hover:bg-[var(--glass-bg)] transition-all duration-300 group border border-transparent hover:border-edge"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              >
                <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center text-accent-bright shrink-0 group-hover:shadow-[0_0_20px_var(--accent-glow)] transition-all duration-300">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-fg font-medium tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-fg-faint text-sm mt-0.5">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative z-10">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <AIOrb size="sm" state="active" />
            <div>
              <h1 className="font-display text-xl font-bold text-fg tracking-tight">
                AI Receptionist
              </h1>
              <p className="text-xs text-fg-faint font-medium tracking-wider uppercase">
                Command Interface
              </p>
            </div>
          </div>

          <div className="glass-panel p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="font-display text-xl font-bold text-fg tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-fg-faint mt-1">
                Sign in to your command interface
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <motion.div
                  className="p-3.5 rounded-xl bg-danger/10 border border-danger/15 text-danger text-sm flex items-center gap-2"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                  {error}
                </motion.div>
              )}

              <div>
                <label className="text-xs font-medium text-fg-faint mb-1.5 block tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass-input w-full px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-fg-faint mb-1.5 block tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="glass-input w-full px-4 py-3 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glow-button w-full py-3.5 text-sm flex items-center justify-center gap-2 mt-3 disabled:opacity-40"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="flex items-center justify-center gap-2 mt-8">
            <div className="w-1.5 h-1.5 rounded-full bg-accent/30" />
            <p className="text-[11px] text-fg-faint font-medium tracking-widest uppercase">
              AI Receptionist Platform
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
