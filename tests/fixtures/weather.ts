import { addDaysToIsoDate } from "@/lib/format";
import { DEFAULT_PLACE } from "@/lib/constants";
import type {
  CurrentConditions,
  DailyPoint,
  HourlyPoint,
  MinutelyPoint,
  WeatherData,
} from "@/types/weather";

export interface WeatherFixtureOptions {
  hours?: number;
  current?: Partial<CurrentConditions>;
  hourly?: (hour: HourlyPoint, index: number) => Partial<HourlyPoint>;
  daily?: (day: DailyPoint, index: number) => Partial<DailyPoint>;
  minutely?: MinutelyPoint[];
}

function startOfCurrentHour(): Date {
  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  return start;
}

function isoAt(start: Date, hoursAhead: number): string {
  return new Date(start.getTime() + hoursAhead * 3_600_000).toISOString().slice(0, 16);
}

export function makeWeather(options: WeatherFixtureOptions = {}): WeatherData {
  const start = startOfCurrentHour();
  const startIso = isoAt(start, 0);
  const startDate = startIso.slice(0, 10);
  // Mirrors the 16-day hourly horizon requested from Open-Meteo.
  const hours = options.hours ?? 24 * 16;

  const hourly: HourlyPoint[] = Array.from({ length: hours }, (_, index) => {
    const base: HourlyPoint = {
      time: isoAt(start, index),
      temperature: 28,
      apparentTemperature: 31,
      humidity: 65,
      dewPoint: 21,
      precipitationProbability: 10,
      precipitation: 0,
      rain: 0,
      showers: 0,
      snowfall: 0,
      conditionCode: 2,
      pressure: 1011,
      cloudCover: 35,
      visibility: 12_000,
      windSpeed: 9,
      windDirection: 200,
      windGust: 16,
      uvIndex: 4,
      isDay: index % 24 >= 6 && index % 24 < 18,
    };
    return { ...base, ...options.hourly?.(base, index) };
  });

  const firstHour = hourly[0];
  if (!firstHour) throw new Error("Weather fixture needs at least one hour");

  const current: CurrentConditions = {
    time: firstHour.time,
    temperature: 28,
    apparentTemperature: 31,
    humidity: 65,
    dewPoint: 21,
    conditionCode: 2,
    isDay: true,
    precipitation: 0,
    rain: 0,
    showers: 0,
    snowfall: 0,
    cloudCover: 35,
    pressure: 1011,
    windSpeed: 9,
    windDirection: 200,
    windGust: 16,
    visibility: 12_000,
    uvIndex: 4,
    ...options.current,
  };

  const daily: DailyPoint[] = Array.from({ length: 16 }, (_, index) => {
    const date = addDaysToIsoDate(startDate, index);
    const base: DailyPoint = {
      date,
      conditionCode: 2,
      temperatureMax: 32,
      temperatureMin: 23,
      apparentMax: 37,
      apparentMin: 25,
      sunrise: `${date}T06:02`,
      sunset: `${date}T17:46`,
      daylightSeconds: 42_240,
      sunshineSeconds: 25_000,
      uvIndexMax: 6,
      precipitationSum: 0,
      rainSum: 0,
      showersSum: 0,
      snowfallSum: 0,
      precipitationHours: 0,
      precipitationProbabilityMax: 20,
      windSpeedMax: 14,
      windGustMax: 24,
      windDirectionDominant: 200,
    };
    return { ...base, ...options.daily?.(base, index) };
  });

  const minutely: MinutelyPoint[] =
    options.minutely ??
    Array.from({ length: 16 }, (_, index) => ({
      time: isoAt(start, index / 4),
      precipitation: 0,
      precipitationProbability: 10,
      conditionCode: 2,
      temperature: 28,
      windSpeed: 9,
    }));

  return {
    place: { ...DEFAULT_PLACE, timezone: "UTC" },
    meta: {
      timezone: "UTC",
      timezoneAbbreviation: "UTC",
      utcOffsetSeconds: 0,
      latitude: DEFAULT_PLACE.latitude,
      longitude: DEFAULT_PLACE.longitude,
      elevation: 8,
      fetchedAt: Date.now(),
    },
    current,
    hourly,
    daily,
    minutely,
  };
}

export function todayOf(weather: WeatherData): string {
  return weather.current.time.slice(0, 10);
}

export function hourOf(weather: WeatherData): string {
  return weather.current.time.slice(11, 16);
}
