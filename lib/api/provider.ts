import type { GeocodeResult, Place } from "@/types/geo";
import type { AirQualityData, ClimateComparison, FavoriteSummary, RadarData, WeatherData } from "@/types/weather";

export interface GeoLocationInput {
  latitude: number;
  longitude: number;
  place?: Place;
}

export interface WindSample {
  latitude: number;
  longitude: number;
  temperature: number | null;
  windSpeed: number | null;
  windDirection: number | null;
}

/**
 * Provider contract. Swap Open-Meteo for another vendor by implementing this
 * interface in `/lib/api` and changing the export below. Route handlers and UI
 * never talk to a vendor directly.
 */
export interface WeatherProvider {
  name: string;
  forecast: (input: GeoLocationInput & { place?: Place }) => Promise<WeatherData>;
  airQuality: (input: GeoLocationInput) => Promise<AirQualityData>;
  searchPlaces: (query: string, language: "en" | "bn", count?: number) => Promise<GeocodeResult[]>;
  reverseGeocode: (latitude: number, longitude: number, language: "en" | "bn") => Promise<Place | null>;
  radar: () => Promise<RadarData>;
  climate: (input: GeoLocationInput & { date: string }) => Promise<ClimateComparison>;
  windGrid: (points: Array<[number, number]>) => Promise<WindSample[]>;
  favoriteSummaries: (points: Array<[number, number]>) => Promise<FavoriteSummary[]>;
}

export { openMeteoProvider as weatherProvider } from "./open-meteo";
