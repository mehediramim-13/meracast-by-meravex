"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { CloudRain, Droplets, LineChart, Thermometer, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { useNow, useOnScreen } from "@/hooks/use-environment";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { Segmented } from "@/components/ui/controls";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { getCondition } from "@/lib/weather-codes";
import { getUpcomingHourly } from "@/lib/weather";
import { epochToLocalIso } from "@/lib/format";
import { convertTemperature, convertWind } from "@/lib/units";
import { cn } from "@/lib/utils";
import type { ChartMode, HourlyChartPoint } from "@/components/charts/types";
import type { WeatherData } from "@/types/weather";

const HourlyChart = dynamic(
  () => import("@/components/charts/hourly-chart").then((module) => module.HourlyChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[13.5rem] items-center justify-center">
        <div className="skeleton h-28 w-full rounded-2xl" />
      </div>
    ),
  },
);

const OBSERVER_OPTIONS = { rootMargin: "180px" } as const;

export function HourlyForecast({ weather }: { weather: WeatherData }) {
  const { t, td } = useI18n();
  const format = useFormat();
  const now = useNow(60_000);
  const [mode, setMode] = useState<ChartMode>("temperature");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { ref, isOnScreen } = useOnScreen<HTMLDivElement>(OBSERVER_OPTIONS);

  const hours = useMemo(
    () =>
      getUpcomingHourly(
        weather,
        48,
        epochToLocalIso(now.getTime(), weather.meta.utcOffsetSeconds),
      ),
    [weather, now],
  );

  useEffect(() => {
    if (!hours.length) {
      setSelectedTime(null);
      return;
    }
    if (!selectedTime || !hours.some((hour) => hour.time === selectedTime)) {
      setSelectedTime(hours[0]?.time ?? null);
    }
  }, [hours, selectedTime]);

  const chartData = useMemo<HourlyChartPoint[]>(
    () =>
      hours.map((hour, index) => {
        const condition = getCondition(hour.conditionCode);
        return {
          time: hour.time,
          label: index === 0 ? t("now") : format.time(hour.time),
          axisLabel:
            hour.time.endsWith(":00") && (hour.time.slice(11, 13) === "00" || index % 3 === 0)
              ? format.hour(hour.time)
              : "",
          temp: Math.round(convertTemperature(hour.temperature, format.units.temperature)),
          rain: hour.precipitationProbability,
          wind: Math.round(convertWind(hour.windSpeed, format.units.wind)),
          conditionLabel: td(condition.labelKey),
        };
      }),
    [hours, format, t, td],
  );

  const selected = hours.find((hour) => hour.time === selectedTime) ?? hours[0] ?? null;
  const selectedCondition = selected ? getCondition(selected.conditionCode) : null;
  const unitLabel =
    mode === "precipitation"
      ? "%"
      : mode === "wind"
        ? format.windUnit
        : (format.tempUnit.replace("°", "") || "°");

  const modes = [
    {
      value: "temperature" as const,
      label: t("chartTemperature"),
      shortLabel: t("chartTemperatureShort"),
      icon: <Thermometer className="h-3.5 w-3.5" />,
    },
    {
      value: "precipitation" as const,
      label: t("chartPrecipitation"),
      shortLabel: t("chartPrecipitationShort"),
      icon: <Droplets className="h-3.5 w-3.5" />,
    },
    {
      value: "wind" as const,
      label: t("chartWind"),
      shortLabel: t("chartWindShort"),
      icon: <Wind className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <GlassCard className="overflow-hidden">
      <WidgetHeader
        title={t("hourlyForecast")}
        subtitle={t("next48Hours")}
        icon={<LineChart className="h-4 w-4" />}
        action={
          <Segmented
            options={modes}
            value={mode}
            onChange={setMode}
            ariaLabel={t("hourlyForecast")}
            size="sm"
          />
        }
      />

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {selectedCondition && selected ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line/10 bg-surface-quiet">
              <WeatherIcon
                kind={selectedCondition.icon}
                isDay={selected.isDay}
                size={30}
                animated={false}
              />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {selected ? (selected.time === hours[0]?.time ? t("now") : format.time(selected.time)) : "—"}
              {selected ? <span className="ml-2 text-xs font-normal text-muted">{format.shortDateTime(selected.time)}</span> : null}
            </p>
            <p className="truncate text-xs text-muted">
              {selectedCondition ? td(selectedCondition.labelKey) : ""}
              {selected ? ` · ${t("feelsLike")} ${format.temp(selected.apparentTemperature)}` : ""}
            </p>
          </div>
        </div>
        <p className="hidden shrink-0 text-xs font-medium text-faint sm:block">{t("chartTabHint")}</p>
      </div>

      <div ref={ref} className="mt-2">
        {isOnScreen ? (
          <HourlyChart
            data={chartData}
            mode={mode}
            unitLabel={unitLabel}
            selectedTime={selectedTime ?? ""}
            onSelect={setSelectedTime}
            emptyLabel={t("plannerNoData")}
            ariaLabel={`${t("hourlyForecast")} — ${t(
              mode === "precipitation" ? "chartPrecipitation" : mode === "wind" ? "chartWind" : "chartTemperature",
            )}`}
          />
        ) : (
          <div className="flex h-[13.5rem] items-end gap-1.5 px-2 pb-8 pt-6" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, index) => (
              <div
                key={index}
                className="skeleton flex-1 rounded-t-md"
                style={{ height: `${24 + ((index * 17) % 65)}%` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="-mx-5 mt-5 border-t border-line/10 pt-4 sm:-mx-6">
        <div className="mb-2 flex items-center justify-between px-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-faint">
            {t("scrollTimeline")}
          </p>
          <span className="text-xs font-medium text-faint">
            {t("hours", { count: format.num(hours.length) })}
          </span>
        </div>
        <div
          className="scroll-snap-x no-scrollbar mask-fade-x flex gap-2 overflow-x-auto px-5 pb-2 sm:px-6"
          role="listbox"
          aria-label={t("hourlyForecast")}
        >
          {hours.map((hour, index) => {
            const condition = getCondition(hour.conditionCode);
            const active = hour.time === selectedTime;
            return (
              <button
                key={hour.time}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={`${index === 0 ? t("now") : format.time(hour.time)}, ${td(
                  condition.labelKey,
                )}, ${format.temp(hour.temperature)}, ${format.percent(
                  hour.precipitationProbability,
                )}`}
                onClick={() => setSelectedTime(hour.time)}
                className={cn(
                  "scroll-snap-item pressable relative flex w-[4.65rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center transition-colors",
                  active
                    ? "border-aurora/35 bg-aurora/10"
                    : "border-line/10 bg-surface-quiet hover:border-line/20 hover:bg-surface-lift",
                )}
              >
                <span className={cn("text-xs font-semibold", active ? "text-aurora" : "text-muted")}>
                  {index === 0 ? t("now") : format.hour(hour.time)}
                </span>
                <WeatherIcon
                  kind={condition.icon}
                  isDay={hour.isDay}
                  size={32}
                  animated={false}
                  className="my-0.5 h-8 w-8"
                />
                <span className="text-sm font-bold tabular text-ink">{format.temp(hour.temperature)}</span>
                <span className="flex items-center gap-0.5 text-xs font-medium text-rain">
                  <Droplets className="h-2.5 w-2.5" />
                  {format.percent(hour.precipitationProbability)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl border border-line/10 bg-surface-quiet p-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-faint">{t("windSpeed")}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-ink">{format.wind(selected.windSpeed)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-faint">{t("precipitationLabel")}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-ink">{format.precip(selected.precipitation)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-faint">{t("uvIndex")}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-ink">
              {selected.uvIndex !== null ? format.num(selected.uvIndex, { maximumFractionDigits: 1 }) : "—"}
            </p>
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
}
