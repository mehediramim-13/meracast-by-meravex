export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type Language = "en" | "bn";
export type TemperatureUnit = "c" | "f";
export type WindUnit = "kmh" | "mph" | "ms" | "kn";
export type PrecipUnit = "mm" | "in";
export type PressureUnit = "hpa" | "inhg";
export type TimeFormat = "12h" | "24h";

export interface UnitPreferences {
  temperature: TemperatureUnit;
  wind: WindUnit;
  precipitation: PrecipUnit;
  pressure: PressureUnit;
  time: TimeFormat;
}

export interface NotificationRules {
  enabled: boolean;
  rainSoon: boolean;
  severe: boolean;
  morningSummary: boolean;
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
}

export interface WidgetLayoutItem {
  id: WidgetId;
  visible: boolean;
}

export type WidgetId =
  | "nowcast"
  | "hourly"
  | "daily"
  | "summary"
  | "suggestions"
  | "air"
  | "sun"
  | "history"
  | "astronomy"
  | "favorites";

export interface SettingsState {
  theme: ThemeMode;
  language: Language;
  bengaliNumerals: boolean;
  units: UnitPreferences;
  reduceMotion: boolean;
  performanceMode: boolean;
  haptics: boolean;
  notifications: NotificationRules;
  widgets: WidgetLayoutItem[];
  onboarded: boolean;
}
