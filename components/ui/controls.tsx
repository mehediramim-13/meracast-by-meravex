"use client";

import { motion } from "framer-motion";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/motion";
import { useHaptics } from "@/hooks/use-haptics";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
  icon?: ReactNode;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  size = "md",
  fullWidth = false,
}: SegmentedProps<T>) {
  const indicatorId = useId().replace(/:/g, "");
  const vibrate = useHaptics();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = options.findIndex((option) => option.value === value);
    if (currentIndex < 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = options[(currentIndex + 1) % options.length];
      if (next) onChange(next.value);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const previous = options[(currentIndex - 1 + options.length) % options.length];
      if (previous) onChange(previous.value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-flex items-center gap-1 rounded-xl border border-line/10 bg-black/10 p-1 backdrop-blur-md dark:bg-white/5",
        fullWidth && "w-full",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <motion.button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            whileTap={{ scale: 0.97 }}
            transition={springs.snappy}
            onClick={() => {
              vibrate(5);
              onChange(option.value);
            }}
            className={cn(
              "pressable relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors",
              size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-9 px-3 text-xs",
              fullWidth && "flex-1",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`segment-${indicatorId}`}
                className="absolute inset-0 -z-10 rounded-lg border border-line/15 bg-white/10 shadow-sm"
                transition={springs.snappy}
              />
            ) : null}
            {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
            <span className="whitespace-nowrap">
              {option.shortLabel && size === "sm" ? option.shortLabel : option.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const vibrate = useHaptics();
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          vibrate(7);
          onChange(!checked);
        }}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          checked
            ? "border-aurora/50 bg-aurora/90"
            : "border-line/15 bg-black/20 dark:bg-white/10",
        )}
      >
        <motion.span
          className="absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-md"
          animate={{ x: checked ? 22 : 2 }}
          transition={springs.bouncy}
          style={{ height: "1.375rem", width: "1.375rem" }}
        />
      </button>
    </div>
  );
}
