"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect } from "react";
import {
  fetchAirQualityClient,
  fetchClimateClient,
  fetchFavoriteSummariesClient,
  fetchGridClient,
  fetchRadarClient,
  fetchWeatherClient,
  searchPlacesClient,
  type WindSample,
} from "@/lib/api/client";
import type {
  AirQualityData,
  ClimateComparison,
  FavoriteSummary,
  RadarData,
  WeatherData,
} from "@/types/weather";
import type { GeocodeResult, Place } from "@/types/geo";

export const queryKeys = {
  weather: (latitude: number, longitude: number) =>
    ["weather", latitude.toFixed(3), longitude.toFixed(3)] as const,
  air: (latitude: number, longitude: number) =>
    ["air", latitude.toFixed(3), longitude.toFixed(3)] as const,
  radar: ["radar"] as const,
  climate: (latitude: number, longitude: number, date: string) =>
    ["climate", latitude.toFixed(3), longitude.toFixed(3), date] as const,
  geocode: (query: string, language: string) => ["geocode", language, query] as const,
  grid: (signature: string) => ["grid", signature] as const,
  favoriteSummaries: (signature: string) => ["favorite-summaries", signature] as const,
};

export function useWeatherQuery(
  place: Place,
  options: { enabled?: boolean; initialData?: WeatherData } = {},
): UseQueryResult<WeatherData> {
  return useQuery({
    queryKey: queryKeys.weather(place.latitude, place.longitude),
    queryFn: ({ signal }) => fetchWeatherClient(place, signal),
    enabled: options.enabled ?? true,
    initialData: options.initialData,
    placeholderData: options.initialData ? undefined : keepPreviousData,
    staleTime: 1000 * 60 * 8,
  });
}

export function useAirQualityQuery(
  place: Place,
  enabled = true,
): UseQueryResult<AirQualityData> {
  return useQuery({
    queryKey: queryKeys.air(place.latitude, place.longitude),
    queryFn: ({ signal }) => fetchAirQualityClient(place, signal),
    enabled,
    staleTime: 1000 * 60 * 15,
    retry: 2,
  });
}

export function useRadarQuery(
  options: { enabled?: boolean; initialData?: RadarData } = {},
): UseQueryResult<RadarData> {
  return useQuery({
    queryKey: queryKeys.radar,
    queryFn: ({ signal }) => fetchRadarClient(signal),
    enabled: options.enabled ?? true,
    initialData: options.initialData,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 6,
  });
}

export function useClimateQuery(
  place: Place,
  date: string,
  enabled = true,
): UseQueryResult<ClimateComparison> {
  return useQuery({
    queryKey: queryKeys.climate(place.latitude, place.longitude, date),
    queryFn: ({ signal }) => fetchClimateClient(place, date, signal),
    enabled,
    staleTime: 1000 * 60 * 60 * 6,
    retry: 1,
  });
}

export function useGeocodeQuery(
  query: string,
  language: "en" | "bn",
  options: { enabled?: boolean } = {},
): UseQueryResult<GeocodeResult[]> {
  const trimmed = query.trim();
  const queryClient = useQueryClient();

  useEffect(() => {
    const key = queryKeys.geocode(trimmed, language);
    return () => {
      void queryClient.cancelQueries({ queryKey: key, exact: true });
    };
  }, [language, queryClient, trimmed]);

  return useQuery({
    queryKey: queryKeys.geocode(trimmed, language),
    queryFn: ({ signal }) => searchPlacesClient(trimmed, language, signal),
    enabled: (options.enabled ?? true) && trimmed.length >= 2,
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export function useGridQuery(
  points: Array<[number, number]>,
  enabled = true,
): UseQueryResult<WindSample[]> {
  const signature = points.map(([lat, lon]) => `${lat.toFixed(2)},${lon.toFixed(2)}`).join("|");
  return useQuery({
    queryKey: queryKeys.grid(signature),
    queryFn: ({ signal }) => fetchGridClient(points, signal),
    enabled: enabled && points.length > 0,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

/**
 * One Open-Meteo request covers every favorite. The query is sorted by
 * coordinate so reordering the list does not invalidate the weather cache;
 * callers match summaries back to a place by its latitude and longitude.
 */
export function useFavoriteSummariesQuery(
  places: Place[],
  enabled = true,
): UseQueryResult<FavoriteSummary[]> {
  const points = [...places]
    .sort((a, b) => a.latitude - b.latitude || a.longitude - b.longitude)
    .map((place) => [place.latitude, place.longitude] as [number, number]);
  const signature = points
    .map(([latitude, longitude]) => `${latitude.toFixed(4)},${longitude.toFixed(4)}`)
    .join("|");
  return useQuery({
    queryKey: queryKeys.favoriteSummaries(signature),
    queryFn: ({ signal }) => fetchFavoriteSummariesClient(points, signal),
    enabled: enabled && points.length > 0,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    networkMode: "offlineFirst",
    retry: 1,
  });
}
