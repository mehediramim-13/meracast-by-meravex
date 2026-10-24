"use client";

import { motion } from "framer-motion";
import {
  Aperture,
  CalendarDays,
  Camera,
  Car,
  ChevronDown,
  CloudRainWind,
  Clock3,
  Fish,
  Heart,
  MapPin,
  Mountain,
  Plane,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Utensils,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { Segmented } from "@/components/ui/controls";
import { Badge } from "@/components/ui/tooltip";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { PlaceCombobox } from "@/components/planner/place-combobox";
import { PlannerResultPanel } from "@/components/planner/planner-result";
import { PlannerCompare } from "@/components/planner/planner-compare";
import { PlannerShareModal } from "@/components/planner/planner-share-modal";
import { useFormat } from "@/hooks/use-format";
import { useHaptics } from "@/hooks/use-haptics";
import { useWeatherQuery } from "@/hooks/use-weather";
import { useI18n } from "@/i18n/provider";
import {
  activityProfile,
  addHours,
  defaultPlannerMoment,
  evaluatePlanner,
  PLANNER_ACTIVITIES,
  plannerBounds,
} from "@/lib/rain-planner";
import { addDaysToIsoDate, diffIsoDates } from "@/lib/format";
import { samePlace } from "@/lib/place";
import { buildPlannerShareUrl } from "@/lib/share-actions";
import { useUI } from "@/store/use-ui";
import { cn } from "@/lib/utils";
import type { ActivityId, PlannerInput, PlannerUrlState, PlannerWindow } from "@/types/planner";
import type { Place } from "@/types/geo";
import type { WeatherData } from "@/types/weather";
import type { TranslationKey } from "@/i18n/en";

const ACTIVITY_ICONS: Record<ActivityId, typeof Sparkles> = {
  general: Sparkles,
  cricket: Trophy,
  picnic: Utensils,
  wedding: Heart,
  commute: Car,
  travel: Plane,
  hiking: Mountain,
  photography: Camera,
  "outdoor-shoot": Aperture,
  fishing: Fish,
  "kite-flying": Wind,
};

const INPUT_CLASS =
  "h-11 min-w-0 w-full rounded-xl border border-line/15 bg-surface-quiet px-3 text-sm font-medium text-ink outline-none transition-colors placeholder:text-faint focus:border-aurora/45 focus:bg-surface-lift";

interface RainPlannerProps {
  initialPlace: Place;
  initialWeather?: WeatherData;
  initial: PlannerUrlState;
}

export function RainPlanner({ initialPlace, initialWeather, initial }: RainPlannerProps) {
  const { t, td } = useI18n();
  const format = useFormat();
  const vibrate = useHaptics();
  const mapPickResult = useUI((state) => state.mapPickResult);
  const setMapPickResult = useUI((state) => state.setMapPickResult);
  const openMapPicker = useUI((state) => state.openMapPicker);
  const resultRef = useRef<HTMLDivElement>(null);

  const startMoment = initialWeather ? defaultPlannerMoment(initialWeather) : null;
  const [place, setPlace] = useState<Place>(initialWeather?.place ?? initialPlace);
  const [date, setDate] = useState(initial.date ?? startMoment?.date ?? "");
  const [time, setTime] = useState(initial.time ?? startMoment?.time ?? "");
  const [endDate, setEndDate] = useState(initial.endDate ?? startMoment?.endDate ?? "");
  const [endTime, setEndTime] = useState(initial.endTime ?? startMoment?.endTime ?? "");
  const [mode, setMode] = useState<"single" | "range">(initial.mode ?? "single");
  const [activity, setActivity] = useState<ActivityId>(initial.activity ?? "general");
  const [comparePlaces, setComparePlaces] = useState<Place[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [reading, setReading] = useState(false);

  const initialData =
    initialWeather && samePlace(initialWeather.place, place) ? initialWeather : undefined;
  const weatherQuery = useWeatherQuery(place, { initialData });
  const weather = weatherQuery.data;
  const activeWeather =
    weather && samePlace(weather.place, place) ? weather : undefined;
  const bounds = activeWeather ? plannerBounds(activeWeather) : undefined;
  const profile = activityProfile(activity);

  const input = useMemo<PlannerInput>(
    () => ({ date, time, endDate, endTime, mode, activity }),
    [date, time, endDate, endTime, mode, activity],
  );

  const rangeInvalid =
    mode === "range" && Boolean(date && time && endDate && endTime) &&
    `${endDate}T${endTime}` <= `${date}T${time}`;

  const result = useMemo(() => {
    if (!activeWeather || !date || !time || rangeInvalid) return null;
    return evaluatePlanner(activeWeather, input);
  }, [activeWeather, date, time, rangeInvalid, input]);

  const beyondRange =
    Boolean(bounds && date) &&
    (date < bounds!.minDate || date > bounds!.maxDate);

  const hourOptions = useMemo(
    () => buildHourOptions(activeWeather, date),
    [activeWeather, date],
  );
  const endHourOptions = useMemo(
    () => buildHourOptions(activeWeather, endDate || date),
    [activeWeather, endDate, date],
  );

  useEffect(() => {
    if (!mapPickResult) return;
    setPlace(mapPickResult);
    setComparePlaces((current) =>
      current.filter((candidate) => !samePlace(candidate, mapPickResult)),
    );
    setMapPickResult(null);
  }, [mapPickResult, setMapPickResult]);

  useEffect(() => {
    if (!activeWeather) return;
    const moment = defaultPlannerMoment(activeWeather);
    setDate((current) => current || moment.date);
    setTime((current) => current || moment.time);
    setEndDate((current) => current || moment.endDate);
    setEndTime((current) => current || moment.endTime);
  }, [activeWeather]);

  useEffect(() => {
    if (!reading) return;
    const timer = window.setTimeout(() => setReading(false), 700);
    return () => window.clearTimeout(timer);
  }, [reading]);

  const selectPlace = (next: Place) => {
    setPlace(next);
    setComparePlaces((current) =>
      current.filter((candidate) => !samePlace(candidate, next)),
    );
  };

  const useCurrentMoment = () => {
    if (!activeWeather) return;
    const moment = defaultPlannerMoment(activeWeather);
    vibrate(6);
    setDate(moment.date);
    setTime(moment.time);
    setEndDate(moment.endDate);
    setEndTime(moment.endTime);
  };

  const switchMode = (next: "single" | "range") => {
    setMode(next);
    if (next === "range") {
      const startTime = time || startMoment?.time || "12:00";
      const end = addHours(date || startMoment?.date || "", startTime, 3);
      if (!endDate || !endTime || `${endDate}T${endTime}` <= `${date}T${startTime}`) {
        setEndDate(end.date);
        setEndTime(end.time);
      }
    }
  };

  const changeDate = (nextDate: string) => {
    setDate(nextDate);
    const options = buildHourOptions(activeWeather, nextDate);
    if (!options.includes(time)) setTime(options[0] ?? "00:00");
  };

  const handleUseWindow = (window: PlannerWindow) => {
    vibrate(6);
    setDate(window.startIso.slice(0, 10));
    setTime(window.startIso.slice(11, 16));
    if (mode === "range") {
      setEndDate(window.endIso.slice(0, 10));
      setEndTime(window.endIso.slice(11, 16));
    }
  };

  const handlePickSlot = (iso: string) => {
    vibrate(4);
    setDate(iso.slice(0, 10));
    setTime(iso.slice(11, 16));
    if (mode === "range") {
      const end = addHours(iso.slice(0, 10), iso.slice(11, 16), 3);
      setEndDate(end.date);
      setEndTime(end.time);
    }
  };

  const handleRead = () => {
    vibrate(7);
    setReading(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  const openShare = () => {
    if (!result || !activeWeather) return;
    setShareUrl(
      buildPlannerShareUrl(window.location.origin, activeWeather.place, {
        date,
        time,
        endDate,
        endTime,
        mode,
        activity,
      }),
    );
    setShareOpen(true);
  };

  const today = bounds?.today ?? activeWeather?.current.time.slice(0, 10) ?? "";
  const tomorrow = today ? addDaysToIsoDate(today, 1) : "";
  const horizonDays = bounds ? Math.max(1, diffIsoDates(bounds.maxDate, bounds.today)) : 16;

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-line/15 bg-surface/80 p-5 shadow-glass sm:p-7">
        <div className="relative max-w-3xl">
          <Badge tone="aurora">
            <CloudRainWind className="h-3 w-3" />
            {t("plannerTitle")}
          </Badge>
          <h1 className="mt-4 font-heading text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.02em] text-ink">
            {t("plannerTagline")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-[15px]">
            {t("plannerSubtitle")}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="chip">
              <CalendarDays className="h-3 w-3 text-aurora" />
              {t("nextDays", { count: format.num(horizonDays) })}
            </span>
            <span className="chip">
              <MapPin className="h-3 w-3 text-ice" />
              {place.name}
            </span>
            <span className="chip">
              <Sparkles className="h-3 w-3 text-solar" />
              {format.wind(25)} · {format.temp(32)}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,390px)_minmax(0,1fr)] xl:items-start">
        <aside className="min-w-0 xl:sticky xl:top-24">
          <GlassCard className="overflow-visible" padding="md">
            <WidgetHeader
              title={t("plannerFormTitle")}
              subtitle={t("plannerFormSubtitle")}
              icon={<SlidersHorizontal className="h-4 w-4" />}
            />

            <section className="mt-5" aria-labelledby="planner-where">
              <h3 id="planner-where" className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-faint">
                {t("plannerStepWhere")}
              </h3>
              <div className="flex items-start gap-2">
                <PlaceCombobox
                  value={place}
                  onSelect={selectPlace}
                  label={t("plannerLocation")}
                  className="min-w-0 flex-1"
                />
                <div className="pt-[1.55rem]">
                  <FavoriteButton place={place} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  vibrate(5);
                  openMapPicker("planner");
                }}
                className="pressable focus-ring mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-line/15 bg-surface-quiet px-3 text-xs font-semibold text-muted transition-colors hover:bg-surface-lift hover:text-ink"
              >
                <MapPin className="h-3.5 w-3.5 text-aurora" />
                {t("plannerPickMap")}
              </button>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-faint">
                <Clock3 className="h-3 w-3" />
                {t("plannerTimeLocalNote", { city: place.name })}
              </p>
            </section>

            <section className="mt-5 border-t border-line/10 pt-4" aria-labelledby="planner-when">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 id="planner-when" className="text-xs font-bold uppercase tracking-[0.16em] text-faint">
                  {t("plannerStepWhen")}
                </h3>
                <Segmented
                  size="sm"
                  ariaLabel={t("plannerMode")}
                  value={mode}
                  onChange={switchMode}
                  options={[
                    { value: "single", label: t("plannerSingle") },
                    { value: "range", label: t("plannerRange") },
                  ]}
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={useCurrentMoment}
                  disabled={!activeWeather}
                  className="pressable focus-ring min-h-7 rounded-full border border-aurora/20 bg-aurora/[0.07] px-2.5 text-xs font-bold text-aurora transition-colors hover:bg-aurora/[0.12] disabled:opacity-50"
                >
                  {t("plannerNow")} · {t("plannerNowHint")}
                </button>
                {today ? (
                  <button
                    type="button"
                    onClick={() => changeDate(today)}
                    className={cn(
                      "pressable focus-ring min-h-7 rounded-full border px-2.5 text-xs font-bold transition-colors",
                      date === today
                        ? "border-line/25 bg-surface-lift text-ink"
                        : "border-line/12 bg-surface-quiet text-muted hover:text-ink",
                    )}
                  >
                    {t("today")}
                  </button>
                ) : null}
                {tomorrow && bounds && tomorrow <= bounds.maxDate ? (
                  <button
                    type="button"
                    onClick={() => changeDate(tomorrow)}
                    className={cn(
                      "pressable focus-ring min-h-7 rounded-full border px-2.5 text-xs font-bold transition-colors",
                      date === tomorrow
                        ? "border-line/25 bg-surface-lift text-ink"
                        : "border-line/12 bg-surface-quiet text-muted hover:text-ink",
                    )}
                  >
                    {t("tomorrow")}
                  </button>
                ) : null}
              </div>

              {mode === "single" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Field label={t("plannerDate")}>
                    <input
                      type="date"
                      value={date}
                      min={bounds?.minDate}
                      max={bounds?.maxDate}
                      onChange={(event) => changeDate(event.target.value)}
                      className={INPUT_CLASS}
                      aria-label={t("plannerDate")}
                    />
                  </Field>
                  <Field label={t("plannerTime")}>
                    <TimeSelect
                      value={time}
                      options={hourOptions}
                      onChange={setTime}
                      label={t("plannerTime")}
                    />
                  </Field>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-faint">
                      {t("plannerRangeStart")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={date}
                        min={bounds?.minDate}
                        max={bounds?.maxDate}
                        onChange={(event) => changeDate(event.target.value)}
                        className={INPUT_CLASS}
                        aria-label={t("plannerSelectDate")}
                      />
                      <TimeSelect
                        value={time}
                        options={hourOptions}
                        onChange={setTime}
                        label={t("plannerSelectTime")}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-faint">
                      {t("plannerRangeEnd")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={endDate}
                        min={bounds?.minDate}
                        max={bounds?.maxDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className={INPUT_CLASS}
                        aria-label={t("plannerSelectDate")}
                      />
                      <TimeSelect
                        value={endTime}
                        options={endHourOptions}
                        onChange={setEndTime}
                        label={t("plannerSelectTime")}
                      />
                    </div>
                  </div>
                  {rangeInvalid ? (
                    <p role="alert" className="rounded-lg border border-danger/20 bg-danger/[0.06] px-2.5 py-1.5 text-xs font-medium text-danger">
                      {t("plannerInvalidRange")}
                    </p>
                  ) : null}
                </div>
              )}

              {beyondRange ? (
                <p className="mt-2 rounded-lg border border-solar/20 bg-solar/[0.06] px-2.5 py-1.5 text-xs font-medium leading-relaxed text-solar">
                  {t("plannerBeyondRangeBody", { days: format.num(horizonDays) })}
                </p>
              ) : null}
            </section>

            <section className="mt-5 border-t border-line/10 pt-4" aria-labelledby="planner-what">
              <h3 id="planner-what" className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-faint">
                {t("plannerStepWhat")}
              </h3>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={t("plannerActivity")}>
                {PLANNER_ACTIVITIES.map((item) => {
                  const Icon = ACTIVITY_ICONS[item.id];
                  const selected = item.id === activity;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        vibrate(4);
                        setActivity(item.id);
                      }}
                      className={cn(
                        "pressable focus-ring flex min-h-10 items-center gap-1.5 rounded-lg border px-2 text-left text-xs font-semibold transition-colors",
                        selected
                          ? "border-aurora/35 bg-aurora/[0.1] text-ink"
                          : "border-line/10 bg-surface-quiet text-muted hover:border-line/20 hover:text-ink",
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-aurora" : "text-faint")} />
                      <span className="truncate">{td(item.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-faint">
                {td(profile.descKey)}
              </p>
            </section>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-5"
              onClick={handleRead}
              disabled={!result || rangeInvalid || beyondRange}
              loading={reading || (!activeWeather && weatherQuery.isFetching)}
            >
              {!reading ? <Sparkles className="h-4 w-4" /> : null}
              {activeWeather ? t("plannerCheck") : t("plannerReading")}
            </Button>
            <p className="mt-2 text-center text-xs leading-relaxed text-faint">
              {t("plannerConfidenceNote")}
            </p>
          </GlassCard>
        </aside>

        <div ref={resultRef} className="min-w-0 scroll-mt-24 space-y-4 sm:space-y-5">
          {!activeWeather ? (
            weatherQuery.isError ? (
              <GlassCard className="min-h-[26rem]">
                <ErrorState
                  title={t("errorTitle")}
                  body={t("errorBody")}
                  onRetry={() => void weatherQuery.refetch()}
                  retryLabel={t("errorRetry")}
                />
              </GlassCard>
            ) : (
              <PlannerSkeleton />
            )
          ) : beyondRange ? (
            <GlassCard className="relative overflow-hidden">
              <EmptyState
                title={t("plannerBeyondRange")}
                body={t("plannerBeyondRangeBody", { days: format.num(horizonDays) })}
                illustration="cloud"
              />
            </GlassCard>
          ) : rangeInvalid ? (
            <GlassCard className="relative overflow-hidden">
              <EmptyState
                title={t("plannerInvalidRange")}
                body={t("plannerNoDataBody")}
                illustration="cloud"
              />
            </GlassCard>
          ) : result ? (
            <motion.div
              key={`${result.date}-${result.time}-${result.mode}-${activity}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <PlannerResultPanel
                weather={activeWeather}
                result={result}
                activity={profile}
                onUseWindow={handleUseWindow}
                onPickSlot={handlePickSlot}
                onShare={openShare}
              />
            </motion.div>
          ) : (
            <GlassCard className="relative overflow-hidden">
              <EmptyState
                title={t("plannerNoData")}
                body={t("plannerResultEmpty")}
                illustration="cloud"
              />
            </GlassCard>
          )}

          {activeWeather && result ? (
            <PlannerCompare
              primary={activeWeather.place}
              places={comparePlaces}
              input={input}
              onAdd={(next) => {
                if (comparePlaces.length >= 3) return;
                if (samePlace(next, activeWeather.place)) return;
                if (comparePlaces.some((candidate) => samePlace(candidate, next))) return;
                vibrate(5);
                setComparePlaces((current) => [...current, next].slice(0, 3));
              }}
              onRemove={(next) =>
                setComparePlaces((current) =>
                  current.filter((candidate) => !samePlace(candidate, next)),
                )
              }
            />
          ) : null}
        </div>
      </div>

      {activeWeather && result ? (
        <PlannerShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          weather={activeWeather}
          result={result}
          activityLabel={td(profile.labelKey)}
          shareUrl={shareUrl}
        />
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

function TimeSelect({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const selected = options.includes(value) ? value : options[0] ?? "";
  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className={cn(INPUT_CLASS, "appearance-none pr-8")}
      >
        {options.length ? (
          options.map((option) => (
            <option key={option} value={option} className="bg-[#0a1420] text-white">
              {format.time(`2000-01-01T${option}:00`)}
            </option>
          ))
        ) : (
          <option value="">{t("plannerSelectTime")}</option>
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
    </div>
  );
}

function buildHourOptions(weather: WeatherData | undefined, date: string): string[] {
  if (weather && date) {
    const fromForecast = weather.hourly
      .filter((hour) => hour.time.slice(0, 10) === date)
      .map((hour) => hour.time.slice(11, 16))
      .filter((time, index, list) => list.indexOf(time) === index);
    if (fromForecast.length) return fromForecast;
  }
  return Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, "0")}:00`);
}

function PlannerSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-4" aria-busy="true" aria-label={t("plannerReading")}>
      <GlassCard className="min-h-[24rem]">
        <div className="skeleton h-3 w-24" />
        <div className="mt-4 skeleton h-4 w-48" />
        <div className="mt-8 skeleton h-12 w-3/4" />
        <div className="mt-3 skeleton h-4 w-2/3" />
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </GlassCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="skeleton h-48 rounded-[1.375rem]" />
        <div className="skeleton h-48 rounded-[1.375rem]" />
      </div>
      <p className="text-center text-xs text-faint">{t("loadingDetail")}</p>
    </div>
  );
}
