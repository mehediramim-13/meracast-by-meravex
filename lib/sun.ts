import * as SunCalc from "suncalc";
import type { TranslationKey } from "@/i18n/en";
import { epochToLocalIso, localIsoToEpoch, splitLocalIso } from "@/lib/format";
import type { WeatherData } from "@/types/weather";

export interface MoonPhaseInfo {
  fraction: number;
  phase: number;
  ageDays: number;
  phaseKey: TranslationKey;
  illuminationPercent: number;
}

export interface SkyTimes {
  sunrise: string | null;
  sunset: string | null;
  solarNoon: string | null;
  goldenMorningStart: string | null;
  goldenMorningEnd: string | null;
  goldenEveningStart: string | null;
  goldenEveningEnd: string | null;
  blueMorningStart: string | null;
  blueMorningEnd: string | null;
  blueEveningStart: string | null;
  blueEveningEnd: string | null;
  moonrise: string | null;
  moonset: string | null;
  nextFullMoon: { date: string; iso: string } | null;
  nextNewMoon: { date: string; iso: string } | null;
}

const MOON_PHASE_KEYS: Array<{ limit: number; key: TranslationKey }> = [
  { limit: 0.035, key: "moonNew" },
  { limit: 0.215, key: "moonWaxingCrescent" },
  { limit: 0.285, key: "moonFirstQuarter" },
  { limit: 0.465, key: "moonWaxingGibbous" },
  { limit: 0.535, key: "moonFull" },
  { limit: 0.715, key: "moonWaningGibbous" },
  { limit: 0.785, key: "moonLastQuarter" },
  { limit: 0.965, key: "moonWaningCrescent" },
  { limit: 1.001, key: "moonNew" },
];

export function moonPhaseInfo(date: Date | number = Date.now()): MoonPhaseInfo {
  const at = typeof date === "number" ? new Date(date) : date;
  const illumination = SunCalc.getMoonIllumination(at);
  const phase = illumination.phase;
  const phaseKey = MOON_PHASE_KEYS.find((entry) => phase < entry.limit)?.key ?? "moonWaxingCrescent";
  return {
    fraction: illumination.fraction,
    phase,
    ageDays: phase * 29.530588,
    phaseKey,
    illuminationPercent: Math.round(illumination.fraction * 100),
  };
}

function localIso(epochMs: number | undefined, utcOffsetSeconds: number): string | null {
  if (epochMs === undefined || !Number.isFinite(epochMs)) return null;
  return epochToLocalIso(epochMs, utcOffsetSeconds);
}

function datePartInZone(epochMs: number, utcOffsetSeconds: number): string {
  return epochToLocalIso(epochMs, utcOffsetSeconds).slice(0, 10);
}

/**
 * Finds the next crossing of a moon phase (0 = new, 0.5 = full).
 * Scans in six-hour steps for a full lunation and refines to the nearest hour.
 */
function nextMoonPhase(
  latitude: number,
  longitude: number,
  fromEpoch: number,
  target: number,
  utcOffsetSeconds: number,
): { date: string; iso: string } | null {
  const signedDistance = (phase: number): number => ((phase - target + 1.5) % 1) - 0.5;
  let previousEpoch = fromEpoch;
  let previousDistance = signedDistance(SunCalc.getMoonIllumination(new Date(fromEpoch)).phase);
  const step = 6 * 60 * 60 * 1000;

  for (let index = 1; index <= 140; index += 1) {
    const epoch = fromEpoch + index * step;
    const distance = signedDistance(SunCalc.getMoonIllumination(new Date(epoch)).phase);
    if (previousDistance < 0 && distance >= 0) {
      let low = previousEpoch;
      let high = epoch;
      for (let refine = 0; refine < 10; refine += 1) {
        const middle = (low + high) / 2;
        const middleDistance = signedDistance(
          SunCalc.getMoonIllumination(new Date(middle)).phase,
        );
        if (middleDistance < 0) low = middle;
        else high = middle;
      }
      const found = Math.round((low + high) / 2);
      const iso = epochToLocalIso(found, utcOffsetSeconds);
      return { date: datePartInZone(found, utcOffsetSeconds), iso };
    }
    previousEpoch = epoch;
    previousDistance = distance;
  }
  return null;
}

export function getSkyTimes(weather: WeatherData): SkyTimes {
  const { latitude, longitude, utcOffsetSeconds } = weather.meta;
  const today = weather.daily.find((day) => day.date === weather.current.time.slice(0, 10));
  const parsed = splitLocalIso(weather.current.time);
  const localDate = parsed?.date ?? weather.current.time.slice(0, 10);
  const noonEpoch = localIsoToEpoch(`${localDate}T12:00`, utcOffsetSeconds);
  const times = SunCalc.getTimes(new Date(noonEpoch), latitude, longitude);
  const moonTimes = SunCalc.getMoonTimes(new Date(noonEpoch), latitude, longitude);
  const nowEpoch = localIsoToEpoch(weather.current.time, utcOffsetSeconds);
  const currentHour = weather.current.time;

  return {
    sunrise: today?.sunrise ?? localIso(times.sunrise.getTime(), utcOffsetSeconds),
    sunset: today?.sunset ?? localIso(times.sunset.getTime(), utcOffsetSeconds),
    solarNoon: localIso(times.solarNoon.getTime(), utcOffsetSeconds),
    goldenMorningStart: localIso(times.dawn.getTime(), utcOffsetSeconds),
    goldenMorningEnd: localIso(times.goldenHourEnd.getTime(), utcOffsetSeconds),
    goldenEveningStart: localIso(times.goldenHour.getTime(), utcOffsetSeconds),
    goldenEveningEnd: localIso(times.dusk.getTime(), utcOffsetSeconds),
    blueMorningStart: localIso(times.nightEnd.getTime(), utcOffsetSeconds),
    blueMorningEnd: localIso(times.nauticalDawn.getTime(), utcOffsetSeconds),
    blueEveningStart: localIso(times.nauticalDusk.getTime(), utcOffsetSeconds),
    blueEveningEnd: localIso(times.night.getTime(), utcOffsetSeconds),
    moonrise:
      !moonTimes.alwaysUp && !moonTimes.alwaysDown
        ? localIso(moonTimes.rise?.getTime(), utcOffsetSeconds)
        : null,
    moonset:
      !moonTimes.alwaysUp && !moonTimes.alwaysDown
        ? localIso(moonTimes.set?.getTime(), utcOffsetSeconds)
        : null,
    nextFullMoon: nextMoonPhase(latitude, longitude, nowEpoch, 0.5, utcOffsetSeconds),
    nextNewMoon: nextMoonPhase(latitude, longitude, nowEpoch, 0, utcOffsetSeconds),
  };
}

export interface StargazingOutlook {
  score: number;
  cloudCover: number;
  moonPercent: number;
  moonPhaseKey: TranslationKey;
  ratingKey: "stargazingExcellent" | "stargazingGood" | "stargazingFair" | "stargazingPoor";
  visibleTonight: boolean;
}

export function getStargazing(weather: WeatherData): StargazingOutlook {
  const moon = moonPhaseInfo(
    new Date(localIsoToEpoch(weather.current.time, weather.meta.utcOffsetSeconds)),
  );
  const nightHours = weather.hourly.filter((hour) => {
    const parsed = splitLocalIso(hour.time);
    if (!parsed) return false;
    return parsed.hour >= 21 || parsed.hour <= 3;
  });
  const sample = nightHours.slice(0, 8);
  const cloudCover = sample.length
    ? sample.reduce((sum, hour) => sum + hour.cloudCover, 0) / sample.length
    : weather.current.cloudCover;
  const rainRisk = sample.length
    ? Math.max(...sample.map((hour) => hour.precipitationProbability), 0)
    : 0;
  const moonPenalty = moon.fraction * 34;
  const score = Math.max(
    0,
    Math.min(100, Math.round(100 - cloudCover * 0.58 - rainRisk * 0.16 - moonPenalty)),
  );
  const ratingKey =
    score >= 78
      ? "stargazingExcellent"
      : score >= 56
        ? "stargazingGood"
        : score >= 32
          ? "stargazingFair"
          : "stargazingPoor";
  return {
    score,
    cloudCover,
    moonPercent: moon.illuminationPercent,
    moonPhaseKey: moon.phaseKey,
    ratingKey,
    visibleTonight: score >= 52,
  };
}

export function daylightProgress(
  sunrise: string | null,
  sunset: string | null,
  nowIso: string,
): number {
  if (!sunrise || !sunset) return 0;
  const start = splitLocalIso(sunrise);
  const end = splitLocalIso(sunset);
  const now = splitLocalIso(nowIso);
  if (!start || !end || !now) return 0;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  const currentMinutes = now.hour * 60 + now.minute;
  if (endMinutes <= startMinutes) return 0;
  return Math.max(0, Math.min(1, (currentMinutes - startMinutes) / (endMinutes - startMinutes)));
}

export function nextSunEvent(
  weather: WeatherData,
  times: SkyTimes,
): { key: "nextSunset" | "nextSunrise"; time: string } {
  const now = weather.current.time.slice(0, 16);
  if (times.sunset && times.sunset >= now) {
    return { key: "nextSunset", time: times.sunset };
  }
  const tomorrow = weather.daily.find((day) => day.date > weather.current.time.slice(0, 10));
  if (tomorrow?.sunrise) return { key: "nextSunrise", time: tomorrow.sunrise };
  return { key: "nextSunrise", time: times.sunrise ?? "" };
}
