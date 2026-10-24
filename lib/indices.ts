import type { TranslationKey } from "@/i18n/en";
import { splitLocalIso } from "@/lib/format";
import { usAqiCategory, uvCategory } from "@/lib/units";
import { getTodayDaily, getUpcomingHourly } from "@/lib/weather";
import { getStargazing } from "@/lib/sun";
import type { AirQualityData, WeatherData } from "@/types/weather";

export type IndexTone = "good" | "fair" | "poor";

export type LifestyleId =
  | "umbrella"
  | "sunscreen"
  | "jacket"
  | "workout"
  | "driving"
  | "laundry"
  | "carWash"
  | "allergy"
  | "kite"
  | "fishing"
  | "stargazing"
  | "mosquito";

export interface LifestyleIndex {
  id: LifestyleId;
  labelKey: TranslationKey;
  verdictKey: TranslationKey;
  adviceKey: TranslationKey;
  tone: IndexTone;
  score: number;
}

export type UvKey = "uvLow" | "uvModerate" | "uvHigh" | "uvVeryHigh" | "uvExtreme";

export interface AqiSummary {
  aqi: number;
  scale: "us" | "eu";
  category: ReturnType<typeof usAqiCategory>;
  categoryKey: string;
  adviceKey: string;
  pollutants: Array<{ key: TranslationKey; labelKey: TranslationKey; value: number | null; unit: string }>;
  pollenPeak: number;
  pollenLevelKey: TranslationKey;
}

const POLLEN_FIELDS: Array<keyof AirQualityData["current"]> = [
  "alderPollen",
  "birchPollen",
  "grassPollen",
  "mugwortPollen",
  "olivePollen",
  "ragweedPollen",
];

export function buildAqiSummary(air: AirQualityData | null): AqiSummary | null {
  if (!air) return null;
  const usAqi = air.current.usAqi;
  const euAqi = air.current.europeanAqi;
  const aqi = usAqi ?? euAqi;
  if (aqi === null) return null;
  const scale: "us" | "eu" = usAqi !== null ? "us" : "eu";
  const category = scale === "us" ? usAqiCategory(aqi) : usAqiCategory(Math.round(aqi * 2.5));
  const categoryKey =
    category === "good"
      ? "aqiGood"
      : category === "moderate"
        ? "aqiModerate"
        : category === "unhealthy-sensitive"
          ? "aqiUnhealthySensitive"
          : category === "unhealthy"
            ? "aqiUnhealthy"
            : category === "very-unhealthy"
              ? "aqiVeryUnhealthy"
              : "aqiHazardous";
  const adviceKey =
    category === "good"
      ? "aqiGoodAdvice"
      : category === "moderate"
        ? "aqiModerateAdvice"
        : category === "unhealthy-sensitive"
          ? "aqiSensitiveAdvice"
          : category === "unhealthy"
            ? "aqiUnhealthyAdvice"
            : category === "very-unhealthy"
              ? "aqiVeryUnhealthyAdvice"
              : "aqiHazardousAdvice";

  const pollenValues = POLLEN_FIELDS.map(
    (field) => (air.current[field] as number | null | undefined) ?? 0,
  );
  const pollenPeak = Math.max(...pollenValues, 0);
  const pollenLevelKey =
    pollenPeak <= 0
      ? "pollenNone"
      : pollenPeak < 10
        ? "pollenLow"
        : pollenPeak < 30
          ? "pollenModerate"
          : pollenPeak < 60
            ? "pollenHigh"
            : "pollenVeryHigh";

  return {
    aqi: Math.round(aqi),
    scale,
    category,
    categoryKey,
    adviceKey,
    pollutants: [
      { key: "pm25", labelKey: "pm25", value: air.current.pm25, unit: "µg/m³" },
      { key: "pm10", labelKey: "pm10", value: air.current.pm10, unit: "µg/m³" },
      { key: "ozone", labelKey: "ozone", value: air.current.ozone, unit: "µg/m³" },
      { key: "no2", labelKey: "no2", value: air.current.nitrogenDioxide, unit: "µg/m³" },
      { key: "so2", labelKey: "so2", value: air.current.sulphurDioxide, unit: "µg/m³" },
      { key: "co", labelKey: "co", value: air.current.carbonMonoxide, unit: "µg/m³" },
    ],
    pollenPeak,
    pollenLevelKey,
  };
}

export function uvKey(uv: number | null): UvKey {
  if (uv === null) return "uvLow";
  switch (uvCategory(uv)) {
    case "low":
      return "uvLow";
    case "moderate":
      return "uvModerate";
    case "high":
      return "uvHigh";
    case "veryHigh":
      return "uvVeryHigh";
    default:
      return "uvExtreme";
  }
}

export function buildLifestyleIndices(
  weather: WeatherData,
  air: AirQualityData | null,
): LifestyleIndex[] {
  const current = weather.hourly.find((hour) => hour.time.slice(0, 13) === weather.current.time.slice(0, 13));
  const next12 = getUpcomingHourly(weather, 12);
  const today = getTodayDaily(weather);
  const aqiSummary = buildAqiSummary(air);
  const stargazing = getStargazing(weather);
  const maxRainChance = next12.length
    ? Math.max(...next12.map((hour) => hour.precipitationProbability), 0)
    : weather.current.precipitation > 0
      ? 100
      : 0;
  const totalRain = next12.reduce((total, hour) => total + hour.precipitation, 0);
  const maxWind = next12.length
    ? Math.max(...next12.map((hour) => hour.windSpeed), 0)
    : weather.current.windSpeed;
  const maxGust = next12.length
    ? Math.max(...next12.map((hour) => hour.windGust), 0)
    : weather.current.windGust;
  const uv = today?.uvIndexMax ?? weather.current.uvIndex ?? 0;
  const apparent = current?.apparentTemperature ?? weather.current.apparentTemperature;
  const humidity = current?.humidity ?? weather.current.humidity;
  const visibility = current?.visibility ?? weather.current.visibility ?? 10;
  const isNight = !weather.current.isDay;

  const umbrellaTone: IndexTone =
    maxRainChance >= 65 || totalRain >= 1.5 ? "poor" : maxRainChance >= 35 ? "fair" : "good";

  const sunscreenTone: IndexTone = uv >= 8 ? "poor" : uv >= 3 ? "fair" : "good";

  const jacketTone: IndexTone =
    apparent < 12 ? "poor" : apparent < 18 ? "fair" : "good";

  const workoutTone: IndexTone =
    maxRainChance >= 55 || apparent >= 34 || maxWind >= 38 || (aqiSummary ? aqiSummary.aqi > 150 : false)
      ? "poor"
      : maxRainChance >= 30 || apparent >= 30 || (aqiSummary ? aqiSummary.aqi > 100 : false)
        ? "fair"
        : "good";

  const drivingTone: IndexTone =
    visibility < 2 || maxWind >= 50 || weather.current.conditionCode >= 95
      ? "poor"
      : maxRainChance >= 45 || visibility < 5
        ? "fair"
        : "good";

  const laundryTone: IndexTone =
    totalRain >= 0.4 || humidity >= 82
      ? "poor"
      : humidity >= 68 || maxRainChance >= 30
        ? "fair"
        : "good";

  const next24 = getUpcomingHourly(weather, 24);
  const rain24 = next24.reduce((total, hour) => total + hour.precipitation, 0);
  const carWashTone: IndexTone = rain24 >= 0.5 ? "poor" : rain24 > 0 ? "fair" : "good";

  const allergyTone: IndexTone = aqiSummary
    ? aqiSummary.pollenPeak >= 35
      ? "poor"
      : aqiSummary.pollenPeak >= 10
        ? "fair"
        : "good"
    : "good";

  const kiteTone: IndexTone =
    maxRainChance >= 45 || maxWind > 35 || maxWind < 8
      ? "poor"
      : maxWind > 27 || maxGust > maxWind * 1.75
        ? "fair"
        : "good";

  const fishingTone: IndexTone =
    weather.current.conditionCode >= 95 || maxWind >= 35
      ? "poor"
      : maxRainChance >= 65 || maxWind >= 26 || isNight
        ? "fair"
        : "good";

  const stargazingTone: IndexTone =
    stargazing.score >= 70 ? "good" : stargazing.score >= 45 ? "fair" : "poor";

  const mosquitoTone: IndexTone =
    !isNight
      ? "good"
      : weather.current.temperature >= 24 && humidity >= 62
        ? totalRain > 0 || humidity >= 78
          ? "poor"
          : "fair"
        : "good";

  return [
    {
      id: "umbrella",
      labelKey: "umbrella",
      verdictKey: umbrellaTone === "good" ? "noUmbrella" : "takeUmbrella",
      adviceKey: umbrellaTone === "good" ? "noUmbrellaAdvice" : "umbrellaAdvice",
      tone: umbrellaTone,
      score: 100 - maxRainChance,
    },
    {
      id: "sunscreen",
      labelKey: "sunscreen",
      verdictKey: uv >= 3 ? "useSunscreen" : "skipSunscreen",
      adviceKey: uv >= 3 ? "wearSun" : "skipSunscreen",
      tone: sunscreenTone,
      score: 100 - Math.min(100, uv * 8),
    },
    {
      id: "jacket",
      labelKey: "jacket",
      verdictKey:
        apparent < 12 ? "warmLayer" : apparent < 18 ? "lightLayer" : "noJacket",
      adviceKey: apparent < 12 ? "wearWarm" : apparent < 18 ? "lightLayer" : "wearLight",
      tone: jacketTone,
      score: Math.max(0, 100 - Math.abs(apparent - 23) * 5),
    },
    {
      id: "workout",
      labelKey: "workout",
      verdictKey:
        workoutTone === "good"
          ? "greatWorkout"
          : workoutTone === "fair"
            ? "carefulWorkout"
            : "indoorWorkout",
      adviceKey:
        workoutTone === "good"
          ? "wearLight"
          : workoutTone === "fair"
            ? "carefulWorkout"
            : "indoorWorkout",
      tone: workoutTone,
      score:
        workoutTone === "good" ? 88 : workoutTone === "fair" ? 58 : 28,
    },
    {
      id: "driving",
      labelKey: "driving",
      verdictKey:
        drivingTone === "good"
          ? "goodDriving"
          : drivingTone === "fair"
            ? "cautionDriving"
            : "avoidDriving",
      adviceKey:
        drivingTone === "good"
          ? "goodDriving"
          : drivingTone === "fair"
            ? "cautionDriving"
            : "avoidDriving",
      tone: drivingTone,
      score: drivingTone === "good" ? 90 : drivingTone === "fair" ? 55 : 22,
    },
    {
      id: "laundry",
      labelKey: "laundry",
      verdictKey:
        laundryTone === "good"
          ? "greatLaundry"
          : laundryTone === "fair"
            ? "slowLaundry"
            : "indoorLaundry",
      adviceKey:
        laundryTone === "good"
          ? "greatLaundry"
          : laundryTone === "fair"
            ? "slowLaundry"
            : "indoorLaundry",
      tone: laundryTone,
      score: laundryTone === "good" ? 88 : laundryTone === "fair" ? 55 : 20,
    },
    {
      id: "carWash",
      labelKey: "carWash",
      verdictKey: carWashTone === "good" ? "goodCarWash" : "skipCarWash",
      adviceKey: carWashTone === "good" ? "goodCarWash" : "skipCarWash",
      tone: carWashTone,
      score: carWashTone === "good" ? 92 : carWashTone === "fair" ? 48 : 15,
    },
    {
      id: "allergy",
      labelKey: "allergy",
      verdictKey: allergyTone === "good" ? "allergyLow" : "allergyHigh",
      adviceKey: allergyTone === "good" ? "allergyLow" : "allergyHigh",
      tone: allergyTone,
      score: allergyTone === "good" ? 85 : allergyTone === "fair" ? 55 : 25,
    },
    {
      id: "kite",
      labelKey: "kiteFlying",
      verdictKey: kiteTone === "good" ? "kiteGood" : "kiteBad",
      adviceKey: kiteTone === "good" ? "kiteGood" : "kiteBad",
      tone: kiteTone,
      score: kiteTone === "good" ? 90 : kiteTone === "fair" ? 55 : 22,
    },
    {
      id: "fishing",
      labelKey: "fishing",
      verdictKey: fishingTone === "good" ? "fishGood" : "fishBad",
      adviceKey: fishingTone === "good" ? "fishGood" : "fishBad",
      tone: fishingTone,
      score: fishingTone === "good" ? 82 : fishingTone === "fair" ? 52 : 24,
    },
    {
      id: "stargazing",
      labelKey: "stargazing",
      verdictKey: stargazing.ratingKey,
      adviceKey: stargazing.visibleTonight ? "starsGreat" : "starsCloudy",
      tone: stargazingTone,
      score: stargazing.score,
    },
    {
      id: "mosquito",
      labelKey: "mosquito",
      verdictKey: mosquitoTone === "good" ? "mosquitoesLow" : "mosquitoesHigh",
      adviceKey: mosquitoTone === "good" ? "mosquitoesLow" : "mosquitoesHigh",
      tone: mosquitoTone,
      score: mosquitoTone === "good" ? 88 : mosquitoTone === "fair" ? 55 : 28,
    },
  ];
}

export function nightLabel(time: string): string {
  const parsed = splitLocalIso(time);
  if (!parsed) return time;
  return `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`;
}
