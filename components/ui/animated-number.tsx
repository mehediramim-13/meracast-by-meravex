"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { useSettings } from "@/store/use-settings";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  initial?: number;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  format = (input) => String(Math.round(input)),
  initial,
  className,
}: AnimatedNumberProps) {
  const reduceSystem = useReducedMotion();
  const reduceSetting = useSettings((state) => state.reduceMotion);
  const reduce = reduceSystem || reduceSetting;
  const source = useMotionValue(initial ?? value);
  const display = useTransform(source, (latest) => format(latest));
  const firstRun = useRef(true);

  useEffect(() => {
    if (reduce) {
      source.set(value);
      return;
    }
    const controls = animate(source, value, {
      ...springs.soft,
      delay: firstRun.current ? 0.1 : 0,
    });
    firstRun.current = false;
    return () => controls.stop();
  }, [value, reduce, source]);

  return (
    <motion.span className={cn("tabular inline-block", className)} aria-label={format(value)}>
      {display}
    </motion.span>
  );
}
