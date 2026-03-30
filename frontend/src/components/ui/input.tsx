"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn("glass-input w-full px-4 py-3 text-sm", className)}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
