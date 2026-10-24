"use client";

import { ArrowDownRight, ArrowUpRight, History, Minus, Thermometer } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { getTodayDaily } from "@/lib/weather";
import { cn } from "@/lib/utils";
import type { ClimateComparison, WeatherData } from "@/types/weather";

function direction(value: number | null): "up" | "down" | "flat" {
  if (value === null || Math.abs(value) < 0.5) return "flat";
  return value > 0 ? "up" : "down";
}

function DirectionIcon({ value }: { value: number | null }) {
  const dir = direction(value);
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  return <Icon className="h-3 w-3" />;
}

export function HistoryCard({
  weather,
  comparison,
  loading,
  error,
}: {
  weather: WeatherData;
  comparison: ClimateComparison | undefined;
  loading: boolean;
  error: boolean;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const today = getTodayDaily(weather);

  const maxDelta = comparison?.lastYearMax !== undefined && comparison?.lastYearMax !== null && today
    ? today.temperatureMax - comparison.lastYearMax
    : null;
  const normalDelta = comparison?.normalMax !== undefined && comparison?.normalMax !== null && today
    ? today.temperatureMax - comparison.normalMax
    : null;

  const rows = [
    {
      key: "current" as const,
      label: t("today"),
      high: today?.temperatureMax ?? null,
      low: today?.temperatureMin ?? null,
      tone: "text-solar",
    },
    {
      key: "last" as const,
      label: t("lastYear"),
      high: comparison?.lastYearMax ?? null,
      low: comparison?.lastYearMin ?? null,
      tone: "text-ice",
    },
    {
      key: "normal" as const,
      label: t("climateAverage"),
      high: comparison?.normalMax ?? null,
      low: comparison?.normalMin ?? null,
      tone: "text-muted",
    },
  ];
  const values = rows.flatMap((row) => [row.high, row.low]).filter((value): value is number => value !== null);
  const min = values.length ? Math.min(...values) - 2 : 0;
  const max = values.length ? Math.max(...values) + 2 : 1;

  return (
    <GlassCard className="relative flex h-full flex-col overflow-hidden">
      <WidgetHeader
        title={t("history")}
        subtitle={t("historySubtitle")}
        icon={<History className="h-4 w-4" />}
        action={
          <span className="hidden items-center gap-1 rounded-full border border-line/10 bg-surface-quiet px-2.5 py-1 text-xs font-semibold text-faint sm:inline-flex">
            <Thermometer className="h-3 w-3" />
            {t("climateAverage")}
          </span>
        }
      />

      {loading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-7 w-full" />
            </div>
          ))}
        </div>
      ) : error || !comparison ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line/15 px-4 py-7 text-center">
          <History className="mx-auto h-6 w-6 text-faint" />
          <p className="mt-2 text-sm font-semibold text-ink">{t("historyUnavailable")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("historyUnavailableBody")}</p>
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-3">
            {rows.map((row) => {
              if (row.high === null && row.low === null) return null;
              const high = row.high ?? row.low ?? 0;
              const low = row.low ?? high;
              const left = ((low - min) / (max - min)) * 100;
              const width = Math.max(5, ((high - low) / (max - min)) * 100);
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-xs font-semibold", row.tone)}>{row.label}</p>
                    <p className="text-xs font-semibold tabular text-ink">
                      {row.high !== null ? format.temp(row.high) : "—"}
                      <span className="mx-1 text-faint">/</span>
                      <span className="text-muted">{row.low !== null ? format.temp(row.low) : "—"}</span>
                    </p>
                  </div>
                  <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-surface-lift">
                    <div
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        left: `${Math.min(95, left)}%`,
                        width: `${Math.min(100 - left, width)}%`,
                        background:
                          row.key === "current"
                            ? "linear-gradient(90deg, rgb(var(--c-solar)), rgb(var(--c-danger)))"
                            : row.key === "last"
                              ? "linear-gradient(90deg, rgb(var(--c-ice)), rgb(var(--c-rain)))"
                              : "rgb(var(--c-faint) / 0.4)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/10 pt-3">
            <div className="rounded-xl bg-surface-quiet p-2.5">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-faint">
                {t("vsLastYear")}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink">
                <span className={cn("flex", (maxDelta ?? 0) > 0 ? "text-danger" : "text-ice")}>
                  <DirectionIcon value={maxDelta} />
                </span>
                {maxDelta !== null ? `${Math.abs(maxDelta).toFixed(1)}°` : "—"}{" "}
                <span className="font-normal text-muted">
                  {maxDelta !== null && Math.abs(maxDelta) >= 0.5
                    ? maxDelta > 0
                      ? t("warmer")
                      : t("cooler")
                    : t("normalClimatology")}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-surface-quiet p-2.5">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-faint">
                {t("vsNormal")}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink">
                <span
                  className={cn(
                    "flex",
                    normalDelta === null ? "text-faint" : normalDelta > 0 ? "text-danger" : "text-ice",
                  )}
                >
                  <DirectionIcon value={normalDelta} />
                </span>
                {normalDelta !== null ? `${Math.abs(normalDelta).toFixed(1)}°` : "—"}{" "}
                <span className="font-normal text-muted">
                  {normalDelta !== null && Math.abs(normalDelta) >= 0.5
                    ? normalDelta > 0
                      ? t("warmer")
                      : t("cooler")
                    : t("normalClimatology")}
                </span>
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs text-faint">
            {t("normalYears", { count: comparison.yearsUsed })}
            {comparison.lastYearDate ? ` · ${t("yearLabel", { year: comparison.lastYearDate.slice(0, 4) })}` : ""}
          </p>
        </>
      )}
    </GlassCard>
  );
}
