"use client";

import { motion } from "framer-motion";
import { forwardRef, useCallback, useState, type ButtonHTMLAttributes, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/motion";
import { useHaptics } from "@/hooks/use-haptics";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "solar";
export type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
  solar: "btn-solar",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[2.25rem] px-3.5 text-[0.8125rem] gap-1.5 rounded-xl",
  md: "min-h-[2.75rem] px-5 text-sm gap-2 rounded-xl",
  lg: "min-h-[3.25rem] px-6 text-[0.9375rem] gap-2.5 rounded-2xl",
  xl: "min-h-[3.5rem] px-7 text-base gap-2.5 rounded-2xl",
  icon: "h-11 w-11 min-h-11 min-w-11 rounded-xl justify-center",
};

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" | "onTransitionEnd"
  > {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "secondary",
    size = "md",
    loading = false,
    fullWidth = false,
    haptic = true,
    disabled,
    children,
    onPointerDown,
    onClick,
    ...props
  },
  ref,
) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const vibrate = useHaptics();

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(event);
      if (disabled || loading) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.9;
      const ripple: Ripple = {
        id: Date.now() + Math.random(),
        x: event.clientX - rect.left - size / 2,
        y: event.clientY - rect.top - size / 2,
        size,
      };
      setRipples((current) => [...current.slice(-2), ripple]);
      window.setTimeout(() => {
        setRipples((current) => current.filter((item) => item.id !== ripple.id));
      }, 620);
    },
    [disabled, loading, onPointerDown],
  );

  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      whileHover={disabled || loading ? undefined : { y: -1 }}
      transition={springs.snappy}
      className={cn(
        "pressable relative isolate inline-flex select-none items-center justify-center overflow-hidden font-semibold",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        loading && "cursor-wait",
        className,
      )}
      disabled={disabled || loading}
      onPointerDown={handlePointerDown}
      onClick={(event) => {
        if (haptic) vibrate(6);
        onClick?.(event);
      }}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-current opacity-20"
            style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        ))}
      </span>
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="sr-only">Loading</span>
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
});

export function buttonClasses(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    "pressable relative inline-flex select-none items-center justify-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}
