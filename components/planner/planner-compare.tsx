"use client";

import { motion } from "framer-motion";
import { CloudRain, CloudSun, MapPin, Sun, X } from "lucide-react";
import { useMemo } from "react";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { StatBox } from "@/components/ui/stat-box";
import { PlaceCombobox } from "@/components/planner/place-combobox";
import { useFormat } from "@/hooks/use-format";
import { useWeatherQuery } from "@/hooks/use-weather";
import { useI18n } from "@/i18n/provider";
import { evaluatePlanner } from "@/lib/rain-planner";
import { samePlace } from "@/lib/place";
import { cn } from "@/lib/utils";
import type { Place } from "@/types/geo";
import type { PlannerInput, PlannerSuitability } from "@/types/planner";
import type { TranslationKey } from "@/i18n/en";

const TONE: Record<
  PlannerSuitability,
  { border: string; bg: string; text: string; icon: typeof Sun }
> = {
  go: { border: "border-aurora/20", bg: "bg-aurora/[0.06]", text: "text-aurora", icon: Sun },
  caution: {
    border: "border-solar/20",
    bg: "bg-solar/[0.06]",
    text: "text-solar",
    icon: CloudSun,
  },
  avoid: {
    border: "border-danger/20",
    bg: "bg-danger/[0.06]",
    text: "text-danger",
    icon: CloudRain,
  },
};

interface PlannerCompareProps {
  primary: Place;
  places: Place[];
  input: PlannerInput;
  onAdd: (place: Place) => void;
  onRemove: (place: Place) => void;
}

export function PlannerCompare({ primary, places, input, onAdd, onRemove }: PlannerCompareProps) {
  const { t } = useI18n();

  return (
    <GlassCard className="relative overflow-hidden">
      <WidgetHeader
        title={t("plannerCompareTitle")}
        subtitle={t("plannerCompareHint")}
        icon={<MapPin className="h-4 w-4" />}
        action={
          <span className="hidden rounded-full border border-line/12 bg-surface-quiet px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-faint sm:inline-flex">
            {t("plannerCompareLimit")}
          </span>
        }
      />

      {places.length ? (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {places.map((place) => (
            <CompareCard
              key={place.id}
              place={place}
              input={input}
              onRemove={() => onRemove(place)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-line/15 px-4 py-6 text-center">
          <p className="text-xs font-semibold text-ink">{t("plannerCompareEmpty")}</p>
        </div>
      )}

      {places.length < 3 ? (
        <div className="mt-3">
          <PlaceCombobox
            value={undefined}
            onSelect={onAdd}
            placeholder={t("plannerCompareAddPlaceholder")}
            compact
            className="max-w-md"
          />
        </div>
      ) : null}

      <p className="mt-2 text-xs text-faint">
        {t("plannerTimeLocalNote", { city: primary.name })}
      </p>
    </GlassCard>
  );
}

function CompareCard({
  place,
  input,
  onRemove,
}: {
  place: Place;
  input: PlannerInput;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const query = useWeatherQuery(place);
  const weather = query.data;
  const result = useMemo(
    () => (weather && samePlace(weather.place, place) ? evaluatePlanner(weather, input) : null),
    [weather, place, input],
  );

  if (!weather) {
    return (
      <div className="relative min-h-[10rem] rounded-xl border border-line/12 bg-surface-quiet p-3" aria-busy={query.isLoading}>
        <div className="skeleton h-3 w-24" />
        <div className="mt-3 skeleton h-5 w-32" />
        <div className="mt-4 skeleton h-12 w-full" />
        {query.isError ? (
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="pressable mt-2 w-full rounded-lg border border-line/15 px-2 py-1 text-xs font-semibold text-ink hover:bg-white/5"
          >
            {t("errorRetry")}
          </button>
        ) : null}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="relative rounded-xl border border-line/12 bg-surface-quiet p-3">
        <CompareHeader place={place} onRemove={onRemove} />
        <p className="mt-4 text-xs leading-relaxed text-muted">{t("plannerNoDataBody")}</p>
      </div>
    );
  }

  const tone = TONE[result.assessment.suitability];
  const ToneIcon = tone.icon;
  const window = result.bestWindows[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("relative rounded-xl border p-3", tone.border, tone.bg)}
    >
      <CompareHeader place={place} onRemove={onRemove} />
      <div className="mt-3 flex items-start gap-2">
        <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tone.text, "bg-surface-lift")}>
          <ToneIcon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className={cn("text-sm font-bold leading-snug", tone.text)}>
            {t(result.assessment.verdictKey as TranslationKey)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {format.time(result.assessment.targetIso)} · {format.percent(result.assessment.probability)}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <StatBox
          compact
          className="rounded-lg bg-black/10 px-2 py-1.5"
          label={t("plannerTemp")}
          value={format.temp(result.assessment.temperature)}
          valueClassName="text-xs"
        />
        <StatBox
          compact
          className="rounded-lg bg-black/10 px-2 py-1.5"
          label={t("plannerWind")}
          value={format.wind(result.assessment.windSpeed)}
          valueClassName="text-xs"
        />
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted">
        <span className="h-1 w-1 rounded-full bg-current opacity-60" />
        {window
          ? `${t("plannerBestTime", { time: format.hour(window.startIso) })}`
          : t("plannerNoWindowShort")}
      </p>
    </motion.div>
  );
}

function CompareHeader({ place, onRemove }: { place: Place; onRemove: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-ink">{place.name}</p>
        <p className="truncate text-xs text-faint">
          {[place.admin1, place.country].filter(Boolean).join(", ")}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${t("plannerCompareRemove")} ${place.name}`}
        className="pressable flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-white/10 hover:text-ink"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
