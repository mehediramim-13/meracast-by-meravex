"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/provider";
import { useSettings } from "@/store/use-settings";
import {
  formatDuration,
  formatFullDate,
  formatLocalHour,
  formatLocalTime,
  formatMonthDay,
  formatNumber,
  formatPrecipValue,
  formatPressureValue,
  formatShortDateTime,
  formatTemperature,
  formatTemperatureValue,
  formatVisibilityValue,
  formatWeekday,
  formatWindValue,
  relativeDayKey,
} from "@/lib/format";
import {
  convertWind,
  decimalPlacesForPrecip,
  decimalPlacesForPressure,
  decimalPlacesForWind,
  pressureUnitLabels,
  precipUnitLabels,
  temperatureUnitLabels,
  windUnitLabels,
} from "@/lib/units";

export interface WeatherFormat {
  language: "en" | "bn";
  bengaliNumerals: boolean;
  units: {
    temperature: "c" | "f";
    wind: "kmh" | "mph" | "ms" | "kn";
    precipitation: "mm" | "in";
    pressure: "hpa" | "inhg";
    time: "12h" | "24h";
  };
  num: (
    value: number,
    options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; signDisplay?: "auto" | "always" | "exceptZero" | "never" },
  ) => string;
  temp: (valueC: number) => string;
  tempValue: (valueC: number) => string;
  wind: (kmh: number) => string;
  windValue: (kmh: number) => number;
  precip: (mm: number) => string;
  precipValue: (mm: number) => number;
  pressure: (hpa: number) => string;
  visibility: (km: number) => string;
  percent: (value: number) => string;
  time: (iso: string) => string;
  hour: (iso: string) => string;
  date: (isoDate: string) => string;
  weekday: (isoDate: string) => string;
  monthDay: (isoDate: string) => string;
  fullDate: (isoDate: string) => string;
  shortDateTime: (iso: string) => string;
  duration: (seconds: number) => string;
  dayLabel: (isoDate: string, todayIso: string) => string;
  tempUnit: string;
  windUnit: string;
  precipUnit: string;
  pressureUnit: string;
}

export function useFormat(): WeatherFormat {
  const { t, language } = useI18n();
  const units = useSettings((state) => state.units);
  const bengaliNumerals = useSettings((state) => state.bengaliNumerals);

  return useMemo<WeatherFormat>(() => {
    const numberOptions = { language, bengaliNumerals };
    const am = t("am");
    const pm = t("pm");
    const clockOptions = { ...numberOptions, timeFormat: units.time, am, pm };

    return {
      language,
      bengaliNumerals,
      units,
      num: (value, options) =>
        formatNumber(value, {
          ...numberOptions,
          ...options,
        }),
      temp: (valueC) => formatTemperature(valueC, units.temperature, numberOptions),
      tempValue: (valueC) => formatTemperatureValue(valueC, units.temperature, numberOptions),
      wind: (kmh) =>
        `${formatWindValue(kmh, units.wind, numberOptions)} ${windUnitLabels[units.wind]}`,
      windValue: (kmh) => convertWind(kmh, units.wind),
      precip: (mm) =>
        `${formatPrecipValue(mm, units.precipitation, numberOptions)} ${precipUnitLabels[units.precipitation]}`,
      precipValue: (mm) =>
        Number(
          (units.precipitation === "in" ? mm * 0.0393701 : mm).toFixed(
            decimalPlacesForPrecip(units.precipitation),
          ),
        ),
      pressure: (hpa) =>
        `${formatPressureValue(hpa, units.pressure, numberOptions)} ${pressureUnitLabels[units.pressure]}`,
      visibility: (km) =>
        `${formatVisibilityValue(km, units.temperature, numberOptions)} ${
          units.temperature === "f" ? "mi" : "km"
        }`,
      percent: (value) => `${formatNumber(Math.round(value), numberOptions)}%`,
      time: (iso) => formatLocalTime(iso, clockOptions),
      hour: (iso) => formatLocalHour(iso, clockOptions),
      date: (isoDate) => formatWeekday(isoDate, language),
      weekday: (isoDate) => formatWeekday(isoDate, language, "long"),
      monthDay: (isoDate) => formatMonthDay(isoDate, language, bengaliNumerals),
      fullDate: (isoDate) => formatFullDate(isoDate, language, bengaliNumerals),
      shortDateTime: (iso) => formatShortDateTime(iso, language, bengaliNumerals),
      duration: (seconds) => formatDuration(seconds, language, bengaliNumerals),
      dayLabel: (isoDate, todayIso) => {
        const key = relativeDayKey(isoDate, todayIso);
        if (key === "other") return `${formatWeekday(isoDate, language)} ${formatMonthDay(isoDate, language, bengaliNumerals)}`;
        return t(key);
      },
      tempUnit: temperatureUnitLabels[units.temperature],
      windUnit: t(
        units.wind === "kmh" ? "kmh" : units.wind === "mph" ? "mph" : units.wind === "ms" ? "ms" : "knots",
      ),
      precipUnit: t(units.precipitation === "mm" ? "mm" : "inches"),
      pressureUnit: t(units.pressure === "hpa" ? "hpa" : "inhg"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, bengaliNumerals, language, t]);
}

export function windDecimalPlaces(unit: "kmh" | "mph" | "ms" | "kn"): number {
  return decimalPlacesForWind(unit);
}

export function pressureDecimals(unit: "hpa" | "inhg"): number {
  return decimalPlacesForPressure(unit);
}
