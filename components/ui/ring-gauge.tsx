"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface RingGaugeProps {
  value: number;
  max?: number;
  valueLabel: string;
  label?: string;
  ariaLabel?: string;
  language?: "en" | "bn";
  size?: number;
  toneClassName?: string;
  strokeColor?: string;
  className?: string;
  wrapLabel?: boolean;
  labelTransform?: "none" | "uppercase";
  labelLetterSpacing?: number;
  /** Multiplier for the in-ring label only; lets long AQI categories fit. */
  labelScale?: number;
}

const MIN_SIZE = 104;
const STROKE_RATIO = 0.065;
const PADDING_MIN = 12;
const PADDING_MAX = 16;
const PADDING_RATIO = 0.12;
const VALUE_RATIO = 0.22;
const LABEL_RATIO = 0.11;
const LABEL_MIN = 11;
const GAP_MIN = 2;
const GAP_MAX = 4;
const GAP_RATIO = 0.03;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Shared ring gauge for confidence and air-quality values.
 *
 * The type inside the ring is sized from the diameter, not from Tailwind's
 * global type scale. That keeps the number and label clear of the stroke at
 * every breakpoint and lets long category labels wrap inside the ring.
 */
export function RingGauge({
  value,
  max = 100,
  valueLabel,
  label,
  ariaLabel,
  language = "en",
  size = 124,
  toneClassName = "text-aurora",
  strokeColor,
  className,
  wrapLabel = false,
  labelTransform = "none",
  labelLetterSpacing = 0,
  labelScale = 1,
}: RingGaugeProps) {
  const reduceMotion = useReducedMotion();
  const diameter = Math.max(MIN_SIZE, size);
  const safeMax = max > 0 ? max : 100;
  const strokeWidth = diameter * STROKE_RATIO;
  const padding = clamp(diameter * PADDING_RATIO, PADDING_MIN, PADDING_MAX);
  const valueSize = diameter * VALUE_RATIO;
  const labelSize = Math.max(LABEL_MIN, diameter * LABEL_RATIO * labelScale);
  const labelGap = clamp(diameter * GAP_RATIO, GAP_MIN, GAP_MAX);
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = clamp(value / safeMax, 0, 1);
  const offset = circumference * (1 - progress);
  const bangla = language === "bn";
  const bengaliDigits = /[\u09e6-\u09ef]/.test(valueLabel);
  const contentInset = strokeWidth + padding;
  const accessibleName = ariaLabel ?? (label ? `${valueLabel} ${label}` : valueLabel);
  const lineHeight = wrapLabel ? (bangla ? 1.3 : 1.15) : bangla ? 1.5 : 1.15;

  return (
    <div
      role="img"
      aria-label={accessibleName}
      data-ring-gauge
      data-size={diameter}
      data-value={progress * 100}
      className={cn("relative shrink-0", className)}
      style={{ width: diameter, height: diameter }}
    >
      <svg
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="h-full w-full -rotate-90 overflow-visible"
        aria-hidden="true"
      >
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-line/15"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={strokeColor ?? "currentColor"}
          className={strokeColor ? undefined : toneClassName}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduceMotion ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        style={{ padding: contentInset }}
      >
        <span
          className={cn(
            "block font-bold tabular text-ink",
            bengaliDigits ? "font-bengali" : "font-heading",
          )}
          style={{ fontSize: valueSize, lineHeight: 1.1, whiteSpace: "nowrap" }}
        >
          {valueLabel}
        </span>
        {label ? (
          <span
            className={cn("block font-medium text-muted", bangla ? "font-bengali" : "font-heading")}
            style={{
              fontSize: labelSize,
              lineHeight,
              marginTop: labelGap,
              whiteSpace: wrapLabel ? "normal" : "nowrap",
              textTransform: labelTransform,
              letterSpacing: `${labelLetterSpacing}em`,
              maxWidth: "100%",
              textWrap: "balance",
              overflowWrap: "break-word",
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
