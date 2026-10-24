"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloudRain, CloudSun, Umbrella } from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { StatBox } from "@/components/ui/stat-box";
import { computeNowcast, nowcastWindowTotal, type NowcastSeriesPoint } from "@/lib/nowcast";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/types/weather";

const FULL_CHART_HEIGHT = 96;
const DRY_CHART_HEIGHT = 64;

/**
 * The API supplies eight 15-minute points. Bars are rendered as 15-minute
 * intervals from the axis origin, not as a stretched SVG. Axis labels sit in
 * an HTML layer using the same percentage geometry, so the first label can be
 * flush to the plot edge and the rest stay centered under their ticks.
 */
function NowcastChart({
  series,
  isWet,
  maxPrecip,
  windowMinutes,
}: {
  series: NowcastSeriesPoint[];
  isWet: boolean;
  maxPrecip: number;
  windowMinutes: number;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const reduceMotion = useReducedMotion();

  if (!isWet) {
    return (
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-xl border border-line/10 bg-surface-quiet/40"
        style={{ height: DRY_CHART_HEIGHT }}
        role="img"
        aria-label={t("nowcastChartLabel")}
      >
        <span className="absolute inset-x-4 bottom-3 h-px bg-line/25" aria-hidden="true" />
        <span className="relative rounded-full border border-line/10 bg-surface/70 px-3 py-1 text-xs font-medium text-muted">
          {t("nowcastDryShort")}
        </span>
      </div>
    );
  }

  const cadence =
    series.length > 1
      ? Math.max(1, series[1]!.minutes - series[0]!.minutes)
      : Math.max(1, windowMinutes / Math.max(series.length, 1));
  const barWidth = Math.min(30, (cadence / windowMinutes) * 100);
  const middleTicks = [2, 4, 6]
    .map((index) => series[index])
    .filter((point): point is NowcastSeriesPoint => Boolean(point));

  return (
    <div role="img" aria-label={t("nowcastChartLabel")}>
      <div className="relative" style={{ height: FULL_CHART_HEIGHT }} aria-hidden="true">
        <span className="absolute inset-x-0 bottom-0 h-px bg-line/20" />
        {middleTicks.map((point) => (
          <span
            key={`tick-${point.time}`}
            className="absolute bottom-0 h-1.5 w-px bg-line/15"
            style={{ left: `${(point.minutes / windowMinutes) * 100}%` }}
          />
        ))}
        {series.map((point, index) => {
          const ratio = Math.min(1, point.precipitation / maxPrecip);
          const height = Math.max(point.precipitation > 0 ? 6 : 2, ratio * FULL_CHART_HEIGHT * 0.84);
          return (
            <motion.span
              key={point.time}
              className={cn(
                "absolute bottom-0 origin-bottom rounded-t-[3px]",
                point.intensity === "dry" && "bg-line/20",
              )}
              style={{
                left: `${(point.minutes / windowMinutes) * 100}%`,
                width: `calc(${barWidth}% - 3px)`,
                height,
                background:
                  point.intensity === "dry"
                    ? undefined
                    : "linear-gradient(180deg, rgb(var(--c-rain) / 0.95), rgb(var(--c-ice) / 0.35))",
              }}
              initial={reduceMotion ? false : { opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.34, delay: index * 0.025, ease: "easeOut" }}
            />
          );
        })}
      </div>

      <div className="relative mt-2 h-4 text-xs font-medium tabular text-faint">
        <span className="absolute left-0 top-0 whitespace-nowrap">{t("now")}</span>
        {middleTicks.map((point, index) => (
          <span
            key={`label-${point.time}`}
            className={cn(
              "absolute top-0 -translate-x-1/2 whitespace-nowrap",
              index !== 1 && "hidden sm:inline",
            )}
            style={{ left: `${(point.minutes / windowMinutes) * 100}%` }}
          >
            {format.time(point.time)}
          </span>
        ))}
        <span className="absolute right-0 top-0 whitespace-nowrap">
          {t("minutes", { count: format.num(windowMinutes) })}
        </span>
      </div>
    </div>
  );
}

export function NowcastCard({ weather }: { weather: WeatherData }) {
  const { t } = useI18n();
  const format = useFormat();
  const reduceMotion = useReducedMotion();
  const outlook = useMemo(
    () => computeNowcast(weather.minutely, weather.meta.utcOffsetSeconds),
    [weather],
  );
  const total = nowcastWindowTotal(outlook.series);
  const maxPrecip = Math.max(...outlook.series.map((point) => point.precipitation), 0.6);
  const peakChance = outlook.maxProbability;
  const hasSeries = outlook.series.length > 0;
  const isWet = outlook.state !== "dry" || total >= 0.05;

  const headline =
    outlook.minutes !== null
      ? t(outlook.headlineKey, { minutes: format.num(outlook.minutes) })
      : t(outlook.headlineKey);

  return (
    <GlassCard className="relative flex h-full flex-col overflow-hidden">
      <WidgetHeader
        title={t("nowcast")}
        subtitle={t("nowcastSubtitle")}
        icon={<CloudRain className="h-4 w-4" />}
        action={
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em]",
              isWet
                ? "border-rain/30 bg-rain/10 text-rain"
                : "border-aurora/25 bg-aurora/10 text-aurora",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", isWet ? "bg-rain" : "bg-aurora")} />
            {isWet ? t("plannerWetSlot") : t("plannerDrySlot")}
          </span>
        }
      />

      <div className="mt-5 flex items-start gap-3.5">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
            isWet
              ? "border-rain/25 bg-rain/10 text-rain"
              : "border-solar/25 bg-solar/10 text-solar",
          )}
        >
          {isWet ? <Umbrella className="h-5 w-5" /> : <CloudSun className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-snug tracking-[-0.025em] text-ink">{headline}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t(outlook.bodyKey)}</p>
        </div>
      </div>

      <div className="mt-5 flex-1">
        {hasSeries ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isWet ? "wet" : "dry"}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
            >
              <NowcastChart
                series={outlook.series}
                isWet={isWet}
                maxPrecip={maxPrecip}
                windowMinutes={outlook.windowMinutes || 120}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="rounded-xl border border-dashed border-line/15 px-4 py-6 text-center text-xs text-muted">
            {t("plannerNoData")}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatBox label={t("plannerProbability")} value={format.percent(peakChance)} />
        <StatBox label={t("totalRain")} value={format.precip(total)} />
      </div>
    </GlassCard>
  );
}
