"use client";

import { motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useHydrated } from "@/hooks/use-environment";
import {
  useAirQualityQuery,
  useClimateQuery,
  useWeatherQuery,
} from "@/hooks/use-weather";
import { useSceneSync } from "@/hooks/use-scene-sync";
import { useLocations } from "@/store/use-locations";
import { useSettings } from "@/store/use-settings";
import { useUI } from "@/store/use-ui";
import { CurrentHero } from "@/components/dashboard/current-hero";
import { AlertsBanner } from "@/components/dashboard/alerts-banner";
import { NowcastCard } from "@/components/dashboard/nowcast-card";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { HourlyForecast } from "@/components/dashboard/hourly-forecast";
import { DailyForecast } from "@/components/dashboard/daily-forecast";
import { AirQualityCard } from "@/components/dashboard/air-quality-card";
import { SunCard } from "@/components/dashboard/sun-card";
import { SuggestionsCard } from "@/components/dashboard/suggestions-card";
import { HistoryCard } from "@/components/dashboard/history-card";
import { AstronomyCard } from "@/components/dashboard/astronomy-card";
import { FavoritesCard } from "@/components/dashboard/favorites-card";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { deriveAlerts } from "@/lib/alerts";
import { samePlace } from "@/lib/place";
import { todayFor } from "@/lib/weather";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Place } from "@/types/geo";
import type { WidgetId } from "@/types/settings";
import type { WeatherData } from "@/types/weather";

const SPANS: Record<WidgetId, string> = {
  nowcast: "xl:col-span-7",
  summary: "xl:col-span-5",
  hourly: "xl:col-span-12",
  daily: "xl:col-span-7",
  favorites: "xl:col-span-7",
  air: "xl:col-span-5",
  sun: "xl:col-span-5",
  suggestions: "xl:col-span-7",
  history: "xl:col-span-5",
  astronomy: "xl:col-span-5",
};

interface HomeDashboardProps {
  initialPlace: Place;
  initialWeather?: WeatherData;
  fromUrl?: boolean;
}

export function HomeDashboard({ initialPlace, initialWeather, fromUrl = false }: HomeDashboardProps) {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const storePlace = useLocations((state) => state.activePlace);
  const setActivePlace = useLocations((state) => state.setActivePlace);
  const widgets = useSettings((state) => state.widgets);
  const setCustomizeOpen = useUI((state) => state.setCustomizeOpen);
  const [selectedPlace, setSelectedPlace] = useState<Place>(initialWeather?.place ?? initialPlace);
  const initialized = useRef(false);

  const initialData =
    initialWeather && samePlace(initialWeather.place, selectedPlace) ? initialWeather : undefined;
  const weatherQuery = useWeatherQuery(selectedPlace, { initialData });
  const weather = weatherQuery.data;
  const airQuery = useAirQualityQuery(selectedPlace, Boolean(weather));
  const today = weather ? todayFor(weather) : "";
  const climateQuery = useClimateQuery(selectedPlace, today, Boolean(weather));

  useSceneSync(weather);

  useEffect(() => {
    if (!hydrated || initialized.current) return;
    initialized.current = true;
    if (fromUrl) {
      if (!samePlace(storePlace, initialPlace)) setActivePlace(initialPlace);
      setSelectedPlace(initialPlace);
    } else if (!samePlace(storePlace, selectedPlace)) {
      setSelectedPlace(storePlace);
    }
  }, [hydrated, fromUrl, initialPlace, storePlace, selectedPlace, setActivePlace]);

  useEffect(() => {
    if (!hydrated) return;
    if (!samePlace(storePlace, selectedPlace)) {
      setSelectedPlace(storePlace);
    }
  }, [hydrated, storePlace, selectedPlace]);

  const alerts = useMemo(() => (weather ? deriveAlerts(weather) : []), [weather]);
  const visibleWidgets = widgets.filter((widget) => widget.visible);

  const handleRefresh = () => {
    void weatherQuery.refetch();
    if (weather) {
      void airQuery.refetch();
      void climateQuery.refetch();
    }
  };

  if (!weather) {
    if (weatherQuery.isError) {
      const error = weatherQuery.error as { status?: number } | null;
      return (
        <GlassCard className="min-h-[28rem]">
          <ErrorState
            title={error?.status === 429 ? t("rateLimited") : t("errorTitle")}
            body={error?.status === 429 ? t("rateLimitedBody") : t("errorBody")}
            onRetry={() => void weatherQuery.refetch()}
            retryLabel={t("errorRetry")}
          />
        </GlassCard>
      );
    }
    return <DashboardSkeleton />;
  }

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case "nowcast":
        return <NowcastCard weather={weather} />;
      case "summary":
        return <SummaryCard weather={weather} />;
      case "hourly":
        return <HourlyForecast weather={weather} />;
      case "daily":
        return <DailyForecast weather={weather} />;
      case "air":
        return (
          <AirQualityCard
            air={airQuery.data}
            loading={airQuery.isLoading}
            error={airQuery.isError}
          />
        );
      case "sun":
        return <SunCard weather={weather} />;
      case "suggestions":
        return <SuggestionsCard weather={weather} air={airQuery.data} />;
      case "history":
        return (
          <HistoryCard
            weather={weather}
            comparison={climateQuery.data}
            loading={climateQuery.isLoading}
            error={climateQuery.isError}
          />
        );
      case "astronomy":
        return <AstronomyCard weather={weather} />;
      case "favorites":
        return <FavoritesCard />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-faint">{t("tagline")}</p>
        <button
          type="button"
          onClick={() => setCustomizeOpen(true)}
          className="pressable focus-ring flex min-h-9 items-center gap-1.5 rounded-xl border border-line/10 bg-surface-quiet px-3 text-xs font-semibold text-muted transition-colors hover:bg-surface-lift hover:text-ink"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t("widgetsTitle")}
        </button>
      </div>

      <CurrentHero weather={weather} onRefresh={handleRefresh} refreshing={weatherQuery.isFetching} />

      {weatherQuery.isError ? (
        <div className="rounded-xl border border-solar/20 bg-solar/[0.06] px-4 py-2.5 text-xs text-solar">
          {t("cachedDataBody")}
        </div>
      ) : null}

      <AlertsBanner alerts={alerts} />

      {visibleWidgets.length === 0 ? (
        <GlassCard>
          <EmptyState
            title={t("widgetsTitle")}
            body={t("widgetsDesc")}
            actionLabel={t("resetLayout")}
            onAction={() => useSettings.getState().resetWidgets()}
            illustration="cloud"
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-12 gap-4 sm:gap-5 xl:grid-flow-row-dense">
          {visibleWidgets.map((widget) => (
            <motion.div
              key={widget.id}
              id={`widget-${widget.id}`}
              layout
              transition={springs.layout}
              className={cn("col-span-12 min-w-0", SPANS[widget.id])}
            >
              {renderWidget(widget.id)}
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <p className="text-xs font-medium text-faint">{t("footerSources")}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          loading={weatherQuery.isFetching}
          className="text-xs font-medium text-faint"
        >
          {weatherQuery.isFetching ? t("loading") : t("updated", { time: "" }).replace(" {time}", "")}
        </Button>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-5" aria-busy="true" aria-label={t("loading")}>
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton h-3 w-40" />
        <div className="skeleton h-9 w-36 rounded-xl" />
      </div>
      <div className="relative overflow-hidden rounded-[2rem] border border-line/15 bg-surface-quiet">
        <div className="p-6 sm:p-9">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="skeleton h-5 w-28" />
              <div className="skeleton h-8 w-52" />
              <div className="skeleton h-4 w-72" />
            </div>
            <div className="skeleton h-10 w-28 rounded-xl" />
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="skeleton h-28 w-56" />
              <div className="skeleton h-6 w-40" />
              <div className="skeleton h-4 w-64" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="skeleton h-12 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-72 rounded-3xl" />
        ))}
      </div>
      <p className="text-center text-xs text-faint">{t("loadingDetail")}</p>
    </div>
  );
}
