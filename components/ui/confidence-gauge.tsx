"use client";

/**
 * Backwards-compatible name for the shared ring gauge. The gauge itself lives
 * in `ring-gauge.tsx` so confidence and air quality render from one geometry.
 */
export { RingGauge, RingGauge as ConfidenceGauge } from "@/components/ui/ring-gauge";
export type { RingGaugeProps, RingGaugeProps as ConfidenceGaugeProps } from "@/components/ui/ring-gauge";
