import { buildUrl, fetchJson } from "./server-fetch";
import { ValidationError } from "./errors";
import {
  airQualityResponseSchema,
  archiveResponseSchema,
  favoriteSummariesResponseSchema,
  forecastResponseSchema,
  geocodingResponseSchema,
  multiPointSchema,
  nominatimResponseSchema,
  rainViewerResponseSchema,
} from "./schemas";
import { PROVIDER_URLS } from "@/lib/constants";
import { stablePlaceId } from "@/lib/utils";
import type { GeoLocationInput, WeatherProvider } from "./provider";
import type {
  AirQualityCurrent,
  AirQualityData,
  AirQualityPoint,
  ClimateComparison,
  CurrentConditions,
  DailyPoint,
  FavoriteSummary,
  HourlyPoint,
  MinutelyPoint,
  RadarData,
  WeatherData,
} from "@/types/weather";
import type { GeocodeResult, Place } from "@/types/geo";

const FORECAST_VARIABLES = {
  current: [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "is_day",
    "precipitation",
    "rain",
    "showers",
    "snowfall",
    "weather_code",
    "cloud_cover",
    "pressure_msl",
    "surface_pressure",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
  ].join(","),
  hourly: [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "apparent_temperature",
    "precipitation_probability",
    "precipitation",
    "rain",
    "showers",
    "snowfall",
    "weather_code",
    "pressure_msl",
    "cloud_cover",
    "visibility",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "uv_index",
    "is_day",
  ].join(","),
  daily: [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
    "sunrise",
    "sunset",
    "daylight_duration",
    "sunshine_duration",
    "uv_index_max",
    "precipitation_sum",
    "rain_sum",
    "showers_sum",
    "snowfall_sum",
    "precipitation_hours",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "wind_direction_10m_dominant",
  ].join(","),
  minutely: ["precipitation", "precipitation_probability", "weather_code", "temperature_2m", "wind_speed_10m"].join(","),
};

function valueAt<T>(array: T[] | undefined, index: number): T | null {
  if (!array) return null;
  const value = array[index];
  return value === undefined ? null : value;
}

function numberFrom(value: number | null | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function findCurrentHourIndex(times: string[], currentTime: string): number {
  const hour = currentTime.slice(0, 13);
  const index = times.findIndex((time) => time.slice(0, 13) === hour);
  if (index >= 0) return index;
  return 0;
}

function buildPlace(input: GeoLocationInput, responseTimezone: string): Place {
  return {
    id: input.place?.id ?? stablePlaceId(input.latitude, input.longitude),
    name: input.place?.name ?? `${input.latitude.toFixed(2)}, ${input.longitude.toFixed(2)}`,
    country: input.place?.country ?? "",
    countryCode: input.place?.countryCode,
    admin1: input.place?.admin1,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: responseTimezone,
    population: input.place?.population,
  };
}

async function fetchForecast(input: GeoLocationInput & { place?: Place }): Promise<WeatherData> {
  const url = buildUrl(PROVIDER_URLS.forecast, {
    latitude: input.latitude.toFixed(4),
    longitude: input.longitude.toFixed(4),
    timezone: "auto",
    forecast_days: 16,
    past_days: 2,
    forecast_minutely_15: 48,
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    current: FORECAST_VARIABLES.current,
    hourly: FORECAST_VARIABLES.hourly,
    daily: FORECAST_VARIABLES.daily,
    minutely_15: FORECAST_VARIABLES.minutely,
  });

  const raw = await fetchJson(url, { revalidate: 600, timeoutMs: 14_000 });
  const parsed = forecastResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("The forecast response did not match the expected shape.", parsed.error);
  }
  const data = parsed.data;
  const currentHourIndex = findCurrentHourIndex(data.hourly.time, data.current.time);

  const current: CurrentConditions = {
    time: data.current.time,
    temperature: numberFrom(data.current.temperature_2m),
    apparentTemperature: numberFrom(data.current.apparent_temperature, data.current.temperature_2m),
    humidity: numberFrom(data.current.relative_humidity_2m, numberFrom(valueAt(data.hourly.relative_humidity_2m, currentHourIndex), 0)),
    dewPoint: nullableNumber(valueAt(data.hourly.dew_point_2m, currentHourIndex)),
    conditionCode: numberFrom(data.current.weather_code, numberFrom(valueAt(data.hourly.weather_code, currentHourIndex), 2)),
    isDay: numberFrom(data.current.is_day, 1) === 1,
    precipitation: numberFrom(data.current.precipitation),
    rain: numberFrom(data.current.rain),
    showers: numberFrom(data.current.showers),
    snowfall: numberFrom(data.current.snowfall),
    cloudCover: numberFrom(data.current.cloud_cover, numberFrom(valueAt(data.hourly.cloud_cover, currentHourIndex), 0)),
    pressure: numberFrom(data.current.pressure_msl, numberFrom(valueAt(data.hourly.pressure_msl, currentHourIndex), 1013)),
    windSpeed: numberFrom(data.current.wind_speed_10m, numberFrom(valueAt(data.hourly.wind_speed_10m, currentHourIndex), 0)),
    windDirection: numberFrom(data.current.wind_direction_10m, numberFrom(valueAt(data.hourly.wind_direction_10m, currentHourIndex), 0)),
    windGust: numberFrom(data.current.wind_gusts_10m, numberFrom(valueAt(data.hourly.wind_gusts_10m, currentHourIndex), 0)),
    visibility: nullableNumber(valueAt(data.hourly.visibility, currentHourIndex)),
    uvIndex: nullableNumber(valueAt(data.hourly.uv_index, currentHourIndex)),
  };

  const hourly: HourlyPoint[] = data.hourly.time.map((time, index) => ({
    time,
    temperature: numberFrom(valueAt(data.hourly.temperature_2m, index)),
    apparentTemperature: numberFrom(
      valueAt(data.hourly.apparent_temperature, index),
      numberFrom(valueAt(data.hourly.temperature_2m, index)),
    ),
    humidity: numberFrom(valueAt(data.hourly.relative_humidity_2m, index)),
    dewPoint: nullableNumber(valueAt(data.hourly.dew_point_2m, index)),
    precipitationProbability: numberFrom(valueAt(data.hourly.precipitation_probability, index)),
    precipitation: numberFrom(valueAt(data.hourly.precipitation, index)),
    rain: numberFrom(valueAt(data.hourly.rain, index)),
    showers: numberFrom(valueAt(data.hourly.showers, index)),
    snowfall: numberFrom(valueAt(data.hourly.snowfall, index)),
    conditionCode: numberFrom(valueAt(data.hourly.weather_code, index), 2),
    pressure: numberFrom(valueAt(data.hourly.pressure_msl, index), 1013),
    cloudCover: numberFrom(valueAt(data.hourly.cloud_cover, index)),
    visibility: nullableNumber(valueAt(data.hourly.visibility, index)),
    windSpeed: numberFrom(valueAt(data.hourly.wind_speed_10m, index)),
    windDirection: numberFrom(valueAt(data.hourly.wind_direction_10m, index)),
    windGust: numberFrom(valueAt(data.hourly.wind_gusts_10m, index)),
    uvIndex: nullableNumber(valueAt(data.hourly.uv_index, index)),
    isDay: numberFrom(valueAt(data.hourly.is_day, index), 1) === 1,
  }));

  const daily: DailyPoint[] = data.daily.time.map((date, index) => ({
    date,
    conditionCode: numberFrom(valueAt(data.daily.weather_code, index), 2),
    temperatureMax: numberFrom(valueAt(data.daily.temperature_2m_max, index)),
    temperatureMin: numberFrom(valueAt(data.daily.temperature_2m_min, index)),
    apparentMax: numberFrom(valueAt(data.daily.apparent_temperature_max, index), numberFrom(valueAt(data.daily.temperature_2m_max, index))),
    apparentMin: numberFrom(valueAt(data.daily.apparent_temperature_min, index), numberFrom(valueAt(data.daily.temperature_2m_min, index))),
    sunrise: valueAt(data.daily.sunrise, index) ?? `${date}T06:00`,
    sunset: valueAt(data.daily.sunset, index) ?? `${date}T18:00`,
    daylightSeconds: numberFrom(valueAt(data.daily.daylight_duration, index)),
    sunshineSeconds: nullableNumber(valueAt(data.daily.sunshine_duration, index)),
    uvIndexMax: nullableNumber(valueAt(data.daily.uv_index_max, index)),
    precipitationSum: numberFrom(valueAt(data.daily.precipitation_sum, index)),
    rainSum: numberFrom(valueAt(data.daily.rain_sum, index)),
    showersSum: numberFrom(valueAt(data.daily.showers_sum, index)),
    snowfallSum: numberFrom(valueAt(data.daily.snowfall_sum, index)),
    precipitationHours: numberFrom(valueAt(data.daily.precipitation_hours, index)),
    precipitationProbabilityMax: numberFrom(valueAt(data.daily.precipitation_probability_max, index)),
    windSpeedMax: numberFrom(valueAt(data.daily.wind_speed_10m_max, index)),
    windGustMax: numberFrom(valueAt(data.daily.wind_gusts_10m_max, index)),
    windDirectionDominant: numberFrom(valueAt(data.daily.wind_direction_10m_dominant, index)),
  }));

  const minutely: MinutelyPoint[] = (data.minutely_15?.time ?? []).map((time, index) => ({
    time,
    precipitation: numberFrom(valueAt(data.minutely_15?.precipitation, index)),
    precipitationProbability: numberFrom(valueAt(data.minutely_15?.precipitation_probability, index)),
    conditionCode: numberFrom(valueAt(data.minutely_15?.weather_code, index), 2),
    temperature: numberFrom(valueAt(data.minutely_15?.temperature_2m, index)),
    windSpeed: numberFrom(valueAt(data.minutely_15?.wind_speed_10m, index)),
  }));

  return {
    place: buildPlace(input, data.timezone),
    meta: {
      timezone: data.timezone,
      timezoneAbbreviation: data.timezone_abbreviation,
      utcOffsetSeconds: data.utc_offset_seconds,
      latitude: data.latitude,
      longitude: data.longitude,
      elevation: data.elevation,
      fetchedAt: Date.now(),
    },
    current,
    hourly,
    daily,
    minutely,
  };
}

async function fetchAirQuality(input: GeoLocationInput): Promise<AirQualityData> {
  const url = buildUrl(PROVIDER_URLS.airQuality, {
    latitude: input.latitude.toFixed(4),
    longitude: input.longitude.toFixed(4),
    timezone: "auto",
    forecast_days: 5,
    current: [
      "european_aqi",
      "us_aqi",
      "pm10",
      "pm2_5",
      "carbon_monoxide",
      "nitrogen_dioxide",
      "sulphur_dioxide",
      "ozone",
      "alder_pollen",
      "birch_pollen",
      "grass_pollen",
      "mugwort_pollen",
      "olive_pollen",
      "ragweed_pollen",
    ].join(","),
    hourly: ["european_aqi", "us_aqi", "pm2_5", "pm10"].join(","),
  });

  const raw = await fetchJson(url, { revalidate: 900, timeoutMs: 12_000 });
  const parsed = airQualityResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("The air quality response did not match the expected shape.", parsed.error);
  }
  const data = parsed.data;

  const current: AirQualityCurrent = {
    europeanAqi: nullableNumber(data.current.european_aqi),
    usAqi: nullableNumber(data.current.us_aqi),
    pm10: nullableNumber(data.current.pm10),
    pm25: nullableNumber(data.current.pm2_5),
    carbonMonoxide: nullableNumber(data.current.carbon_monoxide),
    nitrogenDioxide: nullableNumber(data.current.nitrogen_dioxide),
    sulphurDioxide: nullableNumber(data.current.sulphur_dioxide),
    ozone: nullableNumber(data.current.ozone),
    alderPollen: nullableNumber(data.current.alder_pollen),
    birchPollen: nullableNumber(data.current.birch_pollen),
    grassPollen: nullableNumber(data.current.grass_pollen),
    mugwortPollen: nullableNumber(data.current.mugwort_pollen),
    olivePollen: nullableNumber(data.current.olive_pollen),
    ragweedPollen: nullableNumber(data.current.ragweed_pollen),
  };

  const hourly: AirQualityPoint[] = data.hourly.time.map((time, index) => ({
    time,
    europeanAqi: nullableNumber(valueAt(data.hourly.european_aqi, index)),
    usAqi: nullableNumber(valueAt(data.hourly.us_aqi, index)),
    pm25: nullableNumber(valueAt(data.hourly.pm2_5, index)),
    pm10: nullableNumber(valueAt(data.hourly.pm10, index)),
  }));

  return { current, hourly, fetchedAt: Date.now() };
}

async function searchPlaces(query: string, language: "en" | "bn", count = 8): Promise<GeocodeResult[]> {
  const url = buildUrl(PROVIDER_URLS.geocoding, {
    name: query,
    count,
    language,
    format: "json",
  });
  const raw = await fetchJson(url, { revalidate: 86_400, timeoutMs: 9_000 });
  const parsed = geocodingResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("The geocoding response did not match the expected shape.", parsed.error);
  }
  return (parsed.data.results ?? []).map((result) => ({
    id: `geo-${result.id}`,
    name: result.name,
    country: result.country ?? "",
    countryCode: result.country_code,
    admin1: result.admin1,
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone ?? "auto",
    population: result.population,
    elevation: result.elevation,
    featureCode: result.feature_code,
  }));
}

async function reverseGeocode(
  latitude: number,
  longitude: number,
  language: "en" | "bn",
): Promise<Place | null> {
  const url = buildUrl("https://nominatim.openstreetmap.org/reverse", {
    format: "jsonv2",
    lat: latitude.toFixed(5),
    lon: longitude.toFixed(5),
    zoom: 10,
    addressdetails: 1,
    "accept-language": language === "bn" ? "bn,en" : "en",
  });
  try {
    const raw = await fetchJson(url, { revalidate: 86_400, timeoutMs: 8_000 });
    const parsed = nominatimResponseSchema.safeParse(raw);
    if (!parsed.success) return null;
    const data = parsed.data;
    const address = data.address;
    const name =
      address?.city ??
      address?.town ??
      address?.village ??
      address?.municipality ??
      address?.county ??
      address?.state ??
      data.name ??
      data.display_name?.split(",")[0]?.trim() ??
      `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    return {
      id: `pinned-${latitude.toFixed(5)}-${longitude.toFixed(5)}`,
      name,
      country: address?.country ?? "",
      countryCode: address?.country_code?.toUpperCase(),
      admin1: address?.state,
      latitude,
      longitude,
      timezone: "auto",
    };
  } catch {
    return {
      id: `pinned-${latitude.toFixed(5)}-${longitude.toFixed(5)}`,
      name: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
      country: "",
      latitude,
      longitude,
      timezone: "auto",
    };
  }
}

async function fetchRadar(): Promise<RadarData> {
  const raw = await fetchJson(PROVIDER_URLS.rainViewer, { revalidate: 300, timeoutMs: 9_000 });
  const parsed = rainViewerResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("The radar response did not match the expected shape.", parsed.error);
  }
  const data = parsed.data;
  return {
    host: data.host,
    generated: data.generated,
    past: (data.radar?.past ?? []).slice(-12),
    nowcast: (data.radar?.nowcast ?? []).slice(0, 6),
    satellite: (data.satellite?.infrared ?? []).slice(-6),
  };
}

async function fetchClimate(input: GeoLocationInput & { date: string }): Promise<ClimateComparison> {
  const year = Number(input.date.slice(0, 4));
  const monthDay = input.date.slice(5);
  const years = Array.from({ length: 5 }, (_, index) => year - 1 - index);

  const results = await Promise.allSettled(
    years.map(async (targetYear) => {
      const date = `${targetYear}-${monthDay}`;
      const url = buildUrl(PROVIDER_URLS.archive, {
        latitude: input.latitude.toFixed(4),
        longitude: input.longitude.toFixed(4),
        start_date: date,
        end_date: date,
        timezone: "auto",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
      });
      const raw = await fetchJson(url, { revalidate: 86_400, timeoutMs: 10_000 });
      const parsed = archiveResponseSchema.safeParse(raw);
      if (!parsed.success) throw new ValidationError("Archive response mismatch.", parsed.error);
      const index = parsed.data.daily.time.indexOf(date);
      if (index < 0) return null;
      return {
        year: targetYear,
        max: nullableNumber(valueAt(parsed.data.daily.temperature_2m_max, index)),
        min: nullableNumber(valueAt(parsed.data.daily.temperature_2m_min, index)),
        precipitation: nullableNumber(valueAt(parsed.data.daily.precipitation_sum, index)),
      };
    }),
  );

  const readings = results
    .filter((result): result is PromiseFulfilledResult<{
      year: number;
      max: number | null;
      min: number | null;
      precipitation: number | null;
    } | null> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const previousYear = readings.find((reading) => reading.year === year - 1) ?? null;
  const average = (values: Array<number | null>): number | null => {
    const valid = values.filter((value): value is number => value !== null);
    if (!valid.length) return null;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
  };

  return {
    lastYearDate: `${year - 1}-${monthDay}`,
    lastYearMax: previousYear?.max ?? null,
    lastYearMin: previousYear?.min ?? null,
    lastYearPrecipitation: previousYear?.precipitation ?? null,
    normalMax: average(readings.map((reading) => reading.max)),
    normalMin: average(readings.map((reading) => reading.min)),
    normalPrecipitation: average(readings.map((reading) => reading.precipitation)),
    yearsUsed: readings.length,
  };
}

async function fetchWindGrid(
  points: Array<[number, number]>,
): Promise<Array<{ latitude: number; longitude: number; temperature: number | null; windSpeed: number | null; windDirection: number | null }>> {
  const latitudes = points.map(([lat]) => lat.toFixed(3)).join(",");
  const longitudes = points.map(([, lon]) => lon.toFixed(3)).join(",");
  const url = buildUrl(PROVIDER_URLS.forecast, {
    latitude: latitudes,
    longitude: longitudes,
    current: "temperature_2m,wind_speed_10m,wind_direction_10m",
    timezone: "auto",
    forecast_days: 1,
  });
  const raw = await fetchJson(url, { revalidate: 300, timeoutMs: 10_000 });
  const parsed = multiPointSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("The map sample response did not match the expected shape.", parsed.error);
  }
  const list = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  return list.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    temperature: nullableNumber(point.current.temperature_2m),
    windSpeed: nullableNumber(point.current.wind_speed_10m),
    windDirection: nullableNumber(point.current.wind_direction_10m),
  }));
}

async function fetchFavoriteSummaries(
  points: Array<[number, number]>,
): Promise<FavoriteSummary[]> {
  const latitudes = points.map(([lat]) => lat.toFixed(4)).join(",");
  const longitudes = points.map(([, lon]) => lon.toFixed(4)).join(",");
  const url = buildUrl(PROVIDER_URLS.forecast, {
    latitude: latitudes,
    longitude: longitudes,
    timezone: "auto",
    forecast_days: 1,
    current: "temperature_2m,weather_code,is_day",
    hourly: "precipitation_probability",
  });
  const raw = await fetchJson(url, { revalidate: 600, timeoutMs: 10_000 });
  const parsed = favoriteSummariesResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      "The favorite summary response did not match the expected shape.",
      parsed.error,
    );
  }
  const list = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  return list.map((point, index) => {
    const nextHourIndex =
      point.hourly?.time?.findIndex((time) => time > point.current.time) ?? -1;
    // Open-Meteo can snap multi-location requests to a model grid. Keep the
    // caller's coordinates so client rows can match their summaries reliably.
    const input = points[index];
    return {
      latitude: input?.[0] ?? point.latitude,
      longitude: input?.[1] ?? point.longitude,
      temperature: nullableNumber(point.current.temperature_2m),
      conditionCode: numberFrom(point.current.weather_code, 2),
      isDay: numberFrom(point.current.is_day, 1) === 1,
      precipitationProbability:
        nextHourIndex >= 0
          ? nullableNumber(point.hourly?.precipitation_probability?.[nextHourIndex])
          : null,
    };
  });
}

export const openMeteoProvider: WeatherProvider = {
  name: "Open-Meteo",
  forecast: fetchForecast,
  airQuality: fetchAirQuality,
  searchPlaces,
  reverseGeocode,
  radar: fetchRadar,
  climate: fetchClimate,
  windGrid: fetchWindGrid,
  favoriteSummaries: fetchFavoriteSummaries,
};
