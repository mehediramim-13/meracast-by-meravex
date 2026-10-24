"use client";

import { useCallback } from "react";
import { useSettings } from "@/store/use-settings";

type Pattern = number | number[];

export function useHaptics(): (pattern?: Pattern) => void {
  const enabled = useSettings((state) => state.haptics);
  return useCallback(
    (pattern: Pattern = 8) => {
      if (!enabled) return;
      if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
      try {
        navigator.vibrate(pattern);
      } catch {
        // Vibration can be blocked by the browser; feedback is optional.
      }
    },
    [enabled],
  );
}
