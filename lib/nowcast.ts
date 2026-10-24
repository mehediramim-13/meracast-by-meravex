import type { MinutelyPoint } from "@/types/weather";
import { nowLocalIso } from "@/lib/format";

export type NowcastState = "dry" | "starting" | "raining" | "stopping";

export interface NowcastSeriesPoint {
  time: string;
  minutes: number;
  precipitation: number;
  probability: number;
  intensity: "dry" | "light" | "moderate" | "heavy";
}

export interface NowcastOutlook {
  state: NowcastState;
  minutes: number | null;
  maxProbability: number;
  maxIntensity: NowcastSeriesPoint["intensity"];
  headlineKey: "rainStartingIn" | "rainStoppingIn" | "rainContinuing" | "rainEndingSoon" | "noRainSoon";
  bodyKey: "nowcastDryBody" | "nowcastRainBody" | "nowcastHeavyBody";
  series: NowcastSeriesPoint[];
  windowMinutes: number;
}

function intensityOf(precipitation: number): NowcastSeriesPoint["intensity"] {
  if (precipitation < 0.05) return "dry";
  if (precipitation < 0.4) return "light";
  if (precipitation < 1.5) return "moderate";
  return "heavy";
}

/**
 * Computes a human "rain starts / stops" outlook from 15-minute data.
 * Requires two consecutive wet/dry frames before switching state to avoid
 * flip-flopping on model noise.
 */
export function computeNowcast(
  minutely: MinutelyPoint[],
  utcOffsetSeconds: number,
  nowIso: string = nowLocalIso(utcOffsetSeconds),
): NowcastOutlook {
  const relevant = minutely.filter((point) => point.time >= `${nowIso.slice(0, 15)}`).slice(0, 16);
  const fallback = minutely.slice(0, 16);
  const points = relevant.length >= 2 ? relevant : fallback;
  const series: NowcastSeriesPoint[] = points.map((point, index) => ({
    time: point.time,
    minutes: index * 15,
    precipitation: point.precipitation,
    probability: point.precipitationProbability,
    intensity: intensityOf(point.precipitation),
  })).slice(0, 8);

  if (!series.length) {
    return {
      state: "dry",
      minutes: null,
      maxProbability: 0,
      maxIntensity: "dry",
      headlineKey: "noRainSoon",
      bodyKey: "nowcastDryBody",
      series: [],
      windowMinutes: 120,
    };
  }

  const maxProbability = Math.max(...series.map((point) => point.probability), 0);
  const maxPrecipitation = Math.max(...series.map((point) => point.precipitation), 0);
  const maxIntensity = intensityOf(maxPrecipitation);
  const wet = series.map((point) => point.precipitation >= 0.05);

  const firstWet = wet.findIndex((value) => value);
  const isRainingNow = wet.slice(0, 2).every(Boolean);

  if (isRainingNow) {
    let stopIndex = -1;
    for (let index = 1; index < wet.length - 1; index += 1) {
      if (!wet[index] && !wet[index + 1]) {
        stopIndex = index;
        break;
      }
    }
    if (stopIndex >= 0) {
      return {
        state: "stopping",
        minutes: stopIndex * 15,
        maxProbability,
        maxIntensity,
        headlineKey: "rainStoppingIn",
        bodyKey: maxIntensity === "heavy" ? "nowcastHeavyBody" : "nowcastRainBody",
        series,
        windowMinutes: 120,
      };
    }
    return {
      state: "raining",
      minutes: null,
      maxProbability,
      maxIntensity,
      headlineKey: "rainContinuing",
      bodyKey: maxIntensity === "heavy" ? "nowcastHeavyBody" : "nowcastRainBody",
      series,
      windowMinutes: 120,
    };
  }

  if (firstWet >= 0) {
    let sustained = false;
    for (let index = firstWet; index < wet.length - 1; index += 1) {
      if (wet[index] && wet[index + 1]) {
        sustained = true;
        break;
      }
    }
    if (sustained) {
      return {
        state: "starting",
        minutes: firstWet * 15,
        maxProbability,
        maxIntensity,
        headlineKey: "rainStartingIn",
        bodyKey: maxIntensity === "heavy" ? "nowcastHeavyBody" : "nowcastRainBody",
        series,
        windowMinutes: 120,
      };
    }
  }

  return {
    state: "dry",
    minutes: null,
    maxProbability,
    maxIntensity: "dry",
    headlineKey: "noRainSoon",
    bodyKey: "nowcastDryBody",
    series,
    windowMinutes: 120,
  };
}

export function nowcastWindowTotal(series: NowcastSeriesPoint[]): number {
  return series.reduce((sum, point) => sum + point.precipitation, 0);
}

export function nowcastDryWindow(series: NowcastSeriesPoint[]): { start: string; end: string } | null {
  const dry = series.filter((point) => point.precipitation < 0.05 && point.probability < 60);
  if (!dry.length) return null;
  const first = dry[0];
  const last = dry[dry.length - 1];
  if (!first || !last) return null;
  return { start: first.time, end: last.time };
}
