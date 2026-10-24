"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CloudSun,
  Droplets,
  Gauge,
  Info,
  MapPin,
  Share2,
  Sparkles,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
} from "lucide-react";
import { useFormat } from "@/hooks/use-format";
import { useI18n } from "@/i18n/provider";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { StatBox } from "@/components/ui/stat-box";
import { Badge } from "@/components/ui/tooltip";
import { ConfidenceGauge } from "@/components/ui/confidence-gauge";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/en";
import type { WeatherData } from "@/types/weather";
import type {
  ActivityProfile,
  PlannerReason,
  PlannerResult,
  PlannerSuitability,
  PlannerWindow,
} from "@/types/planner";

const TONE: Record<
  PlannerSuitability,
  {
    border: string;
    bg: string;
    text: string;
    soft: string;
    badge: "aurora" | "solar" | "danger";
    icon: typeof Umbrella;
  }
> = {
  go: {
    border: "border-aurora/25",
    bg: "bg-aurora/[0.07]",
    text: "text-aurora",
    soft: "bg-aurora/10 text-aurora",
    badge: "aurora",
    icon: Sun,
  },
  caution: {
    border: "border-solar/25",
    bg: "bg-solar/[0.07]",
    text: "text-solar",
    soft: "bg-solar/10 text-solar",
    badge: "solar",
    icon: CloudSun,
  },
  avoid: {
    border: "border-danger/25",
    bg: "bg-danger/[0.07]",
    text: "text-danger",
    soft: "bg-danger/10 text-danger",
    badge: "danger",
    icon: Umbrella,
  },
};

const REASON_TONE = {
  good: { icon: CheckCircle2, className: "border-aurora/20 bg-aurora/[0.055] text-aurora" },
  info: { icon: Info, className: "border-ice/20 bg-ice/[0.055] text-ice" },
  caution: { icon: AlertTriangle, className: "border-solar/20 bg-solar/[0.055] text-solar" },
} as const;

interface PlannerResultPanelProps {
  weather: WeatherData;
  result: PlannerResult;
  activity: ActivityProfile;
  onUseWindow: (window: PlannerWindow) => void;
  onPickSlot: (iso: string) => void;
  onShare: () => void;
}

export function PlannerResultPanel({
  weather,
  result,
  activity,
  onUseWindow,
  onPickSlot,
  onShare,
}: PlannerResultPanelProps) {
  const { t, td, language } = useI18n();
  const format = useFormat();
  const assessment = result.assessment;
  const tone = TONE[assessment.suitability];
  const ToneIcon = tone.icon;
  const targetHour = assessment.targetIso.slice(0, 13);
  const maxProbability = Math.max(
    ...result.slots.map((slot) => slot.precipitationProbability),
    10,
  );

  const reasonVars = (reason: PlannerReason): Record<string, string | number> | undefined => {
    if (!reason.vars) return undefined;
    const vars = { ...reason.vars };
    if (reason.key === "planReasonHot" || reason.key === "planReasonCold") {
      const celsius = Number(reason.vars.temp);
      if (Number.isFinite(celsius)) vars.temp = format.tempValue(celsius);
    }
    if (reason.key === "planReasonClearWindow" && typeof reason.vars.time === "string") {
      vars.time = format.time(reason.vars.time);
    }
    return vars;
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <GlassCard
        padding="none"
        className={cn("relative overflow-hidden border", tone.border)}
      >
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={tone.badge}>
                  <ToneIcon className="h-3 w-3" />
                  {t("plannerVerdictLabel")}
                </Badge>
                <span className="text-xs font-medium text-muted">
                  {t("plannerActivityAdvice", { activity: td(activity.labelKey) })}
                </span>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted">
                <MapPin className="h-3.5 w-3.5 text-aurora" />
                <span className="font-semibold text-ink">{weather.place.name}</span>
                <span className="text-faint">·</span>
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{format.fullDate(result.date)}</span>
                <span className="text-faint">·</span>
                <span>{format.time(assessment.targetIso)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onShare}
              className="pressable focus-ring flex min-h-9 items-center gap-1.5 rounded-xl border border-line/15 bg-surface-quiet px-3 text-xs font-semibold text-muted transition-colors hover:bg-surface-lift hover:text-ink"
            >
              <Share2 className="h-3.5 w-3.5" />
              {t("plannerShare")}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className={cn("break-words font-heading text-[2rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[3rem]", tone.text)}>
                {t(assessment.verdictKey as TranslationKey)}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                {t(assessment.headlineKey as TranslationKey)}
              </p>
              <div className={cn("mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold", tone.border, tone.bg, tone.text)}>
                <ToneIcon className="h-3.5 w-3.5" />
                {t(assessment.adviceKey as TranslationKey)}
              </div>
            </div>

            <div className="flex items-center gap-4 sm:flex-col sm:gap-2">
              <ConfidenceGauge
                value={assessment.confidence}
                valueLabel={format.percent(assessment.confidence)}
                label={t("plannerConfidenceShort")}
                language={language}
                toneClassName={tone.text}
              />
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", tone.border, tone.bg, tone.text)}>
                {t(assessment.confidenceLabelKey as TranslationKey)}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric
              icon={Droplets}
              label={t("plannerProbability")}
              value={format.percent(assessment.probability)}
            />
            <Metric
              icon={Umbrella}
              label={t("plannerAmount")}
              value={format.precip(assessment.precipitation)}
            />
            <Metric
              icon={Thermometer}
              label={t("plannerTemp")}
              value={format.temp(assessment.temperature)}
              detail={`${t("feelsLike")} ${format.temp(assessment.feelsLike)}`}
            />
            <Metric
              icon={Wind}
              label={t("plannerWind")}
              value={format.wind(assessment.windSpeed)}
              detail={`${t("windGusts")} ${format.wind(assessment.windGust)}`}
            />
          </div>

          {result.range ? (
            <div className="mt-4 rounded-2xl border border-line/12 bg-surface-quiet p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
                  {t("plannerRangeSummary")}
                </p>
                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold", tone.border, tone.bg, tone.text)}>
                  {t("plannerRangeVerdict", {
                    wet: format.num(result.range.totalHours - result.range.dryHours),
                    total: format.num(result.range.totalHours),
                  })}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <RangeMetric label={t("plannerWetHours")} value={format.num(result.range.totalHours - result.range.dryHours)} />
                <RangeMetric label={t("plannerDryHours")} value={format.num(result.range.dryHours)} />
                <RangeMetric label={t("plannerTotalRain")} value={format.precip(result.range.totalPrecipitation)} />
              </div>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface-lift">
                <motion.span
                  className="h-full w-full origin-left rounded-full bg-aurora/70"
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX:
                      Math.max(0, result.range.dryHours) /
                      Math.max(1, result.range.totalHours),
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-5 border-t border-line/10 pt-4">
            <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.08em] text-faint">
              {t("plannerReasons")}
            </p>
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {assessment.reasons.map((reason, index) => {
                const reasonTone = REASON_TONE[reason.tone];
                const ReasonIcon = reasonTone.icon;
                return (
                  <motion.li
                    key={`${reason.key}-${index}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.3 }}
                    className={cn(
                      "flex items-start gap-2 rounded-xl border px-2.5 py-2 text-xs leading-relaxed",
                      reasonTone.className,
                    )}
                  >
                    <ReasonIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="text-ink/85">
                      {td(reason.key, undefined, reasonVars(reason))}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
            <Gauge className="h-3 w-3" />
            {t("plannerConfidenceNote")}
          </p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <GlassCard className="min-w-0">
          <WidgetHeader
            title={t("plannerBestWindows")}
            subtitle={t("plannerBestWindowNote")}
            icon={<Sparkles className="h-4 w-4" />}
          />
          {result.bestWindows.length ? (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {result.bestWindows.map((window) => (
                <div
                  key={window.startIso}
                  className="rounded-xl border border-line/12 bg-surface-quiet p-3"
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-ink">
                      {format.time(window.startIso)}
                    </p>
                    <span className="rounded-full bg-aurora/10 px-1.5 py-0.5 text-xs font-bold text-aurora">
                      {format.percent(window.maxProbability)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {format.hour(window.startIso)}–{format.hour(window.endIso)} · {t("plannerDryHours")}{" "}
                    {format.num(window.dryHours)}/{format.num(window.totalHours)}
                  </p>
                  <button
                    type="button"
                    onClick={() => onUseWindow(window)}
                    className="pressable focus-ring mt-2 min-h-7 w-full rounded-lg border border-aurora/20 bg-aurora/[0.07] px-2 text-xs font-bold text-aurora transition-colors hover:bg-aurora/[0.12]"
                  >
                    {t("plannerUseThis")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-line/15 px-3 py-6 text-center">
              <p className="text-xs font-semibold text-ink">{t("plannerNoBestWindow")}</p>
              <p className="mt-1 text-xs text-muted">{t("plannerWindowHint")}</p>
            </div>
          )}
        </GlassCard>

        <GlassCard className="min-w-0">
          <WidgetHeader
            title={t("plannerAround")}
            subtitle={t("plannerTimeLocalNote", { city: weather.place.name })}
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <div className="mt-4 flex items-end gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="group" aria-label={t("plannerTimelineTitle")}>
            {result.slots.map((slot) => {
              const active = slot.time.slice(0, 13) === targetHour;
              const height = Math.max(
                5,
                Math.round((slot.precipitationProbability / maxProbability) * 62),
              );
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => onPickSlot(slot.time)}
                  aria-label={`${format.time(slot.time)}, ${format.percent(slot.precipitationProbability)} ${t("plannerProbability")}`}
                  aria-pressed={active}
                  className={cn(
                    "pressable group flex min-w-[3.1rem] flex-1 flex-col items-center rounded-lg border px-1 pb-1 pt-1.5 transition-colors",
                    active
                      ? "border-aurora/40 bg-aurora/[0.09]"
                      : "border-transparent hover:border-line/15 hover:bg-surface-quiet",
                  )}
                >
                  <span className="text-xs font-bold tabular text-muted group-hover:text-ink">
                    {format.percent(slot.precipitationProbability)}
                  </span>
                  <span className="mt-1 flex h-[4rem] w-full items-end justify-center">
                    <span
                      className={cn(
                        "w-3.5 rounded-t-[4px] transition-colors",
                        slot.precipitationProbability >= 60
                          ? "bg-rain/80"
                          : slot.precipitationProbability >= 30
                            ? "bg-solar/80"
                            : "bg-aurora/60",
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      "mt-1.5 whitespace-nowrap text-xs font-semibold",
                      active ? "text-aurora" : "text-faint",
                    )}
                  >
                    {format.hour(slot.time)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-faint">{t("plannerTimelineHint")}</p>
          <div className="mt-3 flex items-center justify-between text-xs font-medium text-faint">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-aurora" />
              {t("plannerDrySlot")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rain" />
              {t("plannerWetSlot")}
            </span>
            <span>{format.fullDate(result.date)}</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <StatBox
      compact
      className="p-3"
      label={
        <span className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 shrink-0 text-aurora/80" />
          {label}
        </span>
      }
      value={value}
      detail={detail}
    />
  );
}

function RangeMetric({ label, value }: { label: string; value: string }) {
  return (
    <StatBox
      compact
      className="rounded-lg px-2 py-1.5"
      label={label}
      value={value}
      valueClassName="text-xs"
    />
  );
}
