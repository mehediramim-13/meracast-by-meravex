"use client";

import { useCallback, useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/use-environment";
import { useSettings } from "@/store/use-settings";
import type { ResolvedTheme, ThemeMode } from "@/types/settings";

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: ThemeMode): ResolvedTheme {
  if (typeof document === "undefined") return "dark";
  const resolved = theme === "system" ? systemTheme() : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#071019" : "#eaf1fb");
  }
  return resolved;
}

export function useTheme() {
  const mode = useSettings((state) => state.theme);
  const setMode = useSettings((state) => state.setTheme);
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)", true);
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    mode === "system" ? "dark" : mode,
  );

  useEffect(() => {
    setResolved(applyTheme(mode));
  }, [mode, prefersDark]);

  const cycle = useCallback(() => {
    const order: ThemeMode[] = ["light", "dark", "system"];
    const index = order.indexOf(mode);
    const next = order[(index + 1) % order.length] ?? "system";
    setMode(next);
  }, [mode, setMode]);

  return { mode, resolved, setMode, cycle };
}
