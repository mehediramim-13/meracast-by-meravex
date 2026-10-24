import type { Place } from "./geo";

export type SceneKind =
  | "clear-day"
  | "clear-night"
  | "sunrise"
  | "sunset"
  | "partly-day"
  | "partly-night"
  | "overcast"
  | "rain"
  | "heavy-rain"
  | "storm"
  | "snow"
  | "fog";

export type WeatherIconKind =
  | "clear"
  | "partly"
  | "cloudy"
  | "overcast"
  | "rain"
  | "heavy-rain"
  | "drizzle"
  | "storm"
  | "snow"
  | "sleet"
  | "fog"
  | "haze";

export interface CurrentConditions {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  dewPoint: number | null;
  conditionCode: number;
  isDay: boolean;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  visibility: number | null;
  uvIndex: number | null;
}

export interface HourlyPoint {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  dewPoint: number | null;
  precipitationProbability: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  conditionCode: number;
  pressure: number;
  cloudCover: number;
  visibility: number | null;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  uvIndex: number | null;
  isDay: boolean;
}

export interface DailyPoint {
  date: string;
  conditionCode: number;
  temperatureMax: number;
  temperatureMin: number;
  apparentMax: number;
  apparentMin: number;
  sunrise: string;
  sunset: string;
  daylightSeconds: number;
  sunshineSeconds: number | null;
  uvIndexMax: number | null;
  precipitationSum: number;
  rainSum: number;
  showersSum: number;
  snowfallSum: number;
  precipitationHours: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustMax: number;
  windDirectionDominant: number;
}

export interface MinutelyPoint {
  time: string;
  precipitation: number;
  precipitationProbability: number;
  conditionCode: number;
  temperature: number;
  windSpeed: number;
}

export interface WeatherMeta {
  timezone: string;
  timezoneAbbreviation: string;
  utcOffsetSeconds: number;
  latitude: number;
  longitude: number;
  elevation: number;
  fetchedAt: number;
}

export interface WeatherData {
  place: Place;
  meta: WeatherMeta;
  current: CurrentConditions;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  minutely: MinutelyPoint[];
}

export interface AirQualityCurrent {
  europeanAqi: number | null;
  usAqi: number | null;
  pm10: number | null;
  pm25: number | null;
  carbonMonoxide: number | null;
  nitrogenDioxide: number | null;
  sulphurDioxide: number | null;
  ozone: number | null;
  alderPollen: number | null;
  birchPollen: number | null;
  grassPollen: number | null;
  mugwortPollen: number | null;
  olivePollen: number | null;
  ragweedPollen: number | null;
}

export interface AirQualityPoint {
  time: string;
  europeanAqi: number | null;
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
}

export interface AirQualityData {
  current: AirQualityCurrent;
  hourly: AirQualityPoint[];
  fetchedAt: number;
}

export interface ClimateComparison {
  lastYearDate: string;
  lastYearMax: number | null;
  lastYearMin: number | null;
  lastYearPrecipitation: number | null;
  normalMax: number | null;
  normalMin: number | null;
  normalPrecipitation: number | null;
  yearsUsed: number;
}

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RadarData {
  host: string;
  generated: number;
  past: RadarFrame[];
  nowcast: RadarFrame[];
  satellite: RadarFrame[];
}

export interface FavoriteSummary {
  latitude: number;
  longitude: number;
  temperature: number | null;
  conditionCode: number;
  isDay: boolean;
  precipitationProbability: number | null;
}

export interface WeatherAlert {
  id: string;
  severity: "advisory" | "watch" | "warning" | "severe";
  titleKey: string;
  detailKey: string;
  icon: "rain" | "storm" | "heat" | "wind" | "flood" | "fog" | "cold";
  startsAt: string;
  endsAt: string;
  values?: Record<string, string>;
  metrics?: {
    amount?: number;
    wind?: number;
    temperature?: number;
    visibility?: number;
  };
}

export interface WeatherBundle {
  weather: WeatherData;
  air: AirQualityData | null;
}
