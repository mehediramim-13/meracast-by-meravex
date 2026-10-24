import { describe, expect, it } from "vitest";
import { computeNowcast, nowcastDryWindow, nowcastWindowTotal } from "@/lib/nowcast";
import type { MinutelyPoint } from "@/types/weather";

const NOW = "2026-10-22T12:00";

function series(values: number[], probability = 60): MinutelyPoint[] {
  return values.map((precipitation, index) => {
    const minutes = index * 15;
    const hour = 12 + Math.floor(minutes / 60);
    const minute = minutes % 60;
    return {
      time: `2026-10-22T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      precipitation,
      precipitationProbability: precipitation > 0 ? probability : 5,
      conditionCode: precipitation > 0 ? 61 : 2,
      temperature: 27,
      windSpeed: 8,
    };
  });
}

describe("computeNowcast", () => {
  it("reports a dry window when nothing is falling", () => {
    const outlook = computeNowcast(series([0, 0, 0, 0, 0, 0, 0, 0]), 0, NOW);
    expect(outlook.state).toBe("dry");
    expect(outlook.headlineKey).toBe("noRainSoon");
    expect(outlook.maxIntensity).toBe("dry");
    expect(outlook.series).toHaveLength(8);
  });

  it("detects rain starting after two dry frames", () => {
    const outlook = computeNowcast(
      series([0, 0, 0.2, 0.4, 0.6, 0.5, 0.2, 0.1]),
      0,
      NOW,
    );
    expect(outlook.state).toBe("starting");
    expect(outlook.minutes).toBe(30);
    expect(outlook.headlineKey).toBe("rainStartingIn");
    expect(outlook.maxIntensity).toBe("moderate");
  });

  it("detects rain stopping after two dry frames", () => {
    const outlook = computeNowcast(series([0.3, 0.5, 0, 0, 0, 0, 0, 0]), 0, NOW);
    expect(outlook.state).toBe("stopping");
    expect(outlook.minutes).toBe(30);
    expect(outlook.headlineKey).toBe("rainStoppingIn");
  });

  it("keeps rain continuing when the series stays wet", () => {
    const outlook = computeNowcast(series([0.4, 0.6, 0.8, 0.9, 0.7, 0.5, 0.3, 0.2]), 0, NOW);
    expect(outlook.state).toBe("raining");
    expect(outlook.minutes).toBeNull();
    expect(outlook.headlineKey).toBe("rainContinuing");
  });

  it("labels heavy rain and picks the heavy body copy", () => {
    const outlook = computeNowcast(series([0, 0, 2, 2, 2, 2, 2, 2]), 0, NOW);
    expect(outlook.maxIntensity).toBe("heavy");
    expect(outlook.bodyKey).toBe("nowcastHeavyBody");
  });

  it("handles an empty minutely series", () => {
    const outlook = computeNowcast([], 0, NOW);
    expect(outlook.state).toBe("dry");
    expect(outlook.series).toEqual([]);
    expect(outlook.maxProbability).toBe(0);
  });
});

describe("nowcast helpers", () => {
  it("sums the precipitation in the window", () => {
    const outlook = computeNowcast(series([0.1, 0.2, 0, 0, 0, 0, 0, 0]), 0, NOW);
    expect(nowcastWindowTotal(outlook.series)).toBeCloseTo(0.3);
  });

  it("finds the first and last dry frames below the risk threshold", () => {
    const outlook = computeNowcast(series([0, 0, 0.3, 0.4, 0, 0, 0, 0], 40), 0, NOW);
    expect(nowcastDryWindow(outlook.series)).toEqual({
      start: "2026-10-22T12:00",
      end: "2026-10-22T13:45",
    });
  });
});
