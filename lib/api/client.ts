import type { AirQualityData, ClimateComparison, FavoriteSummary, RadarData, WeatherData } from "@/types/weather";
import type { GeocodeResult, Place } from "@/types/geo";

export class ClientApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(
    message: string,
    options: { status?: number; code?: string; retryable?: boolean; retryAfter?: number } = {},
  ) {
    super(message);
    this.name = "ClientApiError";
    this.status = options.status ?? 500;
    this.code = options.code ?? "UNKNOWN";
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), options.timeoutMs ?? 15_000);
  const callerAbort = () => controller.abort(options.signal?.reason);
  if (options.signal) {
    if (options.signal.aborted) controller.abort(options.signal.reason);
    options.signal.addEventListener("abort", callerAbort, { once: true });
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      const errorShape = payload as
        | { error?: { code?: string; message?: string; retryable?: boolean } }
        | null;
      throw new ClientApiError(
        errorShape?.error?.message ?? `Weather request failed (${response.status}).`,
        {
          status: response.status,
          code: errorShape?.error?.code ?? "HTTP_ERROR",
          retryable:
            response.status >= 500 || response.status === 429 || errorShape?.error?.retryable === true,
          retryAfter: Number(response.headers.get("retry-after") ?? 0) || undefined,
        },
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ClientApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      if (options.signal?.aborted) throw error;
      throw new ClientApiError("The weather service took too long to respond.", {
        status: 504,
        code: "TIMEOUT",
        retryable: true,
      });
    }
    throw new ClientApiError("Could not reach MeraCast's weather service.", {
      status: 0,
      code: "NETWORK_ERROR",
      retryable: true,
    });
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", callerAbort);
  }
}

function coordsParams(place: Pick<Place, "latitude" | "longitude">): URLSearchParams {
  return new URLSearchParams({
    lat: place.latitude.toFixed(4),
    lon: place.longitude.toFixed(4),
  });
}

export function fetchWeatherClient(place: Place, signal?: AbortSignal): Promise<WeatherData> {
  const params = coordsParams(place);
  if (place.name) params.set("name", place.name);
  if (place.country) params.set("country", place.country);
  if (place.countryCode) params.set("countryCode", place.countryCode);
  if (place.admin1) params.set("admin1", place.admin1);
  return requestJson<WeatherData>(`/api/weather?${params.toString()}`, { signal });
}

export function fetchAirQualityClient(place: Place, signal?: AbortSignal): Promise<AirQualityData> {
  const params = coordsParams(place);
  return requestJson<AirQualityData>(`/api/air?${params.toString()}`, { signal });
}

export async function fetchRadarClient(signal?: AbortSignal): Promise<RadarData> {
  return requestJson<RadarData>("/api/radar", { signal, timeoutMs: 12_000 });
}

export async function searchPlacesClient(
  query: string,
  language: "en" | "bn",
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({ q: query, lang: language, count: "8" });
  const data = await requestJson<{ results: GeocodeResult[] }>(`/api/geocode?${params.toString()}`, {
    signal,
    timeoutMs: 10_000,
  });
  return data.results;
}

export function fetchClimateClient(
  place: Place,
  date: string,
  signal?: AbortSignal,
): Promise<ClimateComparison> {
  const params = coordsParams(place);
  params.set("date", date);
  return requestJson<ClimateComparison>(`/api/history?${params.toString()}`, {
    signal,
    timeoutMs: 20_000,
  });
}

export async function reverseGeocodeClient(
  latitude: number,
  longitude: number,
  language: "en" | "bn",
  signal?: AbortSignal,
): Promise<Place> {
  const params = new URLSearchParams({
    lat: latitude.toFixed(5),
    lon: longitude.toFixed(5),
    lang: language,
  });
  return requestJson<Place>(`/api/reverse?${params.toString()}`, { signal, timeoutMs: 10_000 });
}

export interface WindSample {
  latitude: number;
  longitude: number;
  temperature: number | null;
  windSpeed: number | null;
  windDirection: number | null;
}

export async function fetchGridClient(
  points: Array<[number, number]>,
  signal?: AbortSignal,
): Promise<WindSample[]> {
  const params = new URLSearchParams({
    points: points.map(([lat, lon]) => `${lat.toFixed(3)},${lon.toFixed(3)}`).join(";"),
  });
  const data = await requestJson<{ points: WindSample[] }>(`/api/grid?${params.toString()}`, {
    signal,
    timeoutMs: 12_000,
  });
  return data.points;
}

export async function fetchFavoriteSummariesClient(
  points: Array<[number, number]>,
  signal?: AbortSignal,
): Promise<FavoriteSummary[]> {
  const params = new URLSearchParams({
    points: points.map(([lat, lon]) => `${lat.toFixed(4)},${lon.toFixed(4)}`).join(";"),
  });
  const data = await requestJson<{ summaries: FavoriteSummary[] }>(
    `/api/favorites?${params.toString()}`,
    { signal, timeoutMs: 12_000 },
  );
  return data.summaries;
}
