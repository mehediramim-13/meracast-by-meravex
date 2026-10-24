"use client";

import { Cloud, Moon, Sparkles, Telescope } from "lucide-react";
import { useId, useMemo } from "react";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { MoonDisc } from "@/components/dashboard/sun-card";
import { getSkyTimes, getStargazing, moonPhaseInfo } from "@/lib/sun";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/types/weather";

const STAR_POINTS = [
  [12, 18, 1.5], [28, 40, 1], [42, 14, 2], [58, 33, 1], [72, 20, 1.5], [86, 48, 1],
  [18, 66, 1], [36, 78, 1.5], [54, 58, 1], [68, 72, 1.5], [82, 84, 1], [92, 26, 1.2],
] as const;

export function AstronomyCard({ weather }: { weather: WeatherData }) {
  const { t } = useI18n();
  const format = useFormat();
  const id = useId().replace(/:/g, "");
  const outlook = useMemo(() => getStargazing(weather), [weather]);
  const times = useMemo(() => getSkyTimes(weather), [weather]);
  const moon = useMemo(
    () => moonPhaseInfo(new Date(`${weather.current.time.slice(0, 10)}T21:00:00`)),
    [weather],
  );
  const circumference = 2 * Math.PI * 38;
  const ratio = outlook.score / 100;

  return (
    <GlassCard className="relative h-full overflow-hidden bg-[#0a1421]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {STAR_POINTS.map(([left, top, size], index) => (
          <span
            key={`${left}-${top}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              opacity: 0.25 + (index % 4) * 0.12,
              animation: `star-twinkle ${4 + (index % 5)}s ease-in-out infinite`,
              animationDelay: `${index * 0.35}s`,
            }}
          />
        ))}
      </div>
      <div className="relative">
        <WidgetHeader
          title={t("astronomy")}
          subtitle={t("astronomySubtitle")}
          icon={<Telescope className="h-4 w-4" />}
        />

        <div className="mt-5 flex items-center gap-4">
          <div className="relative h-[6.8rem] w-[6.8rem] shrink-0">
            <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="48" cy="48" r="38" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="6" />
              <circle
                cx="48"
                cy="48"
                r="38"
                fill="none"
                stroke="rgb(var(--c-ice))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${circumference * ratio} ${circumference}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular text-white">{format.num(outlook.score)}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                / 100
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ice">
              <Sparkles className="h-3 w-3" />
              {t("stargazingScore")}
            </p>
            <p className="mt-1.5 font-heading text-xl font-semibold leading-tight text-white">
              {t(outlook.ratingKey)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">{t("planetNote")}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase leading-snug tracking-[0.08em] text-white/40">
              <Cloud className="h-3 w-3 shrink-0" />
              {t("cloudCover")}
            </p>
            <p className="mt-1 truncate text-lg font-semibold tabular text-white">{format.percent(outlook.cloudCover)}</p>
          </div>
          <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase leading-snug tracking-[0.08em] text-white/40">
              <Moon className="h-3 w-3 shrink-0" />
              {t("moonPhase")}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{t(moon.phaseKey)}</p>
            <p className="mt-0.5 text-xs leading-snug text-white/45">
              {t("moonIllumination", { percent: format.percent(outlook.moonPercent) })}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <MoonDisc phase={moon.phase} fraction={moon.fraction} size={34} />
            <div>
              <p className="text-xs font-semibold text-white/75">{t("visibleTonight")}</p>
              <p className="text-xs text-white/40">{t("seeingConditions")}</p>
            </div>
          </div>
          {times.nextFullMoon ? (
            <span className="text-xs text-white/45">
              {t("nextFullMoon")}
              <br />
              <span className="font-semibold text-white/75">{format.monthDay(times.nextFullMoon.date)}</span>
            </span>
          ) : null}
        </div>
        <span id={`astronomy-${id}`} className={cn("sr-only")}>{t(outlook.ratingKey)}</span>
      </div>
    </GlassCard>
  );
}
