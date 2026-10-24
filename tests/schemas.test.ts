import { describe, expect, it } from "vitest";
import {
  airQualityResponseSchema,
  forecastResponseSchema,
  geocodingResponseSchema,
  rainViewerResponseSchema,
} from "@/lib/api/schemas";

const forecast = {
  latitude: 23.81,
  longitude: 90.41,
  utc_offset_seconds: 21_600,
  timezone: "Asia/Dhaka",
  timezone_abbreviation: "+06",
  elevation: 8,
  current: {
    time: "2026-10-22T12:00",
    temperature_2m: 29.4,
    relative_humidity_2m: 70,
    weather_code: 2,
  },
  hourly: {
    time: ["2026-10-22T12:00"],
    temperature_2m: [29.4],
    precipitation: [0],
  },
  daily: {
    time: ["2026-10-22"],
    temperature_2m_max: [32],
    temperature_2m_min: [24],
  },
};

describe("provider schemas", () => {
  it("accepts a minimal Open-Meteo forecast", () => {
    const result = forecastResponseSchema.safeParse(forecast);
    expect(result.success).toBe(true);
  });

  it("rejects a forecast without required current temperature", () => {
    const invalid = {
      ...forecast,
      current: { time: "2026-10-22T12:00" },
    };
    expect(forecastResponseSchema.safeParse(invalid).success).toBe(false);
  });

  it("accepts a partially populated air-quality response", () => {
    const result = airQualityResponseSchema.safeParse({
      latitude: 23.81,
      longitude: 90.41,
      utc_offset_seconds: 21_600,
      timezone: "Asia/Dhaka",
      current: { european_aqi: 42, us_aqi: null },
      hourly: { time: [], european_aqi: [], us_aqi: [], pm2_5: [], pm10: [] },
    });
    expect(result.success).toBe(true);
  });

  it("normalises geocoding results", () => {
    const parsed = geocodingResponseSchema.parse({
      results: [
        {
          id: 1185241,
          name: "Dhaka",
          latitude: 23.7104,
          longitude: 90.4074,
          country_code: "BD",
          country: "Bangladesh",
          timezone: "Asia/Dhaka",
        },
      ],
    });
    expect(parsed.results?.[0]?.name).toBe("Dhaka");
    expect(parsed.results?.[0]?.country_code).toBe("BD");
  });

  it("accepts RainViewer frames and tolerates empty arrays", () => {
    const parsed = rainViewerResponseSchema.parse({
      version: "2.0",
      generated: 1_760_000_000,
      host: "https://tilecache.rainviewer.com",
      radar: {
        past: [{ time: 1_760_000_000, path: "/v2/radar/abc" }],
        nowcast: [],
      },
      satellite: { infrared: [] },
    });
    expect(parsed.radar?.past?.[0]?.path).toBe("/v2/radar/abc");
    expect(parsed.radar?.nowcast).toEqual([]);
  });
});
