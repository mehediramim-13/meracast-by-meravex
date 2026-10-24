import type { Transition, Variants } from "framer-motion";

/**
 * MeraCast motion tokens.
 * Every animation in the product should reference one of these springs,
 * durations or variants so the app feels choreographed rather than assembled.
 */
export const springs = {
  instant: { type: "spring", stiffness: 900, damping: 46, mass: 0.4 },
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
  soft: { type: "spring", stiffness: 220, damping: 28, mass: 0.9 },
  bouncy: { type: "spring", stiffness: 420, damping: 22, mass: 0.8 },
  sheet: { type: "spring", stiffness: 280, damping: 30, mass: 0.9 },
  layout: { type: "spring", stiffness: 340, damping: 34, mass: 0.85 },
  slow: { type: "spring", stiffness: 90, damping: 22, mass: 1 },
} satisfies Record<string, Transition>;

export const durations = {
  micro: 0.12,
  fast: 0.2,
  base: 0.36,
  slow: 0.6,
  cinematic: 1.1,
} as const;

export const easings = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  soft: [0.25, 0.46, 0.45, 0.94],
} as const;

export const press = {
  scale: 0.96,
  tap: { scale: 0.96 },
  hover: { y: -2 },
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: springs.soft },
  exit: { opacity: 0, y: 10, transition: { duration: durations.fast } },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: durations.base } },
  exit: { opacity: 0, transition: { duration: durations.fast } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: springs.bouncy },
  exit: { opacity: 0, scale: 0.96, transition: { duration: durations.fast } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.05 },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: springs.soft },
  exit: { opacity: 0, x: -12, transition: { duration: durations.fast } },
};

export const sheetVariants: Variants = {
  hidden: { y: "100%", opacity: 0.6 },
  show: { y: 0, opacity: 1, transition: springs.sheet },
  exit: { y: "100%", opacity: 0.5, transition: { duration: durations.fast } },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: springs.snappy },
  exit: { opacity: 0, scale: 0.98, y: 6, transition: { duration: durations.fast } },
};

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: springs.soft },
  exit: { opacity: 0, y: -6, transition: { duration: durations.fast } },
};

export const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.01 } },
  exit: { opacity: 0, transition: { duration: 0.01 } },
};

export const springOrReduced = (reduce: boolean): Transition =>
  reduce ? { duration: 0.01 } : springs.snappy;
