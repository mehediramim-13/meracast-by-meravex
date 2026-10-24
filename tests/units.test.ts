import { describe, expect, it } from "vitest";
import {
  cToF,
  convertPrecipitation,
  convertPressure,
  convertTemperature,
  convertVisibility,
  convertWind,
  euAqiCategory,
  fToC,
  pressureTrend,
  usAqiCategory,
  uvCategory,
} from "@/lib/units";

describe("unit conversions", () => {
  it("converts temperature in both directions", () => {
    expect(cToF(0)).toBe(32);
    expect(fToC(212)).toBe(100);
    expect(convertTemperature(25, "f")).toBeCloseTo(77);
    expect(convertTemperature(25, "c")).toBe(25);
  });

  it("converts wind, rain, pressure and visibility", () => {
    expect(convertWind(100, "mph")).toBeCloseTo(62.14, 1);
    expect(convertWind(100, "ms")).toBeCloseTo(27.78, 1);
    expect(convertWind(100, "kn")).toBeCloseTo(54, 1);
    expect(convertWind(100, "kmh")).toBe(100);
    expect(convertPrecipitation(25.4, "in")).toBeCloseTo(1, 3);
    expect(convertPressure(1013.25, "inhg")).toBeCloseTo(29.92, 2);
    expect(convertVisibility(10, "f")).toBeCloseTo(6.21, 2);
  });
});

describe("weather categories", () => {
  it("classifies UV, US AQI and EU AQI at their boundaries", () => {
    expect(uvCategory(0)).toBe("low");
    expect(uvCategory(3)).toBe("moderate");
    expect(uvCategory(6)).toBe("high");
    expect(uvCategory(8)).toBe("veryHigh");
    expect(uvCategory(11)).toBe("extreme");

    expect(usAqiCategory(50)).toBe("good");
    expect(usAqiCategory(51)).toBe("moderate");
    expect(usAqiCategory(151)).toBe("unhealthy");
    expect(usAqiCategory(301)).toBe("hazardous");

    expect(euAqiCategory(20)).toBe("good");
    expect(euAqiCategory(21)).toBe("moderate");
    expect(euAqiCategory(101)).toBe("hazardous");
  });

  it("classifies pressure trends around the one-hPa dead band", () => {
    expect(pressureTrend(1.1)).toBe("rising");
    expect(pressureTrend(-1.1)).toBe("falling");
    expect(pressureTrend(0.4)).toBe("steady");
    expect(pressureTrend(-1)).toBe("steady");
  });
});
