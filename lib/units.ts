import type {
  PrecipUnit,
  PressureUnit,
  TemperatureUnit,
  TimeFormat,
  WindUnit,
} from "@/types/settings";

export const KMH_TO_MPH = 0.621371;
export const KMH_TO_MS = 0.277778;
export const KMH_TO_KNOTS = 0.539957;
export const MM_TO_IN = 0.0393701;
export const HPA_TO_INHG = 0.02953;
export const KM_TO_MI = 0.621371;

export function cToF(value: number): number {
  return value * 1.8 + 32;
}

export function fToC(value: number): number {
  return (value - 32) / 1.8;
}

export function convertTemperature(valueC: number, unit: TemperatureUnit): number {
  return unit === "f" ? cToF(valueC) : valueC;
}

export function convertWind(kmh: number, unit: WindUnit): number {
  switch (unit) {
    case "mph":
      return kmh * KMH_TO_MPH;
    case "ms":
      return kmh * KMH_TO_MS;
    case "kn":
      return kmh * KMH_TO_KNOTS;
    default:
      return kmh;
  }
}

export function convertPrecipitation(mm: number, unit: PrecipUnit): number {
  return unit === "in" ? mm * MM_TO_IN : mm;
}

export function convertPressure(hpa: number, unit: PressureUnit): number {
  return unit === "inhg" ? hpa * HPA_TO_INHG : hpa;
}

export function convertVisibility(km: number, unit: TemperatureUnit): number {
  return unit === "f" ? km * KM_TO_MI : km;
}

export const windUnitLabels: Record<WindUnit, string> = {
  kmh: "km/h",
  mph: "mph",
  ms: "m/s",
  kn: "kn",
};

export const temperatureUnitLabels: Record<TemperatureUnit, string> = {
  c: "°C",
  f: "°F",
};

export const precipUnitLabels: Record<PrecipUnit, string> = {
  mm: "mm",
  in: "in",
};

export const pressureUnitLabels: Record<PressureUnit, string> = {
  hpa: "hPa",
  inhg: "inHg",
};

export const timeFormatLabels: Record<TimeFormat, string> = {
  "12h": "12h",
  "24h": "24h",
};

export function decimalPlacesForWind(unit: WindUnit): number {
  return unit === "ms" || unit === "kn" ? 1 : 0;
}

export function decimalPlacesForPrecip(unit: PrecipUnit): number {
  return unit === "in" ? 2 : 1;
}

export function decimalPlacesForPressure(unit: PressureUnit): number {
  return unit === "inhg" ? 2 : 0;
}

export type UvCategory = "low" | "moderate" | "high" | "veryHigh" | "extreme";

export function uvCategory(uv: number): UvCategory {
  if (uv < 3) return "low";
  if (uv < 6) return "moderate";
  if (uv < 8) return "high";
  if (uv < 11) return "veryHigh";
  return "extreme";
}

export type AqiCategory = "good" | "moderate" | "unhealthy-sensitive" | "unhealthy" | "very-unhealthy" | "hazardous";

export function usAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "unhealthy-sensitive";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "very-unhealthy";
  return "hazardous";
}

export function euAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 20) return "good";
  if (aqi <= 40) return "moderate";
  if (aqi <= 60) return "unhealthy-sensitive";
  if (aqi <= 80) return "unhealthy";
  if (aqi <= 100) return "very-unhealthy";
  return "hazardous";
}

export function aqiCategoryKey(category: AqiCategory): string {
  switch (category) {
    case "good":
      return "aqiGood";
    case "moderate":
      return "aqiModerate";
    case "unhealthy-sensitive":
      return "aqiUnhealthySensitive";
    case "unhealthy":
      return "aqiUnhealthy";
    case "very-unhealthy":
      return "aqiVeryUnhealthy";
    default:
      return "aqiHazardous";
  }
}

export function aqiAdviceKey(category: AqiCategory): string {
  switch (category) {
    case "good":
      return "aqiGoodAdvice";
    case "moderate":
      return "aqiModerateAdvice";
    case "unhealthy-sensitive":
      return "aqiSensitiveAdvice";
    case "unhealthy":
      return "aqiUnhealthyAdvice";
    case "very-unhealthy":
      return "aqiVeryUnhealthyAdvice";
    default:
      return "aqiHazardousAdvice";
  }
}

export function pressureTrend(deltaHpa: number): "rising" | "falling" | "steady" {
  if (deltaHpa > 1) return "rising";
  if (deltaHpa < -1) return "falling";
  return "steady";
}
