"use client";

import { Leaf, Wind } from "lucide-react";
import { useId } from "react";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { RingGauge } from "@/components/ui/ring-gauge";
import { buildAqiSummary, type AqiSummary } from "@/lib/indices";
import { cn } from "@/lib/utils";
import type { AirQualityData } from "@/types/weather";

const CATEGORY_COLORS: Record<AqiSummary["category"], string> = {
  good: "#5eead4",
  moderate: "#ffd38a",
  "unhealthy-sensitive": "#ffb86b",
  unhealthy: "#ff7474",
  "very-unhealthy": "#c084fc",
  hazardous: "#fb7185",
};

export function AirQualityCard({
  air,
  loading,
  error,
}: {
  air: AirQualityData | null | undefined;
  loading: boolean;
  error: boolean;
}) {
  const { t, language } = useI18n();
  const format = useFormat();
  const id = useId().replace(/:/g, "");
  const summary = buildAqiSummary(air ?? null);

  if (loading) {
    return (
      <GlassCard>
        <WidgetHeader
          title={t("airQuality")}
          subtitle={t("airQualitySubtitle")}
          icon={<Leaf className="h-4 w-4" />}
        />
        <div className="mt-5 flex items-center gap-5">
          <div className="skeleton h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (!summary || error) {
    return (
      <GlassCard>
        <WidgetHeader
          title={t("airQuality")}
          subtitle={t("airQualitySubtitle")}
          icon={<Leaf className="h-4 w-4" />}
        />
        <div className="mt-6 rounded-2xl border border-dashed border-line/15 px-4 py-8 text-center">
          <Wind className="mx-auto h-6 w-6 text-faint" />
          <p className="mt-2 text-sm font-semibold text-ink">{t("aqiUnavailable")}</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
            {t("aqiUnavailableBody")}
          </p>
        </div>
      </GlassCard>
    );
  }

  const color = CATEGORY_COLORS[summary.category];
  const max = summary.scale === "us" ? 300 : 100;
  const categoryLabel = t(summary.categoryKey as Parameters<typeof t>[0]);
  const gaugeLabel = t(
    (summary.category === "unhealthy-sensitive" ? "aqiSensitiveShort" : summary.categoryKey) as Parameters<typeof t>[0],
  );
  const hourly = air?.hourly.slice(0, 24) ?? [];
  const maxHourly = Math.max(...hourly.map((point) => point.usAqi ?? point.europeanAqi ?? 0), summary.aqi, 1);

  return (
    <GlassCard className="relative flex h-full flex-col overflow-hidden">
      <WidgetHeader
        title={t("airQuality")}
        subtitle={t("airQualitySubtitle")}
        icon={<Leaf className="h-4 w-4" />}
        action={
          <span className="text-xs font-medium uppercase tracking-[0.06em] text-faint">
            {summary.scale === "us" ? t("usAqi") : t("euAqi")}
          </span>
        }
      />

      <div className="mt-5 flex items-center gap-4">
        <RingGauge
          value={summary.aqi}
          max={max}
          valueLabel={format.num(summary.aqi)}
          label={gaugeLabel}
          ariaLabel={`${format.num(summary.aqi)} ${categoryLabel}`}
          language={language}
          size={128}
          strokeColor={color}
          wrapLabel
          labelTransform="uppercase"
          labelLetterSpacing={0.02}
          labelScale={0.92}
        />

        <div className="min-w-0">
          <p className="font-heading text-lg font-semibold leading-tight text-ink">
            {categoryLabel}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {t(summary.adviceKey as Parameters<typeof t>[0])}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip !min-h-6 !px-2 !text-xs">
              {t("pollen")} · {t(summary.pollenLevelKey)}
            </span>
            <span className="chip !min-h-6 !px-2 !text-xs">
              PM2.5 · {summary.pollutants[0]?.value !== null && summary.pollutants[0]?.value !== undefined ? `${format.num(summary.pollutants[0].value, { maximumFractionDigits: 1 })} µg/m³` : "—"}
            </span>
          </div>
        </div>
      </div>

      {hourly.length > 3 ? (
        <div className="mt-4">
          <div className="flex items-end justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">
              {t("next48Hours")}
            </p>
            <span className="text-xs text-faint">{t("usAqi")}</span>
          </div>
          <div className="mt-2 flex h-12 items-end gap-1" aria-hidden="true">
            {hourly.map((point, index) => {
              const value = point.usAqi ?? point.europeanAqi ?? 0;
              const height = Math.max(8, (value / maxHourly) * 100);
              return (
                <span
                  key={`${point.time}-${index}`}
                  className="flex-1 rounded-t-[3px]"
                  style={{
                    height: `${height}%`,
                    backgroundColor: color,
                    opacity: 0.22 + (index / hourly.length) * 0.6,
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/10 pt-3">
        {summary.pollutants.map((pollutant) => (
          <div key={pollutant.key} className="min-w-0 rounded-lg bg-surface-quiet px-2 py-1.5">
            <p className="truncate text-xs font-semibold text-faint">{t(pollutant.labelKey)}</p>
            <p className="mt-0.5 truncate text-xs font-bold tabular text-ink">
              {pollutant.value !== null ? format.num(pollutant.value, { maximumFractionDigits: 1 }) : "—"}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-faint">µg/m³ · Open-Meteo CAMS</p>
      <span id={`aqi-${id}`} className="sr-only">
        {t(summary.adviceKey as Parameters<typeof t>[0])}
      </span>
    </GlassCard>
  );
}
