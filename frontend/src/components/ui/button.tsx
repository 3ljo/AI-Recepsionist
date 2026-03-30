"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
}

const variantStyles = {
  primary:
    "bg-gradient-to-r from-[var(--glow-btn-from)] to-[var(--glow-btn-to)] text-white border-[var(--glow-btn-border)] shadow-[0_0_20px_var(--glow-btn-shadow)] hover:shadow-[0_0_30px_var(--glow-btn-shadow)]",
  secondary:
    "bg-[var(--glass-bg)] text-fg border-edge hover:bg-[var(--glass-bg-hover)] hover:border-edge-2",
  destructive:
    "bg-danger/10 text-danger border-danger/20 hover:bg-danger/15",
  ghost:
    "bg-transparent text-fg-muted border-transparent hover:bg-[var(--glass-bg)] hover:text-fg",
  outline:
    "bg-transparent text-fg-muted border-edge hover:bg-[var(--glass-bg)] hover:border-edge-2",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2",
  icon: "w-10 h-10 rounded-xl",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold border transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
