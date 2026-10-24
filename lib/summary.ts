import type { TranslationKey } from "@/i18n/en";
import { splitLocalIso } from "@/lib/format";
import { getCondition } from "@/lib/weather-codes";
import {
  getCurrentHourly,
  getDailyFromToday,
  getTodayDaily,
  getUpcomingHourly,
  getYesterdayDaily,
} from "@/lib/weather";
import type { WeatherData } from "@/types/weather";

export type SummaryIcon = "rain" | "temperature" | "wind" | "uv" | "tomorrow" | "comfort" | "dry";

export interface SummaryLine {
  key: TranslationKey;
  vars?: Record<string, string | number>;
  icon: SummaryIcon;
  tone: "info" | "warm" | "cool" | "caution";
}

export interface SmartSummary {
  greetingKey: "summaryMorning" | "summaryAfternoon" | "summaryEvening" | "summaryNight";
  conditionKey: TranslationKey;
  headline: string;
  deltaC: number | null;
  lines: SummaryLine[];
  umbrella: boolean;
  dryWindow: { start: string; end: string } | null;
}

function greetingFor(hour: number): SmartSummary["greetingKey"] {
  if (hour < 5) return "summaryNight";
  if (hour < 12) return "summaryMorning";
  if (hour < 17) return "summaryAfternoon";
  if (hour < 21) return "summaryEvening";
  return "summaryNight";
}

function dryWindowOf(weather: WeatherData): { start: string; end: string } | null {
  const hours = getUpcomingHourly(weather, 12);
  let startIndex = -1;
  let run = 0;
  for (let index = 0; index < hours.length; index += 1) {
    const hour = hours[index];
    if (!hour) continue;
    const dry = hour.precipitationProbability < 25 && hour.precipitation < 0.05;
    if (dry) {
      if (startIndex < 0) startIndex = index;
      run += 1;
      if (run >= 3) {
        const start = hours[startIndex];
        if (!start) return null;
        return { start: start.time, end: hour.time };
      }
    } else {
      startIndex = -1;
      run = 0;
    }
  }
  return null;
}

export function buildSmartSummary(weather: WeatherData): SmartSummary {
  const now = splitLocalIso(weather.current.time);
  const hour = now?.hour ?? 12;
  const condition = getCondition(weather.current.conditionCode);
  const next12 = getUpcomingHourly(weather, 12);
  const today = getTodayDaily(weather);
  const yesterday = getYesterdayDaily(weather);
  const days = getDailyFromToday(weather, 2);
  const tomorrow = days[1] ?? days[0] ?? null;
  const current = getCurrentHourly(weather) ?? weather.hourly[0] ?? null;

  const maxRainChance = next12.length
    ? Math.max(...next12.map((point) => point.precipitationProbability))
    : weather.current.precipitation > 0
      ? 100
      : 0;
  const rainTotal = next12.reduce((total, point) => total + point.precipitation, 0);
  const umbrella = maxRainChance >= 45 || rainTotal >= 0.6;

  const peakWind = next12.reduce<typeof current>(
    (peak, point) => (peak === null || point.windSpeed > peak.windSpeed ? point : peak),
    current ?? next12[0] ?? null,
  );
  const uvMax = today?.uvIndexMax ?? null;
  const deltaC =
    yesterday && today ? Math.round((today.temperatureMax - yesterday.temperatureMax) * 10) / 10 : null;
  const dryWindow = dryWindowOf(weather);

  const lines: SummaryLine[] = [];

  lines.push({
    key: umbrella ? "umbrellaAdvice" : "noUmbrellaAdvice",
    icon: "rain",
    tone: umbrella ? "caution" : "info",
  });

  if (deltaC !== null && Math.abs(deltaC) >= 0.8) {
    const degrees = `${Math.abs(deltaC).toFixed(deltaC % 1 === 0 ? 0 : 1)}°`;
    lines.push({
      key: deltaC > 0 ? "warmerThanYesterday" : "coolerThanYesterday",
      vars: { degrees },
      icon: "temperature",
      tone: deltaC > 0 ? "warm" : "cool",
    });
  } else {
    lines.push({ key: "sameAsYesterday", icon: "temperature", tone: "info" });
  }

  if (peakWind && peakWind.windSpeed >= 30) {
    lines.push({
      key: "windNote",
      vars: { time: peakWind.time },
      icon: "wind",
      tone: "caution",
    });
  } else if (uvMax !== null && uvMax >= 6) {
    lines.push({
      key: "uvNote",
      vars: { value: Math.round(uvMax) },
      icon: "uv",
      tone: "warm",
    });
  } else if (weather.current.humidity >= 82 && weather.current.temperature >= 28) {
    lines.push({ key: "comfortNote", icon: "comfort", tone: "info" });
  } else if (dryWindow) {
    lines.push({
      key: "drySpellNote",
      vars: { start: dryWindow.start, end: dryWindow.end },
      icon: "dry",
      tone: "info",
    });
  } else if (tomorrow) {
    lines.push({
      key: "tomorrowNote",
      vars: {
        condition: getCondition(tomorrow.conditionCode).labelKey,
        high: Math.round(tomorrow.temperatureMax),
        low: Math.round(tomorrow.temperatureMin),
      },
      icon: "tomorrow",
      tone: "info",
    });
  }

  const headline = condition.labelKey;

  return {
    greetingKey: greetingFor(hour),
    conditionKey: headline,
    headline,
    deltaC,
    lines: lines.slice(0, 3),
    umbrella,
    dryWindow,
  };
}
