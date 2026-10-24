"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/store/use-settings";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  showBrand?: boolean;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const markSizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

export function Logo({
  className,
  showWordmark = true,
  showBrand = false,
  size = "md",
  animated = true,
}: LogoProps) {
  const reduceSystem = useReducedMotion();
  const reduceSetting = useSettings((state) => state.reduceMotion);
  const reduce = reduceSystem || reduceSetting;
  const id = useId().replace(/:/g, "");
  const gradientId = `mc-grad-${id}`;
  const glowId = `mc-glow-${id}`;
  const motionEnabled = animated && !reduce;

  return (
    <span className={cn("inline-flex items-center gap-2.5 align-middle", className)}>
      <motion.span
        className={cn("relative shrink-0", markSizes[size])}
        initial={motionEnabled ? { opacity: 0, scale: 0.96 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
          role="img"
          aria-label="MeraCast"
        >
          <defs>
            <linearGradient id={gradientId} x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0B1B2B" />
              <stop offset="0.55" stopColor="#0E2A3C" />
              <stop offset="1" stopColor="#102235" />
            </linearGradient>
            <linearGradient id={glowId} x1="12" y1="16" x2="38" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7EB3B8" />
              <stop offset="1" stopColor="#7EB3B8" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="46" height="46" rx="14.5" fill={`url(#${gradientId})`} stroke="rgba(255,255,255,0.12)" />
          <path
            d="M11.5 31.5V20.4C11.5 17.2 15.3 15.9 17.5 18.4L24 25.6L30.5 18.4C32.7 15.9 36.5 17.2 36.5 20.4V31.5"
            stroke={`url(#${glowId})`}
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="36.2" r="2.3" fill="#7EB3B8" />
          <path
            d="M9.5 39.5H38.5"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </motion.span>
      {showWordmark ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              "font-heading font-bold tracking-[-0.035em]",
              size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg",
            )}
          >
            Mera
            <span className="text-aurora">Cast</span>
          </span>
          {showBrand ? (
            <span className="mt-1 text-xs font-medium text-faint">by MeraVex</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
