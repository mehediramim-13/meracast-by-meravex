import type { DailyPoint, HourlyPoint, WeatherData } from "@/types/weather";
import { isoDateOf, nowLocalIso } from "@/lib/format";

export function todayFor(weather: WeatherData, nowIso?: string): string {
  return isoDateOf(nowIso ?? nowLocalIso(weather.meta.utcOffsetSeconds));
}

export function getTodayDaily(weather: WeatherData, todayIso?: string): DailyPoint | null {
  const today = todayIso ?? todayFor(weather);
  return weather.daily.find((day) => day.date === today) ?? weather.daily[2] ?? weather.daily[0] ?? null;
}

export function getDailyFromToday(weather: WeatherData, limit = 16): DailyPoint[] {
  const today = todayFor(weather);
  return weather.daily.filter((day) => day.date >= today).slice(0, limit);
}

export function getYesterdayDaily(weather: WeatherData): DailyPoint | null {
  const today = todayFor(weather);
  return weather.daily.find((day) => day.date < today) ?? null;
}

export function getUpcomingHourly(weather: WeatherData, limit = 48, nowIso?: string): HourlyPoint[] {
  const now = nowIso ?? nowLocalIso(weather.meta.utcOffsetSeconds);
  const currentHour = `${now.slice(0, 13)}:00`;
  const start = weather.hourly.findIndex((hour) => hour.time >= currentHour);
  if (start < 0) return weather.hourly.slice(0, limit);
  return weather.hourly.slice(start, start + limit);
}

export function getCurrentHourly(weather: WeatherData, nowIso?: string): HourlyPoint | null {
  const now = nowIso ?? nowLocalIso(weather.meta.utcOffsetSeconds);
  const currentHour = `${now.slice(0, 13)}:00`;
  return weather.hourly.find((hour) => hour.time.slice(0, 13) === currentHour.slice(0, 13)) ?? weather.hourly[0] ?? null;
}

export function getHourlyAround(weather: WeatherData, targetIso: string, before = 6, after = 6): HourlyPoint[] {
  const hour = `${targetIso.slice(0, 13)}:00`;
  const index = weather.hourly.findIndex((point) => point.time === hour);
  if (index < 0) return [];
  return weather.hourly.slice(Math.max(0, index - before), index + after + 1);
}

export function pressureDelta(weather: WeatherData): number {
  const current = getCurrentHourly(weather);
  if (!current) return 0;
  const index = weather.hourly.findIndex((hour) => hour.time === current.time);
  const threeHoursAgo = weather.hourly[Math.max(0, index - 3)];
  if (!threeHoursAgo) return 0;
  return current.pressure - threeHoursAgo.pressure;
}

export function yesterdayTemperatureDelta(weather: WeatherData): number | null {
  const today = getTodayDaily(weather);
  const yesterday = getYesterdayDaily(weather);
  if (!today || !yesterday) return null;
  return today.temperatureMax - yesterday.temperatureMax;
}

const COMPASS_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

const COMPASS_BN = [
  "উ", "উ-উপূ", "উপূ", "পূ-উপূ", "পূ", "পূ-দপূ", "দপূ", "দ-দপূ",
  "দ", "দ-দপ", "দপ", "প-দপ", "প", "প-উপ", "উপ", "উ-উপ",
] as const;

export function compassDirection(degrees: number, language: "en" | "bn" = "en"): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return language === "bn" ? COMPASS_BN[index] ?? "—" : COMPASS_16[index] ?? "—";
}

export function nearestHourlyIndex(weather: WeatherData, iso: string): number {
  const target = iso.slice(0, 13);
  const exact = weather.hourly.findIndex((hour) => hour.time.slice(0, 13) === target);
  if (exact >= 0) return exact;
  return Math.max(0, weather.hourly.findIndex((hour) => hour.time >= iso));
}

export function hourlyAt(weather: WeatherData, iso: string): HourlyPoint | null {
  const index = nearestHourlyIndex(weather, iso);
  return weather.hourly[index] ?? null;
}

export function dailyAt(weather: WeatherData, date: string): DailyPoint | null {
  return weather.daily.find((day) => day.date === date) ?? null;
}
