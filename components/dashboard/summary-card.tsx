"use client";

import {
  CloudSun,
  Droplets,
  Sparkles,
  Sun,
  Thermometer,
  Umbrella,
  Waves,
  Wind,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { buildSmartSummary, type SummaryIcon, type SummaryLine } from "@/lib/summary";
import type { WeatherData } from "@/types/weather";
import { cn } from "@/lib/utils";

const ICONS: Record<SummaryIcon, typeof Sun> = {
  rain: Umbrella,
  temperature: Thermometer,
  wind: Wind,
  uv: Sun,
  tomorrow: CloudSun,
  comfort: Droplets,
  dry: Waves,
};

const TONES: Record<SummaryLine["tone"], string> = {
  info: "border-line/10 bg-surface-quiet text-ice",
  warm: "border-solar/20 bg-solar/[0.07] text-solar",
  cool: "border-ice/20 bg-ice/[0.07] text-ice",
  caution: "border-danger/20 bg-danger/[0.07] text-danger",
};

export function SummaryCard({ weather }: { weather: WeatherData }) {
  const { t, td } = useI18n();
  const format = useFormat();
  const summary = buildSmartSummary(weather);

  return (
    <GlassCard className="relative flex h-full flex-col overflow-hidden">
      <div className="relative flex h-full flex-col">
        <WidgetHeader
          title={t("smartSummary")}
          subtitle={t("smartSummarySubtitle")}
          icon={<Sparkles className="h-4 w-4" />}
        />

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-aurora">
            {t(summary.greetingKey)}
          </p>
          <p className="mt-1.5 font-heading text-[1.35rem] font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-2xl">
            {td(summary.headline)}
            {summary.deltaC !== null && Math.abs(summary.deltaC) >= 0.8 ? (
              <span className="ml-2 inline-flex translate-y-[-2px] items-center rounded-full border border-solar/25 bg-solar/10 px-2 py-0.5 align-middle font-sans text-xs font-semibold tracking-normal text-solar">
                {summary.deltaC > 0 ? "+" : ""}
                {format.num(summary.deltaC, { maximumFractionDigits: 1 })}°
              </span>
            ) : null}
          </p>
        </div>

        <ul className="mt-5 space-y-2.5">
          {summary.lines.map((line) => {
            const Icon = ICONS[line.icon];
            let vars = line.vars;
            if (line.key === "windNote" && typeof vars?.time === "string") {
              vars = { ...vars, time: format.time(vars.time) };
            }
            if (line.key === "drySpellNote") {
              vars = {
                ...vars,
                start: format.hour(String(vars?.start ?? "")),
                end: format.hour(String(vars?.end ?? "")),
              };
            }
            if (line.key === "tomorrowNote" && typeof vars?.condition === "string") {
              vars = {
                ...vars,
                condition: td(vars.condition),
              };
            }
            return (
              <li
                key={line.key}
                className={cn("flex items-start gap-3 rounded-xl border px-3.5 py-3", TONES[line.tone])}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
                <p className="text-[13px] font-medium leading-relaxed text-ink/90">
                  {t(line.key, vars)}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/10 pt-4">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
            {t("umbrella")}
          </span>
          <span
            className={cn(
              "inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-bold",
              summary.umbrella
                ? "border-solar/30 bg-solar/10 text-solar"
                : "border-aurora/25 bg-aurora/10 text-aurora",
            )}
          >
            {summary.umbrella ? t("takeUmbrella") : t("noUmbrella")}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
