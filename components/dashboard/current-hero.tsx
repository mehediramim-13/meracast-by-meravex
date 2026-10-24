"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Cloud,
  Compass,
  Droplets,
  Eye,
  Gauge,
  Locate,
  MapPin,
  RefreshCw,
  Share2,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-environment";
import { useHaptics } from "@/hooks/use-haptics";
import { useUI } from "@/store/use-ui";
import { useSettings } from "@/store/use-settings";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { StatBox } from "@/components/ui/stat-box";
import { Badge } from "@/components/ui/tooltip";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { getCondition } from "@/lib/weather-codes";
import { getCurrentHourly, getTodayDaily, pressureDelta, compassDirection, yesterdayTemperatureDelta } from "@/lib/weather";
import { formatUtcTime, toBengaliDigits } from "@/lib/format";
import { pressureTrend, uvCategory } from "@/lib/units";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/types/weather";
import type { TranslationKey } from "@/i18n/en";

const UV_KEYS: Record<NonNullable<ReturnType<typeof uvCategory>>, TranslationKey> = {
  low: "uvLow",
  moderate: "uvModerate",
  high: "uvHigh",
  veryHigh: "uvVeryHigh",
  extreme: "uvExtreme",
};

export function CurrentHero({
  weather,
  onRefresh,
  refreshing,
}: {
  weather: WeatherData;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { t, language } = useI18n();
  const format = useFormat();
  const now = useNow(20_000);
  const vibrate = useHaptics();
  const openShare = useUI((state) => state.openShare);
  const bengaliNumerals = useSettings((state) => state.bengaliNumerals);
  const timeFormat = useSettings((state) => state.units.time);
  const [showAll, setShowAll] = useState(false);

  const condition = getCondition(weather.current.conditionCode);
  const today = getTodayDaily(weather);
  const hour = getCurrentHourly(weather);
  const clockRaw = formatUtcTime(now.getTime(), weather.place.timezone, timeFormat);
  const clock = bengaliNumerals ? toBengaliDigits(clockRaw) : clockRaw;
  const updated = formatUtcTime(weather.meta.fetchedAt, weather.place.timezone, timeFormat);
  const delta = pressureDelta(weather);
  const trend = pressureTrend(delta);
  const trendKey: TranslationKey =
    trend === "rising" ? "pressureTrendRising" : trend === "falling" ? "pressureTrendFalling" : "pressureTrendSteady";
  const uvValue = hour?.uvIndex ?? weather.current.uvIndex;
  const uvCategoryValue = uvValue !== null ? uvCategory(uvValue) : null;
  const tempDelta = yesterdayTemperatureDelta(weather);

  const metrics = [
    {
      icon: Thermometer,
      label: t("feelsLike"),
      value: format.temp(weather.current.apparentTemperature),
      detail: today ? `${t("high")} ${format.temp(today.temperatureMax)}` : undefined,
    },
    {
      icon: Wind,
      label: t("windSpeed"),
      value: format.wind(weather.current.windSpeed),
      detail: `${compassDirection(weather.current.windDirection, language)} · ${t("windGusts")} ${format.wind(weather.current.windGust)}`,
    },
    {
      icon: Droplets,
      label: t("humidity"),
      value: format.percent(weather.current.humidity),
      detail: weather.current.dewPoint !== null ? `${t("dewPoint")} ${format.temp(weather.current.dewPoint)}` : undefined,
    },
    {
      icon: Sun,
      label: t("uvIndex"),
      value: uvValue !== null ? format.num(uvValue, { maximumFractionDigits: 1 }) : "—",
      detail: uvCategoryValue ? t(UV_KEYS[uvCategoryValue]) : undefined,
    },
    {
      icon: Gauge,
      label: t("pressureLabel"),
      value: format.pressure(weather.current.pressure),
      detail: t(trendKey),
    },
    {
      icon: Eye,
      label: t("visibility"),
      value: weather.current.visibility !== null ? format.visibility(weather.current.visibility / 1000) : "—",
      detail: weather.current.visibility !== null && weather.current.visibility < 2000 ? t("condFog") : undefined,
    },
    {
      icon: Cloud,
      label: t("cloudCover"),
      value: format.percent(weather.current.cloudCover),
      detail: hour ? `${t("chanceOfRain")} ${format.percent(hour.precipitationProbability)}` : undefined,
    },
    {
      icon: Compass,
      label: t("windDirection"),
      value: compassDirection(weather.current.windDirection, language),
      detail: `${format.num(weather.current.windDirection)}°`,
    },
  ];

  return (
    <section
      className="relative isolate overflow-hidden rounded-3xl border border-line/15 bg-surface/85 shadow-glass"
      aria-labelledby="current-weather-title"
    >
      <div className="relative flex flex-col gap-8 p-5 sm:p-7 lg:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="aurora">
                <span className="h-1.5 w-1.5 rounded-full bg-aurora" />
                {t("currentConditions")}
              </Badge>
              <span className="text-xs font-medium text-ink/55">
                {t("updated", { time: updated })}
              </span>
            </div>
            <div className="mt-3 flex items-start gap-2.5">
              <MapPin className="mt-1.5 h-5 w-5 shrink-0 text-aurora" />
              <div className="min-w-0">
                <h1
                  id="current-weather-title"
                  className="truncate text-2xl font-bold tracking-[-0.04em] text-ink sm:text-3xl"
                >
                  {weather.place.name}
                </h1>
                <p className="mt-1 text-sm text-ink/60">
                  {[weather.place.admin1, weather.place.country].filter(Boolean).join(", ")}
                  <span className="mx-2 text-ink/25">·</span>
                  <span className="tabular">{clock}</span>
                  <span className="mx-2 text-ink/25">·</span>
                  {weather.meta.timezoneAbbreviation}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <FavoriteButton place={weather.place} showLabel />
            <button
              type="button"
              onClick={() => {
                vibrate(5);
                openShare("weather");
              }}
              className="pressable flex h-10 w-10 items-center justify-center rounded-xl border border-line/15 bg-surface-quiet text-muted transition-colors hover:bg-surface-lift hover:text-ink"
              aria-label={t("shareWeather")}
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                vibrate(5);
                onRefresh();
              }}
              className="pressable flex h-10 w-10 items-center justify-center rounded-xl border border-line/15 bg-surface-quiet text-muted transition-colors hover:bg-surface-lift hover:text-ink disabled:opacity-60"
              aria-label={t("refresh")}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1.18fr)_minmax(220px,0.82fr)]">
          <div>
            <div className="flex items-start gap-3">
              <div className="relative">
                <WeatherIcon
                  kind={condition.icon}
                  isDay={weather.current.isDay}
                  size={132}
                  className="relative h-[5.5rem] w-[5.5rem] sm:h-[7rem] sm:w-[7rem]"
                />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex items-start">
                  <AnimatedNumber
                    value={weather.current.temperature}
                    format={(value) => format.tempValue(value)}
                    className="text-[4.5rem] font-semibold leading-[0.86] tracking-[-0.05em] text-ink sm:text-[6rem]"
                  />
                  <span className="mt-2 text-2xl font-normal text-ink/65 sm:text-3xl">°</span>
                  <span className="mt-3 ml-1 text-sm font-semibold text-ink/50">
                    {format.tempUnit.replace("°", "")}
                  </span>
                </div>
                <p className="mt-2 font-heading text-xl font-semibold leading-tight text-ink/90 sm:text-2xl">
                  {t(condition.labelKey)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink/60">
                  <span>
                    {t("feelsLike")}{" "}
                    <strong className="font-semibold text-ink/90">
                      {format.temp(weather.current.apparentTemperature)}
                    </strong>
                  </span>
                  {today ? (
                    <span className="flex items-center gap-1.5">
                      {t("high")}{" "}
                      <strong className="font-semibold text-ink/90">{format.temp(today.temperatureMax)}</strong>
                      {t("low")}{" "}
                      <strong className="font-semibold text-ink/90">{format.temp(today.temperatureMin)}</strong>
                    </span>
                  ) : null}
                  {hour ? (
                    <span className="flex items-center gap-1">
                      <Droplets className="h-3.5 w-3.5 text-rain" />
                      {format.percent(hour.precipitationProbability)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {metrics.slice(0, 4).map((metric) => (
              <MetricTile key={metric.label} {...metric} />
            ))}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="pressable focus-ring flex items-center gap-1.5 rounded-lg text-xs font-semibold uppercase tracking-[0.08em] text-faint transition-colors hover:text-ink"
            aria-expanded={showAll}
          >
            <span className="h-px w-5 bg-line/30" aria-hidden="true" />
            {showAll ? t("fewerDetails") : t("moreDetails")}
          </button>
          <AnimatePresence initial={false}>
            {showAll ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-4">
                  {metrics.slice(4).map((metric) => (
                    <MetricTile key={metric.label} {...metric} />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/15 pt-4 text-xs text-ink/40">
          <span className="flex items-center gap-1.5">
            <Locate className="h-3 w-3" />
            {weather.place.latitude.toFixed(3)}°, {weather.place.longitude.toFixed(3)}°
          </span>
          <span className="flex items-center gap-1.5">
            <Thermometer className="h-3 w-3" />
            {tempDelta !== null ? (
              <>
                {tempDelta > 0 ? "+" : ""}
                {format.num(tempDelta, { maximumFractionDigits: 1 })}° {t("sinceYesterday")}
              </>
            ) : (
              t("localTime")
            )}
          </span>
        </div>
      </div>
    </section>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <StatBox
      className="rounded-2xl border-line/15 p-3.5"
      label={
        <span className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-aurora/80" />
          {label}
        </span>
      }
      value={value}
      detail={detail}
    />
  );
}
