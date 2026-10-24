"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/motion";
import { useSettings } from "@/store/use-settings";

export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 hidden w-max max-w-[220px] rounded-lg border border-line/20 bg-[#0a1420]/95 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl backdrop-blur-md transition-[opacity,transform] duration-150 group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100 sm:block",
          side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 group-hover/tooltip:translate-y-0 group-focus-within/tooltip:translate-y-0",
          side === "bottom" && "left-1/2 top-full mt-2 -translate-x-1/2 -translate-y-1 group-hover/tooltip:translate-y-0 group-focus-within/tooltip:translate-y-0",
          side === "left" && "right-full top-1/2 mr-2 -translate-y-1/2 translate-x-1 group-hover/tooltip:translate-x-0 group-focus-within/tooltip:translate-x-0",
          side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2 -translate-x-1 group-hover/tooltip:translate-x-0 group-focus-within/tooltip:translate-x-0",
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "aurora" | "solar" | "danger" | "ice";
  className?: string;
}) {
  const tones = {
    neutral: "border-line/15 bg-white/5 text-muted",
    aurora: "border-aurora/25 bg-aurora/10 text-aurora",
    solar: "border-solar/25 bg-solar/10 text-solar",
    danger: "border-danger/25 bg-danger/10 text-danger",
    ice: "border-ice/25 bg-ice/10 text-ice",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduceSystem = useReducedMotion();
  const reduceSetting = useSettings((state) => state.reduceMotion);
  const reduce = reduceSystem || reduceSetting;
  return (
    <motion.div
      className={className}
      initial={reduce ? undefined : "hidden"}
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduceSystem = useReducedMotion();
  const reduceSetting = useSettings((state) => state.reduceMotion);
  const reduce = reduceSystem || reduceSetting;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: springs.soft },
      }}
    >
      {children}
    </motion.div>
  );
}
