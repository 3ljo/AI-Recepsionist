"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles, Shield, Zap, ArrowRight } from "lucide-react";

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
      {/* Animated gradient background */}
      <div className="absolute inset-0 animate-gradient" />

      {/* Floating orbs */}
      <div className="absolute top-[15%] left-[10%] w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-[20%] right-[15%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float-delayed"
      />
      <div
        className="absolute top-[60%] left-[50%] w-64 h-64 bg-purple-500/8 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "2s" }}
      />

      {/* Theme toggle */}
      <div className="absolute top-5 right-5 z-50">
        <ThemeToggle />
      </div>

      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16">
          <div className="animate-slide-up">
            <div className="flex items-center gap-3 mb-10">
              <img src="/logo.png" alt="AI Receptionist" className="w-12 h-12 rounded-2xl object-cover shadow-lg shadow-blue-500/30" />
              <h1 className="text-2xl font-bold text-on-surface">
                AI Receptionist
              </h1>
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold text-on-surface mb-5 leading-tight">
              Your intelligent
              <br />
              <span className="gradient-text">front desk</span>
            </h2>
            <p className="text-on-surface-2 text-lg mb-14 max-w-md leading-relaxed">
              AI-powered phone receptionist that handles bookings, answers
              questions, and never takes a day off.
            </p>
          </div>

          <div className="space-y-5">
            <Feature
              icon={<Sparkles className="w-5 h-5" />}
              title="Natural Conversations"
              description="Sounds like a real receptionist, not a robot"
              delay="0.1s"
            />
            <Feature
              icon={<Zap className="w-5 h-5" />}
              title="Instant Bookings"
              description="Checks availability and books in seconds"
              delay="0.2s"
            />
            <Feature
              icon={<Shield className="w-5 h-5" />}
              title="24/7 Coverage"
              description="Never miss a call, day or night"
              delay="0.3s"
            />
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative z-10">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/logo.png" alt="AI Receptionist" className="w-11 h-11 rounded-2xl object-cover shadow-lg shadow-blue-500/30" />
            <div>
              <h1 className="text-xl font-bold text-on-surface">
                AI Receptionist
              </h1>
              <p className="text-xs text-on-surface-3">
                Your intelligent front desk
              </p>
            </div>
          </div>

          <Card className="glass border-edge">
            <CardHeader>
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-slide-up">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface-2">
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-on-surface-3 mt-6">
            AI Receptionist Platform
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 hover:bg-surface-2/50 hover:scale-[1.02] group animate-slide-up"
      style={{ animationDelay: delay }}
    >
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 group-hover:shadow-lg group-hover:shadow-blue-500/10 transition-all duration-300">
        {icon}
      </div>
      <div>
        <h3 className="text-on-surface font-medium">{title}</h3>
        <p className="text-on-surface-3 text-sm">{description}</p>
      </div>
    </div>
  );
}
