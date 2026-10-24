import { z } from "zod";

const nullableNumberArray = z.array(z.number().nullable()).optional();

export const forecastResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  generationtime_ms: z.number().optional(),
  utc_offset_seconds: z.number(),
  timezone: z.string(),
  timezone_abbreviation: z.string(),
  elevation: z.number(),
  current_units: z.record(z.string(), z.string()).optional(),
  current: z.object({
    time: z.string(),
    interval: z.number().optional(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number().optional(),
    apparent_temperature: z.number().optional(),
    is_day: z.number().optional(),
    precipitation: z.number().optional(),
    rain: z.number().optional(),
    showers: z.number().optional(),
    snowfall: z.number().optional(),
    weather_code: z.number().optional(),
    cloud_cover: z.number().optional(),
    pressure_msl: z.number().optional(),
    surface_pressure: z.number().optional(),
    wind_speed_10m: z.number().optional(),
    wind_direction_10m: z.number().optional(),
    wind_gusts_10m: z.number().optional(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: nullableNumberArray,
    relative_humidity_2m: nullableNumberArray,
    dew_point_2m: nullableNumberArray,
    apparent_temperature: nullableNumberArray,
    precipitation_probability: nullableNumberArray,
    precipitation: nullableNumberArray,
    rain: nullableNumberArray,
    showers: nullableNumberArray,
    snowfall: nullableNumberArray,
    snow_depth: nullableNumberArray,
    weather_code: nullableNumberArray,
    pressure_msl: nullableNumberArray,
    cloud_cover: nullableNumberArray,
    visibility: nullableNumberArray,
    wind_speed_10m: nullableNumberArray,
    wind_direction_10m: nullableNumberArray,
    wind_gusts_10m: nullableNumberArray,
    uv_index: nullableNumberArray,
    is_day: nullableNumberArray,
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: nullableNumberArray,
    temperature_2m_max: nullableNumberArray,
    temperature_2m_min: nullableNumberArray,
    apparent_temperature_max: nullableNumberArray,
    apparent_temperature_min: nullableNumberArray,
    sunrise: z.array(z.string()).optional(),
    sunset: z.array(z.string()).optional(),
    daylight_duration: nullableNumberArray,
    sunshine_duration: nullableNumberArray,
    uv_index_max: nullableNumberArray,
    precipitation_sum: nullableNumberArray,
    rain_sum: nullableNumberArray,
    showers_sum: nullableNumberArray,
    snowfall_sum: nullableNumberArray,
    precipitation_hours: nullableNumberArray,
    precipitation_probability_max: nullableNumberArray,
    wind_speed_10m_max: nullableNumberArray,
    wind_gusts_10m_max: nullableNumberArray,
    wind_direction_10m_dominant: nullableNumberArray,
  }),
  minutely_15: z
    .object({
      time: z.array(z.string()),
      precipitation: nullableNumberArray,
      precipitation_probability: nullableNumberArray,
      weather_code: nullableNumberArray,
      temperature_2m: nullableNumberArray,
      wind_speed_10m: nullableNumberArray,
    })
    .optional(),
});

export const airQualityResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  utc_offset_seconds: z.number(),
  timezone: z.string(),
  current: z.object({
    time: z.string().optional(),
    european_aqi: z.number().nullable().optional(),
    us_aqi: z.number().nullable().optional(),
    pm10: z.number().nullable().optional(),
    pm2_5: z.number().nullable().optional(),
    carbon_monoxide: z.number().nullable().optional(),
    nitrogen_dioxide: z.number().nullable().optional(),
    sulphur_dioxide: z.number().nullable().optional(),
    ozone: z.number().nullable().optional(),
    alder_pollen: z.number().nullable().optional(),
    birch_pollen: z.number().nullable().optional(),
    grass_pollen: z.number().nullable().optional(),
    mugwort_pollen: z.number().nullable().optional(),
    olive_pollen: z.number().nullable().optional(),
    ragweed_pollen: z.number().nullable().optional(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    european_aqi: nullableNumberArray,
    us_aqi: nullableNumberArray,
    pm2_5: nullableNumberArray,
    pm10: nullableNumberArray,
  }),
});

export const geocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        elevation: z.number().optional(),
        feature_code: z.string().optional(),
        country_code: z.string().optional(),
        country: z.string().optional(),
        admin1: z.string().optional(),
        admin2: z.string().optional(),
        timezone: z.string().optional(),
        population: z.number().optional(),
      }),
    )
    .optional(),
});

export const archiveResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: nullableNumberArray,
    temperature_2m_min: nullableNumberArray,
    precipitation_sum: nullableNumberArray,
  }),
});

const rainViewerFrameSchema = z.object({
  time: z.number(),
  path: z.string(),
});

export const rainViewerResponseSchema = z.object({
  version: z.string().optional(),
  generated: z.number(),
  host: z.string(),
  radar: z
    .object({
      past: z.array(rainViewerFrameSchema).optional(),
      nowcast: z.array(rainViewerFrameSchema).optional(),
    })
    .optional(),
  satellite: z
    .object({
      infrared: z.array(rainViewerFrameSchema).optional(),
    })
    .optional(),
});

export const nominatimResponseSchema = z.object({
  place_id: z.number().optional(),
  lat: z.string().optional(),
  lon: z.string().optional(),
  display_name: z.string().optional(),
  name: z.string().optional(),
  address: z
    .object({
      city: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
      municipality: z.string().optional(),
      county: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      country_code: z.string().optional(),
    })
    .optional(),
});

export const multiPointSchema = z.union([
  z.object({
    latitude: z.number(),
    longitude: z.number(),
    current: z.object({
      temperature_2m: z.number().nullable().optional(),
      wind_speed_10m: z.number().nullable().optional(),
      wind_direction_10m: z.number().nullable().optional(),
    }),
  }),
  z.array(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      current: z.object({
        temperature_2m: z.number().nullable().optional(),
        wind_speed_10m: z.number().nullable().optional(),
        wind_direction_10m: z.number().nullable().optional(),
      }),
    }),
  ),
]);

const favoriteSummaryPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  current: z.object({
    time: z.string(),
    temperature_2m: z.number().nullable().optional(),
    weather_code: z.number().nullable().optional(),
    is_day: z.number().nullable().optional(),
  }),
  hourly: z
    .object({
      time: z.array(z.string()).optional(),
      precipitation_probability: z.array(z.number().nullable()).optional(),
    })
    .optional(),
});

export const favoriteSummariesResponseSchema = z.union([
  favoriteSummaryPointSchema,
  z.array(favoriteSummaryPointSchema),
]);

export const coordinatesQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  name: z.string().trim().min(1).max(120).optional(),
  country: z.string().trim().max(120).optional(),
  countryCode: z.string().trim().max(4).optional(),
  admin1: z.string().trim().max(160).optional(),
});

export const geocodeQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  lang: z.enum(["en", "bn"]).optional(),
  count: z.coerce.number().min(1).max(12).optional(),
});

export const historyQuerySchema = coordinatesQuerySchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const gridQuerySchema = z.object({
  points: z
    .string()
    .transform((value) =>
      value
        .split(";")
        .map((pair) => pair.split(",").map(Number))
        .filter((pair) => pair.length === 2 && pair.every(Number.isFinite)),
    )
    .pipe(z.array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])).min(1).max(36)),
});

export const favoritesQuerySchema = z.object({
  points: z
    .string()
    .transform((value) =>
      value
        .split(";")
        .map((pair) => pair.split(",").map(Number))
        .filter((pair) => pair.length === 2 && pair.every(Number.isFinite)),
    )
    .pipe(z.array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])).min(1).max(12)),
});

export const reverseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  lang: z.enum(["en", "bn"]).optional(),
});
