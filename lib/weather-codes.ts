import type { TranslationKey } from "@/i18n/en";
import type { SceneKind, WeatherIconKind } from "@/types/weather";

export interface ConditionMeta {
  code: number;
  labelKey: TranslationKey;
  icon: WeatherIconKind;
  tone: "clear" | "cloud" | "rain" | "storm" | "snow" | "fog";
  isWet: boolean;
  isSnow: boolean;
  isSevere: boolean;
  intensity: number;
}

const CONDITIONS: Record<number, Omit<ConditionMeta, "code">> = {
  0: { labelKey: "condClear", icon: "clear", tone: "clear", isWet: false, isSnow: false, isSevere: false, intensity: 0 },
  1: { labelKey: "condMostlyClear", icon: "clear", tone: "clear", isWet: false, isSnow: false, isSevere: false, intensity: 0 },
  2: { labelKey: "condPartlyCloudy", icon: "partly", tone: "cloud", isWet: false, isSnow: false, isSevere: false, intensity: 1 },
  3: { labelKey: "condOvercast", icon: "overcast", tone: "cloud", isWet: false, isSnow: false, isSevere: false, intensity: 1 },
  45: { labelKey: "condFog", icon: "fog", tone: "fog", isWet: false, isSnow: false, isSevere: false, intensity: 1 },
  48: { labelKey: "condHaze", icon: "haze", tone: "fog", isWet: false, isSnow: false, isSevere: false, intensity: 1 },
  51: { labelKey: "condDrizzle", icon: "drizzle", tone: "rain", isWet: true, isSnow: false, isSevere: false, intensity: 1 },
  53: { labelKey: "condDrizzle", icon: "drizzle", tone: "rain", isWet: true, isSnow: false, isSevere: false, intensity: 2 },
  55: { labelKey: "condDrizzle", icon: "rain", tone: "rain", isWet: true, isSnow: false, isSevere: false, intensity: 3 },
  56: { labelKey: "condFreezingRain", icon: "sleet", tone: "rain", isWet: true, isSnow: true, isSevere: true, intensity: 2 },
  57: { labelKey: "condFreezingRain", icon: "sleet", tone: "rain", isWet: true, isSnow: true, isSevere: true, intensity: 3 },
  61: { labelKey: "condLightRain", icon: "rain", tone: "rain", isWet: true, isSnow: false, isSevere: false, intensity: 1 },
  63: { labelKey: "condRain", icon: "rain", tone: "rain", isWet: true, isSnow: false, isSevere: false, intensity: 2 },
  65: { labelKey: "condHeavyRain", icon: "heavy-rain", tone: "rain", isWet: true, isSnow: false, isSevere: true, intensity: 4 },
  66: { labelKey: "condFreezingRain", icon: "sleet", tone: "rain", isWet: true, isSnow: true, isSevere: true, intensity: 3 },
  67: { labelKey: "condFreezingRain", icon: "sleet", tone: "rain", isWet: true, isSnow: true, isSevere: true, intensity: 4 },
  71: { labelKey: "condLightSnow", icon: "snow", tone: "snow", isWet: true, isSnow: true, isSevere: false, intensity: 1 },
  73: { labelKey: "condSnow", icon: "snow", tone: "snow", isWet: true, isSnow: true, isSevere: false, intensity: 2 },
  75: { labelKey: "condHeavySnow", icon: "snow", tone: "snow", isWet: true, isSnow: true, isSevere: true, intensity: 4 },
  77: { labelKey: "condSnowGrains", icon: "snow", tone: "snow", isWet: true, isSnow: true, isSevere: false, intensity: 1 },
  80: { labelKey: "condRainShowers", icon: "rain", tone: "rain", isWet: true, isSnow: false, isSevere: false, intensity: 2 },
  81: { labelKey: "condRainShowers", icon: "rain", tone: "rain", isWet: true, isSnow: false, isSevere: false, intensity: 3 },
  82: { labelKey: "condViolentShowers", icon: "heavy-rain", tone: "rain", isWet: true, isSnow: false, isSevere: true, intensity: 4 },
  85: { labelKey: "condSnowShowers", icon: "snow", tone: "snow", isWet: true, isSnow: true, isSevere: false, intensity: 2 },
  86: { labelKey: "condSnowShowers", icon: "snow", tone: "snow", isWet: true, isSnow: true, isSevere: true, intensity: 3 },
  95: { labelKey: "condThunderstorm", icon: "storm", tone: "storm", isWet: true, isSnow: false, isSevere: true, intensity: 4 },
  96: { labelKey: "condThunderHail", icon: "storm", tone: "storm", isWet: true, isSnow: false, isSevere: true, intensity: 4 },
  99: { labelKey: "condThunderHail", icon: "storm", tone: "storm", isWet: true, isSnow: false, isSevere: true, intensity: 5 },
};

const FALLBACK: Omit<ConditionMeta, "code"> = {
  labelKey: "condUnknown",
  icon: "cloudy",
  tone: "cloud",
  isWet: false,
  isSnow: false,
  isSevere: false,
  intensity: 1,
};

export function getCondition(code: number): ConditionMeta {
  const condition = CONDITIONS[code] ?? FALLBACK;
  return { ...condition, code };
}

export function resolveScene(
  code: number,
  isDay: boolean,
  solarPhase: "sunrise" | "sunset" | "day" | "night" = isDay ? "day" : "night",
): SceneKind {
  const condition = getCondition(code);

  if (condition.isSnow) return "snow";
  if (condition.tone === "storm") return "storm";
  if (condition.tone === "fog") return "fog";
  if (condition.isWet) {
    return condition.intensity >= 3 ? "heavy-rain" : "rain";
  }
  if (condition.tone === "cloud") {
    if (code === 3) return "overcast";
    if (!isDay) return "partly-night";
    if (solarPhase === "sunrise") return "sunrise";
    if (solarPhase === "sunset") return "sunset";
    return "partly-day";
  }
  if (!isDay || solarPhase === "night") return "clear-night";
  if (solarPhase === "sunrise") return "sunrise";
  if (solarPhase === "sunset") return "sunset";
  return "clear-day";
}

export function isWetCode(code: number): boolean {
  return getCondition(code).isWet;
}

export function isStormCode(code: number): boolean {
  return getCondition(code).tone === "storm";
}

export function uvAdviceKey(uv: number): TranslationKey {
  if (uv < 3) return "skipSunscreen";
  if (uv < 6) return "useSunscreen";
  return "useSunscreen";
}
