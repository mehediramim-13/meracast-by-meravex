"use client";

import dynamic from "next/dynamic";
import {
  Activity,
  Check,
  Clock3,
  Info,
  Layers3,
  Loader2,
  MapPin,
  Pause,
  Play,
  Radar as RadarIcon,
  RefreshCw,
  Satellite,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Badge } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useFormat } from "@/hooks/use-format";
import { useHaptics } from "@/hooks/use-haptics";
import { useHydrated } from "@/hooks/use-environment";
import { useTheme } from "@/hooks/use-theme";
import { useGridQuery, useRadarQuery } from "@/hooks/use-weather";
import { useI18n } from "@/i18n/provider";
import { formatUtcTime, toBengaliDigits } from "@/lib/format";
import { placeLabel, samePlace } from "@/lib/place";
import { cn } from "@/lib/utils";
import { useLocations } from "@/store/use-locations";
import { useSettings } from "@/store/use-settings";
import type { Place } from "@/types/geo";
import type {
  RadarFrameKind,
  RadarGridPoint,
  RadarOverlayKind,
  RadarViewport,
} from "@/types/radar";
import type { RadarData, RadarFrame } from "@/types/weather";

interface PlaybackFrame extends RadarFrame {
  kind: RadarFrameKind;
}

interface RadarExperienceProps {
  initialPlace: Place;
  initialRadar?: RadarData;
  fromUrl: boolean;
}

const RadarMap = dynamic(() => import("@/components/radar/radar-map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#071019]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-aurora" />
        <div className="skeleton h-2 w-32" />
        <div className="skeleton h-2 w-20" />
      </div>
    </div>
  ),
});

const RAIN_GRADIENT =
  "linear-gradient(90deg, #0b1c2b 0%, #38bdf8 16%, #22d3ee 32%, #4ade80 50%, #facc15 66%, #fb923c 80%, #ef4444 94%, #fecdd3 100%)";
const CLOUD_GRADIENT =
  "linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.32) 40%, rgba(255,255,255,0.7) 75%, #ffffff 100%)";
const TEMPERATURE_GRADIENT =
  "linear-gradient(90deg, #60a5fa 0%, #22d3ee 24%, #fbbf24 58%, #fb7185 82%, #ef4444 100%)";

function playbackFrames(radar: RadarData | undefined, overlay: RadarOverlayKind): PlaybackFrame[] {
  if (!radar) return [];
  if (overlay === "satellite") {
    return radar.satellite.map((frame) => ({ ...frame, kind: "observed" as const }));
  }
  return [
    ...radar.past.map((frame) => ({ ...frame, kind: "observed" as const })),
    ...radar.nowcast.map((frame) => ({ ...frame, kind: "nowcast" as const })),
  ];
}

function gridPointsForViewport(viewport: RadarViewport): Array<[number, number]> {
  const centerLatitude = (viewport.north + viewport.south) / 2;
  const centerLongitude = (viewport.east + viewport.west) / 2;
  const latitudeSpan = Math.min(Math.max(viewport.north - viewport.south, 0.12), 12);
  const longitudeSpan = Math.min(Math.max(viewport.east - viewport.west, 0.12), 18);
  const points: Array<[number, number]> = [];

  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const latitude = centerLatitude + (row / 4 - 0.5) * latitudeSpan;
      const longitude = centerLongitude + (column / 4 - 0.5) * longitudeSpan;
      const wrappedLongitude = ((((longitude + 180) % 360) + 360) % 360) - 180;
      points.push([
        Math.max(-85, Math.min(85, latitude)),
        wrappedLongitude,
      ]);
    }
  }

  return points;
}

function compactWindUnit(unit: "kmh" | "mph" | "ms" | "kn"): string {
  if (unit === "mph") return "mph";
  if (unit === "ms") return "m/s";
  if (unit === "kn") return "kn";
  return "km/h";
}

function safeFormatEpoch(
  epochSeconds: number,
  timeZone: string,
  timeFormat: "12h" | "24h",
  bengaliNumerals: boolean,
): string {
  let text: string;
  try {
    text = formatUtcTime(epochSeconds * 1000, timeZone, timeFormat);
  } catch {
    text = formatUtcTime(epochSeconds * 1000, "UTC", timeFormat);
  }
  return bengaliNumerals ? toBengaliDigits(text) : text;
}

export function RadarExperience({
  initialPlace,
  initialRadar,
  fromUrl,
}: RadarExperienceProps) {
  const { t, language } = useI18n();
  const format = useFormat();
  const { resolved: resolvedTheme } = useTheme();
  const vibrate = useHaptics();
  const hydrated = useHydrated();
  const storePlace = useLocations((state) => state.activePlace);
  const setActivePlace = useLocations((state) => state.setActivePlace);
  const timeFormat = useSettings((state) => state.units.time);
  const radarQuery = useRadarQuery({ initialData: initialRadar });
  const radar = radarQuery.data;

  const [place, setPlace] = useState(initialPlace);
  const [overlay, setOverlay] = useState<RadarOverlayKind>("radar");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [opacity, setOpacity] = useState(0.82);
  const [showTemperature, setShowTemperature] = useState(false);
  const [showWind, setShowWind] = useState(false);
  const [viewport, setViewport] = useState<RadarViewport>(() => ({
    latitude: initialPlace.latitude,
    longitude: initialPlace.longitude,
    zoom: 7,
    north: initialPlace.latitude + 2,
    south: initialPlace.latitude - 2,
    east: initialPlace.longitude + 2,
    west: initialPlace.longitude - 2,
  }));

  const shellRef = useRef<HTMLDivElement>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const isFullscreen = nativeFullscreen || fallbackFullscreen;

  const placeInitialized = useRef(false);
  useEffect(() => {
    if (!hydrated || placeInitialized.current) return;
    placeInitialized.current = true;
    if (fromUrl) {
      if (!samePlace(storePlace, initialPlace)) setActivePlace(initialPlace);
      setPlace(initialPlace);
      return;
    }
    if (!samePlace(storePlace, initialPlace)) setPlace(storePlace);
  }, [hydrated, fromUrl, initialPlace, storePlace, setActivePlace]);

  const radarFrames = useMemo(() => playbackFrames(radar, "radar"), [radar]);
  const satelliteFrames = useMemo(() => playbackFrames(radar, "satellite"), [radar]);
  const radarAvailable = radarFrames.length > 0;
  const satelliteAvailable = satelliteFrames.length > 0;
  const frames = overlay === "radar" ? radarFrames : satelliteFrames;
  const activeFrame = activeIndex >= 0 ? frames[activeIndex] ?? null : null;

  useEffect(() => {
    if (overlay === "radar" && !radarAvailable && satelliteAvailable) {
      setOverlay("satellite");
      setPlaying(false);
      setActiveIndex(satelliteFrames.length - 1);
    } else if (overlay === "satellite" && !satelliteAvailable && radarAvailable) {
      setOverlay("radar");
      setPlaying(false);
      setActiveIndex(radarFrames.length - 1);
    }
  }, [
    overlay,
    radarAvailable,
    satelliteAvailable,
    radarFrames.length,
    satelliteFrames.length,
  ]);

  useEffect(() => {
    if (!frames.length) {
      setActiveIndex(-1);
      setPlaying(false);
      return;
    }
    setActiveIndex((current) => {
      if (current < 0 || current >= frames.length) return frames.length - 1;
      return current;
    });
  }, [frames.length]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const atEnd = activeIndex >= frames.length - 1;
    const delay = atEnd ? 1_250 : 620;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % frames.length);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [playing, activeIndex, frames.length]);

  useEffect(() => {
    const onChange = () => setNativeFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!fallbackFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFallbackFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fallbackFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    if (fallbackFullscreen) {
      setFallbackFullscreen(false);
      return;
    }
    const node = shellRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        setFallbackFullscreen(false);
      }
      return;
    }
    if (node.requestFullscreen && document.fullscreenEnabled) {
      try {
        await node.requestFullscreen();
        return;
      } catch {
        // iOS Safari and some embedded browsers decline element fullscreen.
      }
    }
    setFallbackFullscreen(true);
  }, [fallbackFullscreen]);

  const timezone = place.timezone && place.timezone !== "auto" ? place.timezone : "Asia/Dhaka";
  const formatEpoch = useCallback(
    (epochSeconds: number) =>
      safeFormatEpoch(epochSeconds, timezone, timeFormat, format.bengaliNumerals),
    [timezone, timeFormat, format.bengaliNumerals],
  );

  const updatedLabel = radar ? formatEpoch(radar.generated) : "—";
  const activeTimeLabel = activeFrame ? formatEpoch(activeFrame.time) : "—";
  const firstTimeLabel = frames[0] ? formatEpoch(frames[0].time) : "—";
  const lastTimeLabel = frames.length ? formatEpoch(frames[frames.length - 1]!.time) : "—";
  const frameBadge =
    overlay === "satellite"
      ? t("radarSatellite")
      : activeFrame?.kind === "nowcast"
        ? t("radarFuture")
        : t("radarPast");
  const framesLabel = t("radarFrames", { count: format.num(frames.length) });
  const activeCaption =
    activeFrame?.kind === "nowcast"
      ? t("radarForecastAt", { time: activeTimeLabel })
      : t("radarObservedAt", { time: activeTimeLabel });

  const gridEnabled = Boolean(radar) && (showTemperature || showWind);
  const samplePoints = useMemo(() => gridPointsForViewport(viewport), [viewport]);
  const gridQuery = useGridQuery(samplePoints, gridEnabled);

  const grid = useMemo<RadarGridPoint[]>(() => {
    return (gridQuery.data ?? []).map((sample) => {
      const temperatureLabel =
        sample.temperature === null ? null : format.temp(sample.temperature);
      const windValue =
        sample.windSpeed === null
          ? null
          : format.num(format.windValue(sample.windSpeed), {
              maximumFractionDigits:
                format.units.wind === "ms" || format.units.wind === "kn" ? 1 : 0,
            });
      const windFull =
        sample.windSpeed === null ? null : format.wind(sample.windSpeed);
      const latitude = format.num(sample.latitude, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const longitude = format.num(sample.longitude, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const title = [`${latitude}°, ${longitude}°`, temperatureLabel, windFull]
        .filter(Boolean)
        .join(" · ");

      return {
        latitude: sample.latitude,
        longitude: sample.longitude,
        temperatureLabel,
        windLabel: windValue,
        windUnit: compactWindUnit(format.units.wind),
        windDirection: sample.windDirection,
        title,
      };
    });
  }, [gridQuery.data, format]);

  const coordinateLabel = useCallback(
    (latitude: number, longitude: number) => {
      const latitudeHemisphere = t(latitude >= 0 ? "north" : "south");
      const longitudeHemisphere = t(longitude >= 0 ? "east" : "west");
      return `${format.num(Math.abs(latitude), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}°${latitudeHemisphere} · ${format.num(Math.abs(longitude), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}°${longitudeHemisphere}`;
    },
    [format, t],
  );

  const selectOverlay = (next: RadarOverlayKind) => {
    if (next === overlay) return;
    if (next === "satellite" && !satelliteAvailable) return;
    vibrate(5);
    setOverlay(next);
    setPlaying(false);
    const nextFrames = next === "radar" ? radarFrames : satelliteFrames;
    setActiveIndex(nextFrames.length - 1);
  };

  const togglePlayback = () => {
    if (frames.length < 2) return;
    vibrate(4);
    if (playing) {
      setPlaying(false);
      return;
    }
    if (activeIndex < 0 || activeIndex >= frames.length - 1) setActiveIndex(0);
    setPlaying(true);
  };

  const refresh = () => {
    vibrate(5);
    void radarQuery.refetch();
  };

  const hero = (
    <section className="relative overflow-hidden rounded-3xl border border-line/15 bg-surface/80 p-5 shadow-glass sm:p-7">
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge tone="aurora">
            <RadarIcon className="h-3 w-3" />
            {t("radarTitle")}
          </Badge>
          <h1 className="mt-4 font-heading text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.02em] text-ink">
            {t("radarTagline")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-[15px]">
            {t("radarSubtitle", { city: place.name })}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-aurora" aria-hidden="true" />
              {t("radarLive")}
            </span>
            <span className="chip">
              <Clock3 className="h-3 w-3 text-ice" />
              {t("radarUpdatedAt", { time: updatedLabel })}
            </span>
            <span className="chip">
              <MapPin className="h-3 w-3 text-solar" />
              {place.name}
            </span>
            {radar ? (
              <span className="chip">
                <Layers3 className="h-3 w-3 text-aurora" />
                {t("radarFrames", {
                  count: format.num(radarFrames.length + satelliteFrames.length),
                })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={refresh}
            disabled={radarQuery.isFetching}
            className="min-h-10"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", radarQuery.isFetching && "animate-spin")}
            />
            {radarQuery.isFetching ? t("loading") : t("radarRefresh")}
          </Button>
        </div>
      </div>
    </section>
  );

  if (!radar) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {hero}
        {radarQuery.isError ? (
          <GlassCard className="min-h-[24rem]">
            <ErrorState
              title={t("radarError")}
              body={t("mapUnavailableBody")}
              onRetry={refresh}
              retryLabel={t("radarRetry")}
            />
          </GlassCard>
        ) : (
          <GlassCard className="flex min-h-[24rem] flex-col items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-aurora" />
            <p className="mt-4 text-sm font-semibold text-ink">{t("loadingMap")}</p>
            <p className="mt-1 text-xs text-muted">{t("mapLoadingDetail")}</p>
          </GlassCard>
        )}
      </div>
    );
  }

  const mapShell = (
    <div
      ref={shellRef}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-line/10 bg-[#071019] shadow-glass",
        isFullscreen && "fixed inset-0 z-[80] rounded-none border-0",
      )}
    >
      <div
        className={cn(
          "relative w-full",
          isFullscreen
            ? "h-svh min-h-0 max-h-none"
            : "h-[62svh] min-h-[27rem] max-h-[48rem] sm:h-[66svh]",
        )}
      >
        {frames.length > 0 ? (
          <RadarMap
            host={radar.host}
            theme={resolvedTheme}
            language={language}
            place={place}
            overlay={overlay}
            frame={activeFrame}
            opacity={opacity}
            grid={grid}
            showTemperature={showTemperature}
            showWind={showWind}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => void toggleFullscreen()}
            onViewChange={setViewport}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#071019]">
            <EmptyState
              title={t("radarNoFrames")}
              body={t("radarNoFramesBody")}
              actionLabel={t("radarRetry")}
              onAction={refresh}
              illustration="cloud"
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-start gap-2 pr-14">
          <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#06111d]/88 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.08em] text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-aurora" aria-hidden="true" />
            {t("radarLive")}
          </span>
          <span className="pointer-events-auto inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border border-white/15 bg-[#06111d]/88 px-2.5 py-1 text-xs font-medium text-white/85">
            <MapPin className="h-3 w-3 shrink-0 text-solar" />
            <span className="truncate">{place.name}</span>
          </span>
          <span className="pointer-events-auto hidden items-center gap-1.5 rounded-full border border-white/15 bg-[#06111d]/88 px-2.5 py-1 text-xs font-medium text-white/70 sm:inline-flex">
            <Clock3 className="h-3 w-3 text-ice" />
            {updatedLabel}
          </span>
        </div>

        {frames.length > 0 ? (
          <div className="absolute inset-x-2 bottom-2 z-30 sm:inset-x-4 sm:bottom-4">
            <div className="rounded-2xl border border-white/12 bg-[#06111d]/92 p-3 text-white sm:p-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayback}
                  disabled={frames.length < 2}
                  aria-label={playing ? t("mapPause") : t("mapPlay")}
                  aria-pressed={playing}
                  className={cn(
                    "pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111d]",
                    playing
                      ? "border-aurora/60 bg-aurora text-[#06211d]"
                      : "border-white/15 bg-white/10 text-white hover:bg-white/15",
                    frames.length < 2 && "opacity-40",
                  )}
                >
                  {playing ? (
                    <Pause className="h-4 w-4" fill="currentColor" />
                  ) : (
                    <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em]",
                          overlay === "satellite"
                            ? "bg-ice/15 text-ice"
                            : activeFrame?.kind === "nowcast"
                              ? "bg-solar/15 text-solar"
                              : "bg-aurora/15 text-aurora",
                        )}
                      >
                        {frameBadge}
                      </span>
                      <p className="truncate text-sm font-semibold tabular-nums text-white">
                        {activeTimeLabel}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-white/55">
                      {framesLabel}
                    </span>
                  </div>

                  <div className="group relative -mx-1 mt-1.5 rounded-md focus-within:ring-2 focus-within:ring-aurora/70 focus-within:ring-offset-2 focus-within:ring-offset-[#06111d]">
                    <div
                      className="pointer-events-none flex h-5 items-center gap-[2px]"
                      aria-hidden="true"
                    >
                      {frames.map((item, index) => (
                        <span
                          key={`${item.path}-${index}`}
                          className={cn(
                            "h-4 flex-1 origin-center rounded-full transition-[transform,background-color,box-shadow] duration-200",
                            index === activeIndex
                              ? "scale-y-100 bg-aurora"
                              : item.kind === "nowcast"
                                ? "scale-y-[0.375] bg-solar/45"
                                : "scale-y-[0.375] bg-white/25",
                          )}
                        />
                      ))}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, frames.length - 1)}
                      step={1}
                      value={Math.max(0, activeIndex)}
                      onChange={(event) => {
                        setPlaying(false);
                        setActiveIndex(Number(event.target.value));
                      }}
                      aria-label={t("mapTimeline")}
                      aria-valuetext={activeCaption}
                      className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
                    />
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs tabular-nums text-white/50">
                    <span>{firstTimeLabel}</span>
                    <span className="uppercase tracking-[0.08em]">{t("mapTimeline")}</span>
                    <span>{lastTimeLabel}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-2">
                <p className="truncate text-xs text-white/45">{t("radarSourceNote")}</p>
                <span className="hidden shrink-0 items-center gap-1 text-xs text-white/45 sm:flex">
                  <Sparkles className="h-3 w-3 text-solar/70" />
                  {t("radarPlaybackHint")}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const layerCard = (
    <GlassCard padding="md">
      <WidgetHeader
        title={t("mapLayers")}
        subtitle={t("radarOverlayDesc")}
        icon={<Layers3 className="h-4 w-4" />}
      />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => selectOverlay("radar")}
          aria-pressed={overlay === "radar"}
          className={cn(
            "pressable relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora/80",
            overlay === "radar"
              ? "border-aurora/35 bg-aurora/[0.08]"
              : "border-line/12 bg-surface-quiet hover:bg-surface-lift",
          )}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border",
                overlay === "radar"
                  ? "border-aurora/25 bg-aurora/10 text-aurora"
                  : "border-line/10 bg-surface-quiet text-muted",
              )}
            >
              <RadarIcon className="h-4 w-4" />
            </span>
            {overlay === "radar" ? (
              <Check className="h-3.5 w-3.5 text-aurora" />
            ) : null}
          </div>
          <span>
            <span className="block text-xs font-bold text-ink">{t("radarRadar")}</span>
            <span className="mt-0.5 block text-xs text-faint">
              {t("radarFrames", { count: format.num(radarFrames.length) })}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => selectOverlay("satellite")}
          disabled={!satelliteAvailable}
          aria-pressed={overlay === "satellite"}
          title={!satelliteAvailable ? t("radarSatelliteUnavailable") : undefined}
          className={cn(
            "pressable relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora/80",
            overlay === "satellite"
              ? "border-ice/35 bg-ice/[0.08]"
              : "border-line/12 bg-surface-quiet hover:bg-surface-lift",
            !satelliteAvailable && "opacity-45",
          )}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border",
                overlay === "satellite"
                  ? "border-ice/25 bg-ice/10 text-ice"
                  : "border-line/10 bg-surface-quiet text-muted",
              )}
            >
              <Satellite className="h-4 w-4" />
            </span>
            {overlay === "satellite" ? (
              <Check className="h-3.5 w-3.5 text-ice" />
            ) : null}
          </div>
          <span>
            <span className="block text-xs font-bold text-ink">{t("radarSatellite")}</span>
            <span className="mt-0.5 block text-xs text-faint">
              {t("radarFrames", { count: format.num(satelliteFrames.length) })}
            </span>
          </span>
        </button>
      </div>

      {!satelliteAvailable ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-faint">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {t("radarSatelliteUnavailable")}
        </p>
      ) : null}

      <div className="mt-4 border-t border-line/10 pt-4">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="radar-opacity" className="text-xs font-semibold text-ink">
            {t("mapOpacity")}
          </label>
          <span className="text-xs font-semibold tabular-nums text-muted">
            {format.percent(opacity * 100)}
          </span>
        </div>
        <input
          id="radar-opacity"
          type="range"
          min={25}
          max={100}
          step={1}
          value={Math.round(opacity * 100)}
          onChange={(event) => setOpacity(Number(event.target.value) / 100)}
          aria-label={t("mapOpacity")}
          className="range-aurora mt-2 w-full"
          style={{ "--range-value": `${Math.round(opacity * 100)}%` } as CSSProperties}
        />
      </div>

      <div className="mt-4 border-t border-line/10 pt-4">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
          {t("radarAtmosphere")}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={showTemperature}
            onClick={() => {
              vibrate(5);
              setShowTemperature((value) => !value);
            }}
            className={cn(
              "pressable flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora/80",
              showTemperature
                ? "border-solar/30 bg-solar/[0.08] text-solar"
                : "border-line/12 bg-surface-quiet text-muted hover:text-ink",
            )}
          >
            <Thermometer className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">
              {t("mapTemperature")}
            </span>
            <span className="shrink-0 text-xs text-faint">{format.tempUnit}</span>
          </button>

          <button
            type="button"
            aria-pressed={showWind}
            onClick={() => {
              vibrate(5);
              setShowWind((value) => !value);
            }}
            className={cn(
              "pressable flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora/80",
              showWind
                ? "border-aurora/30 bg-aurora/[0.08] text-aurora"
                : "border-line/12 bg-surface-quiet text-muted hover:text-ink",
            )}
          >
            <Wind className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">
              {t("mapWind")}
            </span>
            <span className="shrink-0 text-xs text-faint">{format.windUnit}</span>
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-faint">
          {t("radarAtmosphereDesc")}
        </p>

        <div className="mt-2 min-h-[1.5rem]">
          {!gridEnabled ? (
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-faint">
              <Activity className="mt-0.5 h-3 w-3 shrink-0" />
              {t("radarGridPaused")}
            </p>
          ) : gridQuery.isError ? (
            <button
              type="button"
              onClick={() => void gridQuery.refetch()}
              className="pressable flex items-center gap-1.5 text-xs font-semibold text-solar"
            >
              <RefreshCw className="h-3 w-3" />
              {t("mapNoPoints")} · {t("errorRetry")}
            </button>
          ) : gridQuery.isLoading ? (
            <p className="flex items-center gap-1.5 text-xs text-faint">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("mapGridLoading")}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Activity className="h-3 w-3 text-aurora" />
              {grid.length > 0
                ? t("radarGridSamples", { count: format.num(grid.length) })
                : t("mapNoPoints")}
              {gridQuery.isFetching ? (
                <Loader2 className="ml-0.5 h-3 w-3 animate-spin text-faint" />
              ) : null}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-line/10 pt-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
              {t("mapLegend")}
            </p>
            <span className="text-xs font-semibold text-muted">
              {overlay === "satellite" ? t("radarCloudLegend") : t("radarRainLegend")}
            </span>
          </div>
          <div
            className="mt-2 h-2 rounded-full border border-white/10"
            style={{
              background: overlay === "satellite" ? CLOUD_GRADIENT : RAIN_GRADIENT,
            }}
            aria-hidden="true"
          />
          <div className="mt-1 flex items-center justify-between text-xs uppercase tracking-[0.1em] text-faint">
            <span>
              {overlay === "satellite" ? t("radarCloudLegendLow") : t("lightRain")}
            </span>
            <span>
              {overlay === "satellite" ? t("radarCloudLegendHigh") : t("heavyRainLabel")}
            </span>
          </div>
        </div>

        {showTemperature ? (
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
                {t("mapTemperature")}
              </p>
              <span className="text-xs font-semibold text-muted">{format.tempUnit}</span>
            </div>
            <div
              className="mt-2 h-2 rounded-full border border-white/10"
              style={{ background: TEMPERATURE_GRADIENT }}
              aria-hidden="true"
            />
            <p className="mt-1 text-xs uppercase tracking-[0.1em] text-faint">
              {t("mapTemperatureLegend")}
            </p>
          </div>
        ) : null}

        {showWind ? (
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-faint">
            <Wind className="mt-0.5 h-3 w-3 shrink-0 text-aurora" />
            {t("mapWindLegend")}
          </p>
        ) : null}
      </div>
    </GlassCard>
  );

  const signalCard = (
    <GlassCard padding="md">
      <WidgetHeader
        title={t("mapTimeline")}
        subtitle={t("radarPlaybackHint")}
        icon={<Clock3 className="h-4 w-4" />}
      />

      <dl className="mt-4 space-y-2.5 text-xs">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-faint">{t("radarActivePlace")}</dt>
          <dd className="max-w-[13rem] text-right font-semibold leading-relaxed text-ink">
            {placeLabel(place)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-faint">{t("radarMapCenter")}</dt>
          <dd className="max-w-[13rem] text-right font-medium tabular-nums leading-relaxed text-muted">
            {coordinateLabel(viewport.latitude, viewport.longitude)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-faint">{t("updated", { time: "" }).trim()}</dt>
          <dd className="text-right font-semibold tabular-nums text-ink">{updatedLabel}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-faint">{t("radarRadar")}</dt>
          <dd className="text-right font-semibold tabular-nums text-ink">
            {t("radarFrames", { count: format.num(radarFrames.length) })}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-faint">{t("radarSatellite")}</dt>
          <dd className="text-right font-semibold tabular-nums text-ink">
            {t("radarFrames", { count: format.num(satelliteFrames.length) })}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-faint">{t("radarFuture")}</dt>
          <dd className="text-right font-semibold tabular-nums text-ink">
            {radar.nowcast.length > 0
              ? t("radarFrames", { count: format.num(radar.nowcast.length) })
              : t("radarNowcastUnavailable")}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/10 pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={radarQuery.isFetching}
          className="min-h-9 flex-1"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", radarQuery.isFetching && "animate-spin")}
          />
          {t("radarRefresh")}
        </Button>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-faint">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        {t("radarSourceNote")}
      </p>
    </GlassCard>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {hero}
      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="min-w-0">{mapShell}</div>
        <aside className="space-y-4 xl:sticky xl:top-24" aria-label={t("mapLayers")}>
          {layerCard}
          {signalCard}
        </aside>
      </div>
    </div>
  );
}
