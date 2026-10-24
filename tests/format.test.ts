import { describe, expect, it } from "vitest";
import {
  addDaysToIsoDate,
  diffIsoDates,
  formatLocalTime,
  formatMonthDay,
  formatNumber,
  formatPrecipValue,
  formatPressureValue,
  formatTemperature,
  formatTemperatureValue,
  formatUtcTime,
  formatWeekday,
  formatWindValue,
  toBengaliDigits,
  toLatinDigits,
} from "@/lib/format";

describe("Bengali digits", () => {
  it("converts Latin digits and back", () => {
    expect(toBengaliDigits("2026-10-22")).toBe("২০২৬-১০-২২");
    expect(toLatinDigits("২০২৬-১০-২২")).toBe("2026-10-22");
  });

  it("formats numbers with Bengali numerals when requested", () => {
    expect(formatNumber(1234, { bengaliNumerals: true })).toBe("১,২৩৪");
    expect(formatNumber(12.6, { maximumFractionDigits: 1 })).toBe("12.6");
    expect(formatNumber(12.6, { maximumFractionDigits: 0 })).toBe("13");
    expect(formatNumber(12.6, { maximumFractionDigits: 0, bengaliNumerals: true })).toBe("১৩");
  });
});

describe("weather unit formatting", () => {
  it("converts temperatures between Celsius and Fahrenheit", () => {
    expect(formatTemperatureValue(0, "c")).toBe("0");
    expect(formatTemperatureValue(0, "f")).toBe("32");
    expect(formatTemperature(100, "c")).toBe("100°");
    expect(formatTemperature(37, "f")).toBe("99°");
  });

  it("converts wind, rain and pressure", () => {
    expect(formatWindValue(100, "kmh")).toBe("100");
    expect(formatWindValue(100, "mph")).toBe("62");
    expect(formatWindValue(100, "ms")).toBe("27.8");
    expect(formatWindValue(100, "kn")).toBe("54");
    expect(formatPrecipValue(25.4, "in")).toBe("1");
    expect(formatPrecipValue(2.5, "mm")).toBe("2.5");
    expect(formatPressureValue(1013.25, "inhg")).toBe("29.92");
  });
});

describe("local clock formatting", () => {
  it("formats 12-hour and 24-hour local ISO strings", () => {
    expect(formatLocalTime("2026-10-22T00:05")).toBe("12:05 AM");
    expect(formatLocalTime("2026-10-22T13:07", { timeFormat: "24h" })).toBe("13:07");
    expect(formatLocalTime("2026-10-22T13:07", { timeFormat: "24h", bengaliNumerals: true })).toBe(
      "১৩:০৭",
    );
  });

  it("formats UTC epoch values in a requested timezone", () => {
    const epoch = Date.UTC(2026, 9, 22, 12, 30);
    expect(formatUtcTime(epoch, "UTC", "24h")).toBe("12:30");
    expect(formatUtcTime(epoch, "UTC", "12h")).toBe("12:30 PM");
    expect(formatUtcTime(epoch, "Asia/Dhaka", "24h")).toBe("18:30");
  });
});

describe("date helpers", () => {
  it("moves across month boundaries without timezone drift", () => {
    expect(addDaysToIsoDate("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysToIsoDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(diffIsoDates("2026-11-01", "2026-10-31")).toBe(1);
  });

  it("formats weekdays and month days in both languages", () => {
    expect(formatWeekday("2026-10-22", "en")).toBe("Thu");
    expect(formatWeekday("2026-10-22", "bn")).toBe("বৃহঃ");
    expect(formatMonthDay("2026-10-22", "en", false, "long")).toBe("October 22");
    expect(formatMonthDay("2026-10-22", "bn", true, "long")).toBe("২২ অক্টোবর");
  });
});
