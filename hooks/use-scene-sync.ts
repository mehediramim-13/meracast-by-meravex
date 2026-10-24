"use client";

import { useEffect } from "react";
import { getCondition, resolveScene } from "@/lib/weather-codes";
import { getTodayDaily } from "@/lib/weather";
import { splitLocalIso } from "@/lib/format";
import { useScene } from "@/store/use-scene";
import type { WeatherData } from "@/types/weather";

function localMinutes(iso: string): number | null {
  const parts = splitLocalIso(iso);
  if (!parts) return null;
  return parts.hour * 60 + parts.minute;
}

function solarPhase(weather: WeatherData): "sunrise" | "sunset" | "day" | "night" {
  if (!weather.current.isDay) return "night";
  const today = getTodayDaily(weather);
  if (!today) return weather.current.isDay ? "day" : "night";
  const current = localMinutes(weather.current.time);
  const sunrise = localMinutes(today.sunrise);
  const sunset = localMinutes(today.sunset);
  if (current === null || sunrise === null || sunset === null) return weather.current.isDay ? "day" : "night";
  if (current >= sunrise && current <= sunrise + 45) return "sunrise";
  if (current >= sunset - 45 && current <= sunset) return "sunset";
  return weather.current.isDay ? "day" : "night";
}

export function useSceneSync(weather: WeatherData | undefined, enabled = true): void {
  const setScene = useScene((state) => state.setScene);

  useEffect(() => {
    if (!weather || !enabled) return;
    const phase = solarPhase(weather);
    const kind = resolveScene(weather.current.conditionCode, weather.current.isDay, phase);
    const intensity = getCondition(weather.current.conditionCode).intensity;
    setScene(kind, intensity, weather.place.name);
  }, [weather, enabled, setScene]);
}
