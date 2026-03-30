"use client";

import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-fg-faint hover:text-fg-muted hover:bg-[var(--glass-bg)] transition-all duration-300 border border-transparent hover:border-edge"
      whileTap={{ scale: 0.9 }}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </motion.button>
  );
}
