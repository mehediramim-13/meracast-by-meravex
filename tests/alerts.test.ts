import { describe, expect, it } from "vitest";
import { deriveAlerts } from "@/lib/alerts";
import { makeWeather } from "./fixtures/weather";

describe("deriveAlerts", () => {
  it("returns no advisories for a calm forecast", () => {
    expect(deriveAlerts(makeWeather())).toEqual([]);
  });

  it("raises heavy-rain, storm and flood advisories from sustained rainfall", () => {
    const weather = makeWeather({
      hourly: (hour, index) => {
        if (index >= 24) return {};
        return {
          precipitation: hour.precipitation + 6,
          rain: hour.rain + 6,
          precipitationProbability: 96,
          conditionCode: 95,
        };
      },
    });

    const alerts = deriveAlerts(weather);
    expect(alerts.map((alert) => alert.id)).toEqual(
      expect.arrayContaining(["heavy-rain", "storm", "flood"]),
    );
    const heavyRain = alerts.find((alert) => alert.id === "heavy-rain");
    expect(heavyRain?.severity).toBe("severe");
    expect(heavyRain?.values?.amount).toBe("144");
  });

  it("detects dangerous heat and labels the peak", () => {
    const weather = makeWeather({
      hourly: (_hour, index) =>
        index < 72 ? { apparentTemperature: 41, temperature: 39 } : {},
    });

    const heat = deriveAlerts(weather).find((alert) => alert.id === "heat");
    expect(heat?.severity).toBe("warning");
    expect(heat?.values?.value).toBe("41");
  });

  it("detects low visibility and gusty wind", () => {
    const foggy = makeWeather({
      hourly: (_hour, index) => (index < 3 ? { visibility: 250 } : {}),
    });
    expect(deriveAlerts(foggy).find((alert) => alert.id === "fog")?.severity).toBe("warning");

    const windy = makeWeather({
      hourly: (_hour, index) => (index < 2 ? { windGust: 96 } : {}),
    });
    const wind = deriveAlerts(windy).find((alert) => alert.id === "wind");
    expect(wind?.severity).toBe("severe");
    expect(wind?.values?.value).toBe("96");
  });

  it("sorts by severity and caps the list at four advisories", () => {
    const weather = makeWeather({
      hourly: (_hour, index) => {
        if (index >= 24) return {};
        return {
          precipitation: 7,
          rain: 7,
          precipitationProbability: 98,
          apparentTemperature: 42,
          windGust: 96,
          visibility: 200,
          conditionCode: 96,
        };
      },
    });

    const alerts = deriveAlerts(weather);
    expect(alerts.length).toBeLessThanOrEqual(4);
    const ranks = { advisory: 1, watch: 2, warning: 3, severe: 4 } as const;
    for (let index = 1; index < alerts.length; index += 1) {
      const previous = alerts[index - 1];
      const current = alerts[index];
      if (!previous || !current) continue;
      expect(ranks[previous.severity]).toBeGreaterThanOrEqual(ranks[current.severity]);
    }
  });
});
