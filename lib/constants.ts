import type { Place } from "@/types/geo";
import type { UnitPreferences, WidgetLayoutItem } from "@/types/settings";

export const APP_VERSION = "1.0.0";

export const SITE = {
  name: "MeraCast",
  brand: "MeraVex",
  tagline: "Know before the clouds do.",
  description:
    "MeraCast is a cinematic, bilingual weather experience by MeraVex. Hourly and 16-day forecasts, live radar, air quality, astronomy, smart summaries and a world-class Rain Planner.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://meracast.vercel.app",
  locale: "en_US",
  handle: "@meravex",
  themeColor: "#071019",
} as const;

export const DEFAULT_PLACE: Place = {
  id: "dhaka-bd",
  name: "Dhaka",
  country: "Bangladesh",
  countryCode: "BD",
  admin1: "Dhaka Division",
  latitude: 23.8103,
  longitude: 90.4125,
  timezone: "Asia/Dhaka",
};

export const DEFAULT_UNITS: UnitPreferences = {
  temperature: "c",
  wind: "kmh",
  precipitation: "mm",
  pressure: "hpa",
  time: "12h",
};

export const DEFAULT_WIDGETS: WidgetLayoutItem[] = [
  { id: "nowcast", visible: true },
  { id: "summary", visible: true },
  { id: "hourly", visible: true },
  { id: "daily", visible: true },
  { id: "favorites", visible: true },
  { id: "air", visible: true },
  { id: "sun", visible: true },
  { id: "suggestions", visible: true },
  { id: "history", visible: true },
  { id: "astronomy", visible: true },
];

export const STORAGE_KEYS = {
  settings: "meracast-settings-v1",
  locations: "meracast-locations-v1",
  ui: "meracast-ui-v1",
  queryCache: "meracast-query-cache-v1",
  notificationLog: "meracast-notifications-v1",
  installDismissed: "meracast-install-dismissed-v1",
} as const;

export const FORECAST_DAYS = 16;
export const HOURLY_DISPLAY_HOURS = 48;
export const SITE_CITIES = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Khulna",
  "Rajshahi",
  "Cox's Bazar",
  "London",
  "New York",
  "Tokyo",
  "Paris",
  "Dubai",
  "Singapore",
  "Delhi",
  "Mumbai",
  "Bangkok",
  "Istanbul",
  "Sydney",
  "Toronto",
  "Berlin",
  "Cairo",
  "Lagos",
  "São Paulo",
  "Jakarta",
  "Seoul",
] as const;

export const LANGUAGE_LOCALES = {
  en: "en-US",
  bn: "bn-BD",
} as const;

export const PROVIDER_URLS = {
  forecast: "https://api.open-meteo.com/v1/forecast",
  airQuality: "https://air-quality-api.open-meteo.com/v1/air-quality",
  geocoding: "https://geocoding-api.open-meteo.com/v1/search",
  archive: "https://archive-api.open-meteo.com/v1/archive",
  rainViewer: "https://api.rainviewer.com/public/weather-maps.json",
  mapDark: "https://tiles.openfreemap.org/styles/dark",
  mapLight: "https://tiles.openfreemap.org/styles/positron",
} as const;

export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://openfreemap.org/">OpenFreeMap</a> · Radar <a href="https://www.rainviewer.com/">RainViewer</a>';
