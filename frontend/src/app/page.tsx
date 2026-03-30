"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen relative">
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="relative">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7C5CFC]/30 border-t-[#7C5CFC]" />
          <div className="absolute inset-0 rounded-full bg-[#7C5CFC]/10 blur-xl animate-breathe" />
        </div>
        <p className="text-white/30 text-sm animate-fade-in font-medium tracking-wide">
          Loading...
        </p>
      </div>
    </div>
  );
}
