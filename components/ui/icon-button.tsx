"use client";

import { motion } from "framer-motion";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/motion";
import { useHaptics } from "@/hooks/use-haptics";

export interface IconButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" | "onTransitionEnd"
  > {
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "glass" | "ghost" | "solid" | "outline";
  haptic?: boolean;
}

const sizes = {
  sm: "h-9 w-9 min-h-9 min-w-9 rounded-lg",
  md: "h-11 w-11 min-h-11 min-w-11 rounded-xl",
  lg: "h-12 w-12 min-h-12 min-w-12 rounded-2xl",
} as const;

const variants = {
  glass: "glass-subtle text-ink hover:bg-white/10",
  ghost: "text-muted hover:bg-white/10 hover:text-ink",
  solid: "bg-ink text-surface hover:opacity-90",
  outline: "border border-line/20 text-ink hover:bg-white/10",
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, label, size = "md", variant = "glass", haptic = true, onClick, children, ...props },
  ref,
) {
  const vibrate = useHaptics();
  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      whileHover={{ y: -1 }}
      transition={springs.snappy}
      className={cn(
        "pressable inline-flex shrink-0 items-center justify-center",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        sizes[size],
        variants[variant],
        className,
      )}
      onClick={(event) => {
        if (haptic) vibrate(6);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
});
