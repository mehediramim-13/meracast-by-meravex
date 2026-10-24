"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fadeUp, springs } from "@/lib/motion";
import { useSettings } from "@/store/use-settings";

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  interactive?: boolean;
  tone?: "default" | "quiet" | "strong";
  padding?: "none" | "sm" | "md" | "lg";
}

export function GlassCard({
  children,
  className,
  interactive = false,
  tone = "default",
  padding = "md",
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={interactive ? { y: -2 } : undefined}
      whileTap={interactive ? { scale: 0.995 } : undefined}
      transition={springs.snappy}
      className={cn(
        "panel relative",
        tone === "default" && "glass",
        tone === "quiet" && "glass-subtle",
        tone === "strong" && "glass-strong",
        padding === "sm" && "p-4",
        padding === "md" && "p-5 sm:p-6",
        padding === "lg" && "p-6",
        interactive && "pressable-soft cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export const Card = GlassCard;

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
  amount?: number;
}

export function Reveal({ children, delay = 0, className, once = true, amount = 0.15 }: RevealProps) {
  const reduceSystem = useReducedMotion();
  const reduceSetting = useSettings((state) => state.reduceMotion);
  const reduce = reduceSystem || reduceSetting;

  return (
    <motion.div
      className={cn(className)}
      initial={reduce ? { opacity: 1 } : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once, amount }}
      variants={fadeUp}
      transition={{ ...springs.soft, delay }}
    >
      {children}
    </motion.div>
  );
}

interface WidgetHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function WidgetHeader({ title, subtitle, icon, action, className }: WidgetHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line/10 bg-white/5 text-aurora">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-[0.9375rem] font-bold tracking-[-0.02em] text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}
