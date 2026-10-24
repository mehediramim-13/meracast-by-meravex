"use client";

import { Moon, Sunrise, Sunset, Sun as SunIcon } from "lucide-react";
import { useId, useMemo } from "react";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { useNow } from "@/hooks/use-environment";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { StatBox } from "@/components/ui/stat-box";
import { WeatherDetailsGrid } from "@/components/weather/weather-detail";
import {
  daylightProgress,
  getSkyTimes,
  moonPhaseInfo,
  nextSunEvent,
} from "@/lib/sun";
import { epochToLocalIso, splitLocalIso } from "@/lib/format";
import type { WeatherData } from "@/types/weather";

function arcPoint(progress: number, radius = 80, cx = 100, cy = 92) {
  const angle = Math.PI - Math.max(0, Math.min(1, progress)) * Math.PI;
  return { x: cx + radius * Math.cos(angle), y: cy - radius * Math.sin(angle) };
}

function daylightRemaining(nowIso: string, sunset: string | null): number | null {
  const now = splitLocalIso(nowIso);
  const end = sunset ? splitLocalIso(sunset) : null;
  if (!now || !end) return null;
  const diff = end.hour * 60 + end.minute - (now.hour * 60 + now.minute);
  return Math.max(0, diff * 60);
}

export function SunCard({ weather }: { weather: WeatherData }) {
  const { t } = useI18n();
  const format = useFormat();
  const now = useNow(60_000);
  const gradientId = useId().replace(/:/g, "");
  const times = useMemo(() => getSkyTimes(weather), [weather]);
  const moon = useMemo(() => moonPhaseInfo(new Date(`${weather.current.time.slice(0, 10)}T12:00:00`)), [weather]);
  const nowIso = epochToLocalIso(now.getTime(), weather.meta.utcOffsetSeconds);
  const progress = daylightProgress(times.sunrise, times.sunset, nowIso);
  const position = arcPoint(progress);
  const isDay = weather.current.isDay;
  const nextEvent = nextSunEvent(weather, times);
  const remaining = isDay ? daylightRemaining(nowIso, times.sunset) : null;

  return (
    <GlassCard className="relative flex h-full flex-col overflow-hidden">
      <WidgetHeader
        title={t("sunAndMoon")}
        subtitle={t("sunArc")}
        icon={<SunIcon className="h-4 w-4" />}
      />

      <div className="relative mt-4">
        <svg viewBox="0 0 200 118" className="w-full" role="img" aria-label={t("sunArc")}>
          <defs>
            <linearGradient id={`sun-arc-${gradientId}`} x1="20" y1="92" x2="180" y2="12">
              <stop offset="0%" stopColor="rgb(var(--c-ice))" stopOpacity="0.45" />
              <stop offset="52%" stopColor="rgb(var(--c-solar))" stopOpacity="0.95" />
              <stop offset="100%" stopColor="rgb(var(--c-solar))" stopOpacity="0.45" />
            </linearGradient>
            <radialGradient id={`sun-glow-${gradientId}`}>
              <stop offset="0%" stopColor="rgb(var(--c-solar))" stopOpacity="0.55" />
              <stop offset="100%" stopColor="rgb(var(--c-solar))" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            d="M20 92 A80 80 0 0 1 180 92"
            fill="none"
            stroke="rgb(var(--c-line) / 0.15)"
            strokeWidth="1"
            strokeDasharray="3 7"
          />
          <path
            d="M20 92 A80 80 0 0 1 180 92"
            fill="none"
            stroke={`url(#sun-arc-${gradientId})`}
            strokeWidth="2"
            strokeDasharray="415"
            strokeDashoffset={415 - 415 * progress}
            strokeLinecap="round"
          />
          <line x1="8" y1="92" x2="192" y2="92" stroke="rgb(var(--c-line) / 0.22)" strokeWidth="1" />
          {isDay ? (
            <>
              <circle cx={position.x} cy={position.y} r="18" fill={`url(#sun-glow-${gradientId})`} />
              <circle cx={position.x} cy={position.y} r="5.2" fill="rgb(var(--c-solar))" />
            </>
          ) : (
            <circle
              cx={position.x}
              cy={position.y}
              r="4.8"
              fill="rgb(var(--c-ice))"
              opacity="0.9"
            />
          )}
        </svg>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-faint">
            {isDay ? t("daylight") : t("currentConditions")}
          </p>
          <p className="mt-0.5 text-lg font-bold tabular text-ink">
            {isDay && remaining !== null ? format.duration(remaining) : t("moonPhase")}
          </p>
        </div>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2">
        <StatBox
          compact
          label={
            <span className="flex items-center gap-1">
              <Sunrise className="h-3 w-3 text-solar" />
              {t("sunrise")}
            </span>
          }
          value={times.sunrise ? format.time(times.sunrise) : "—"}
        />
        <StatBox
          compact
          label={
            <span className="flex items-center gap-1">
              <Sunset className="h-3 w-3 text-solar" />
              {t("sunset")}
            </span>
          }
          value={times.sunset ? format.time(times.sunset) : "—"}
        />
      </div>

      <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-muted">
        <SunIcon className="h-3 w-3 text-solar" />
        {t(nextEvent.key)} · {nextEvent.time ? format.time(nextEvent.time) : "—"}
      </p>

      <div className="my-4 divider" />

      <div className="flex items-center gap-3">
        <MoonDisc phase={moon.phase} fraction={moon.fraction} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <Moon className="h-3.5 w-3.5 text-ice" />
            {t(moon.phaseKey)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {t("moonIllumination", { percent: format.percent(moon.illuminationPercent) })}
            <span className="mx-1.5 text-faint/50">·</span>
            {t("ageDays", { count: format.num(moon.ageDays, { maximumFractionDigits: 1 }) })}
          </p>
        </div>
      </div>

      <WeatherDetailsGrid
        className="mt-4"
        columns={3}
        items={[
          {
            icon: <Moon className="h-3 w-3" />,
            label: t("moonrise"),
            value: times.moonrise ? format.time(times.moonrise) : "—",
          },
          {
            icon: <Moon className="h-3 w-3" />,
            label: t("moonset"),
            value: times.moonset ? format.time(times.moonset) : "—",
          },
          {
            icon: <SunIcon className="h-3 w-3" />,
            label: t("solarNoon"),
            value: times.solarNoon ? format.time(times.solarNoon) : "—",
          },
        ]}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {times.nextFullMoon ? (
          <span className="chip !min-h-7 !text-xs">
            {t("nextFullMoon")} · {format.monthDay(times.nextFullMoon.date)}
          </span>
        ) : null}
        {times.nextNewMoon ? (
          <span className="chip !min-h-7 !text-xs">
            {t("nextNewMoon")} · {format.monthDay(times.nextNewMoon.date)}
          </span>
        ) : null}
      </div>
    </GlassCard>
  );
}

export function MoonDisc({ phase, fraction, size = 54 }: { phase: number; fraction: number; size?: number }) {
  const generated = useId().replace(/:/g, "");
  const radius = size / 2 - 2;
  const waxing = phase <= 0.5;
  const terminator = Math.abs(Math.cos(phase * Math.PI * 2)) * radius;
  const lightOpacity = 0.32 + fraction * 0.68;
  return (
    <span
      className="relative inline-flex shrink-0 overflow-hidden rounded-full border border-line/15 bg-[#0a1420]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <radialGradient id={`moon-disc-glow-${generated}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={lightOpacity} />
            <stop offset="70%" stopColor="#dce8ff" stopOpacity={lightOpacity * 0.82} />
            <stop offset="100%" stopColor="#9fb4d8" stopOpacity={lightOpacity * 0.55} />
          </radialGradient>
          <mask id={`moon-disc-mask-${generated}`}>
            <rect width={size} height={size} fill="black" />
            <ellipse
              cx={size / 2 + ((waxing ? -1 : 1) * (terminator - radius)) / 2}
              cy={size / 2}
              rx={Math.max(0.5, terminator)}
              ry={radius}
              fill="white"
            />
            <rect
              x={waxing ? size / 2 : 0}
              y="0"
              width={size / 2}
              height={size}
              fill={fraction > 0.5 ? "white" : "black"}
            />
            <rect
              x={waxing ? 0 : size / 2}
              y="0"
              width={size / 2}
              height={size}
              fill={fraction > 0.5 ? "black" : "white"}
            />
          </mask>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="rgb(255 255 255 / 0.04)" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={`url(#moon-disc-glow-${generated})`}
          mask={`url(#moon-disc-mask-${generated})`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(255 255 255 / 0.12)"
          strokeWidth="1"
        />
      </svg>
    </span>
  );
}
