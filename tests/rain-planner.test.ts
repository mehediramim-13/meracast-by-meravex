import { describe, expect, it } from "vitest";
import { addDaysToIsoDate } from "@/lib/format";
import {
  activityProfile,
  addHours,
  evaluatePlanner,
  parsePlannerUrlState,
  plannerBounds,
} from "@/lib/rain-planner";
import type { PlannerInput } from "@/types/planner";
import { hourOf, makeWeather, todayOf } from "./fixtures/weather";

function inputFor(weather: ReturnType<typeof makeWeather>, overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    date: todayOf(weather),
    time: hourOf(weather),
    endDate: todayOf(weather),
    endTime: hourOf(weather),
    mode: "single",
    activity: "general",
    ...overrides,
  };
}

describe("evaluatePlanner", () => {
  it("calls a dry hour dry and recommends going", () => {
    const weather = makeWeather();
    const result = evaluatePlanner(weather, inputFor(weather));
    expect(result).not.toBeNull();
    expect(result?.assessment.verdict).toBe("no");
    expect(result?.assessment.suitability).toBe("go");
    expect(result?.assessment.confidence).toBeGreaterThanOrEqual(75);
    expect(result?.assessment.verdictKey).toBe("plannerAnswerNo");
  });

  it("calls heavy rain a yes and an avoid", () => {
    const weather = makeWeather({
      hourly: (_hour, index) =>
        index < 24 ? { precipitation: 2, precipitationProbability: 85 } : {},
    });
    const result = evaluatePlanner(weather, inputFor(weather));
    expect(result?.assessment.verdict).toBe("yes");
    expect(result?.assessment.suitability).toBe("avoid");
    expect(result?.assessment.probability).toBe(85);
  });

  it("applies activity-specific thresholds to the same forecast", () => {
    const weather = makeWeather({
      hourly: (_hour, index) =>
        index < 48 ? { precipitationProbability: 40, precipitation: 0 } : {},
    });
    const general = evaluatePlanner(weather, inputFor(weather, { activity: "general" }));
    const cricket = evaluatePlanner(weather, inputFor(weather, { activity: "cricket" }));
    expect(general?.assessment.verdict).toBe("unlikely");
    expect(cricket?.assessment.verdict).toBe("likely");
    expect(activityProfile("cricket").maxPrecipProbability).toBe(30);
  });

  it("builds a three-hour range window", () => {
    const weather = makeWeather();
    const start = hourOf(weather);
    const end = addHours(todayOf(weather), start, 3);
    const result = evaluatePlanner(
      weather,
      inputFor(weather, {
        mode: "range",
        endDate: end.date,
        endTime: end.time,
      }),
    );
    expect(result?.range).not.toBeNull();
    expect(result?.range?.totalHours).toBe(3);
    expect(result?.range?.dryHours).toBe(3);
  });

  it("returns null beyond the forecast horizon", () => {
    const weather = makeWeather();
    const bounds = plannerBounds(weather);
    const result = evaluatePlanner(
      weather,
      inputFor(weather, { date: addDaysToIsoDate(bounds.maxDate, 1) }),
    );
    expect(result).toBeNull();
  });

  it("marks the confidence lower far out", () => {
    const weather = makeWeather();
    const bounds = plannerBounds(weather);
    const result = evaluatePlanner(
      weather,
      inputFor(weather, {
        date: addDaysToIsoDate(bounds.today, 12),
        time: "12:00",
        endDate: addDaysToIsoDate(bounds.today, 12),
        endTime: "15:00",
      }),
    );
    expect(result?.assessment.confidence).toBeLessThan(50);
    expect(result?.assessment.confidenceLabelKey).toBe("plannerConfidenceLow");
  });
});

describe("parsePlannerUrlState", () => {
  it("accepts valid values and rejects malformed ones", () => {
    const state = parsePlannerUrlState(
      new URLSearchParams({
        date: "2026-10-22",
        time: "14:30",
        endDate: "not-a-date",
        endTime: "25:00",
        mode: "range",
        activity: "cricket",
      }),
    );
    expect(state).toEqual({
      date: "2026-10-22",
      time: "14:30",
      mode: "range",
      activity: "cricket",
    });
  });

  it("drops unknown activities and modes", () => {
    const state = parsePlannerUrlState({
      date: "2026-10-22",
      activity: "spaceflight",
      mode: "weekend",
    });
    expect(state).toEqual({ date: "2026-10-22" });
  });
});
