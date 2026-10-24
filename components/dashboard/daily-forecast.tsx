"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  Droplets,
  Sun,
  Sunrise,
  Sunset,
  Wind,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { WeatherDetailsGrid } from "@/components/weather/weather-detail";
import { getCondition } from "@/lib/weather-codes";
import { getDailyFromToday, todayFor } from "@/lib/weather";
import { cn } from "@/lib/utils";
import type { DailyPoint, WeatherData } from "@/types/weather";

export function DailyForecast({ weather }: { weather: WeatherData }) {
  const { t, td } = useI18n();
  const format = useFormat();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const days = useMemo(() => getDailyFromToday(weather, 16), [weather]);
  const todayIso = todayFor(weather);
  const visibleDays = showAll ? days : days.slice(0, 7);
  const range = useMemo(() => {
    const values = days.flatMap((day) => [day.temperatureMin, day.temperatureMax]);
    if (!values.length) return { min: 0, max: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min: min - 1, max: max + 1 > min ? max + 1 : min + 2 };
  }, [days]);

  return (
    <GlassCard className="overflow-hidden">
      <WidgetHeader
        title={t("dailyForecast")}
        subtitle={t("nextDays", { count: format.num(days.length) })}
        icon={<CalendarDays className="h-4 w-4" />}
        action={
          <span className="hidden items-center gap-1 rounded-full border border-line/10 bg-surface-quiet px-2.5 py-1 text-xs font-semibold text-muted sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-ice" />
            {t("tempRange")}
          </span>
        }
      />

      <div className="mt-4 divide-y divide-line/[0.08]">
        {visibleDays.map((day) => (
          <DayRow
            key={day.date}
            day={day}
            todayIso={todayIso}
            range={range}
            expanded={expanded === day.date}
            onToggle={() => setExpanded(expanded === day.date ? null : day.date)}
            labels={{
              expand: t("expandDay", { day: format.dayLabel(day.date, todayIso) }),
              precipitation: t("precipitationLabel"),
              high: t("high"),
              low: t("low"),
              sunrise: t("sunrise"),
              sunset: t("sunset"),
              maxChance: t("maxChance"),
              totalRain: t("totalRain"),
              windMax: t("windMax"),
              uvMax: t("uvMax"),
              detail: t("dailyDetails"),
              condition: td(getCondition(day.conditionCode).labelKey),
            }}
            format={format}
          />
        ))}
      </div>

      {days.length > 7 ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="pressable focus-ring mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line/10 bg-surface-quiet py-2.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-lift hover:text-ink"
          aria-expanded={showAll}
        >
          {showAll ? t("fewerDetails") : t("nextDays", { count: format.num(16) })}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAll && "rotate-180")} />
        </button>
      ) : null}
    </GlassCard>
  );
}

function DayRow({
  day,
  todayIso,
  range,
  expanded,
  onToggle,
  labels,
  format,
}: {
  day: DailyPoint;
  todayIso: string;
  range: { min: number; max: number };
  expanded: boolean;
  onToggle: () => void;
  labels: {
    expand: string;
    precipitation: string;
    high: string;
    low: string;
    sunrise: string;
    sunset: string;
    maxChance: string;
    totalRain: string;
    windMax: string;
    uvMax: string;
    detail: string;
    condition: string;
  };
  format: ReturnType<typeof useFormat>;
}) {
  const { td } = useI18n();
  const condition = getCondition(day.conditionCode);
  const left = ((day.temperatureMin - range.min) / (range.max - range.min)) * 100;
  const width = Math.max(
    5,
    ((day.temperatureMax - day.temperatureMin) / (range.max - range.min)) * 100,
  );
  const dayLabel = format.dayLabel(day.date, todayIso);

  return (
    <div className={cn("py-1", expanded && "bg-surface-quiet")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={labels.expand}
        className="pressable-soft focus-ring grid w-full grid-cols-[4.2rem_1.8rem_minmax(0,1fr)_3.6rem_1.1rem] items-center gap-2 rounded-xl px-1.5 py-2.5 text-left transition-colors hover:bg-surface-quiet sm:grid-cols-[5.4rem_2.1rem_minmax(0,1fr)_4.2rem_1.2rem] sm:gap-3"
      >
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{dayLabel}</p>
          <p className="mt-0.5 text-xs font-medium text-faint">{format.monthDay(day.date)}</p>
        </div>

        <span className="flex h-8 w-8 items-center justify-center">
          <WeatherIcon kind={condition.icon} isDay size={30} animated={false} />
        </span>

        <div className="relative flex h-8 items-center">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-quiet">
            <div
              className="absolute inset-y-0 rounded-full"
              style={{
                left: `${left}%`,
                width: `${Math.min(100 - left, width)}%`,
                background: `linear-gradient(90deg, rgb(var(--c-ice)), rgb(var(--c-solar)))`,
              }}
            />
          </div>
          <div className="ml-2 hidden shrink-0 items-center gap-1 text-xs tabular sm:flex">
            <span className="font-semibold text-ink">{format.temp(day.temperatureMax)}</span>
            <span className="text-faint">/</span>
            <span className="font-medium text-muted">{format.temp(day.temperatureMin)}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-end gap-0.5 text-right">
          <span className="flex items-center gap-0.5 whitespace-nowrap text-[0.6875rem] font-semibold tabular text-ink sm:hidden">
            {format.temp(day.temperatureMax)}
            <span className="font-medium text-faint">{format.temp(day.temperatureMin)}</span>
          </span>
          <span className="flex items-center gap-0.5 text-xs font-medium tabular text-rain">
            <Droplets className="h-2.5 w-2.5" />
            {format.percent(day.precipitationProbabilityMax)}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 text-faint transition-transform duration-200",
            expanded && "rotate-180 text-aurora",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-1.5 pb-3 pt-1">
              <div className="rounded-xl border border-line/10 bg-surface-quiet p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">
                    {labels.detail}
                  </p>
                  <p className="text-xs font-medium text-muted">{td(condition.labelKey)}</p>
                </div>
                <WeatherDetailsGrid
                  items={[
                    {
                      icon: <Sunrise className="h-3.5 w-3.5" />,
                      label: labels.sunrise,
                      value: format.time(day.sunrise),
                    },
                    {
                      icon: <Sunset className="h-3.5 w-3.5" />,
                      label: labels.sunset,
                      value: format.time(day.sunset),
                    },
                    {
                      icon: <Droplets className="h-3.5 w-3.5" />,
                      label: labels.maxChance,
                      value: format.percent(day.precipitationProbabilityMax),
                    },
                    {
                      icon: <Droplets className="h-3.5 w-3.5" />,
                      label: labels.totalRain,
                      value: format.precip(day.precipitationSum),
                    },
                    {
                      icon: <Wind className="h-3.5 w-3.5" />,
                      label: labels.windMax,
                      value: format.wind(day.windSpeedMax),
                    },
                    {
                      icon: <Sun className="h-3.5 w-3.5" />,
                      label: labels.uvMax,
                      value:
                        day.uvIndexMax !== null
                          ? format.num(day.uvIndexMax, { maximumFractionDigits: 1 })
                          : "—",
                    },
                  ]}
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
