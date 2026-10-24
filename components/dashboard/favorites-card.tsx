"use client";

import { Heart, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { useWeatherQuery } from "@/hooks/use-weather";
import { useHaptics } from "@/hooks/use-haptics";
import { useLocations } from "@/store/use-locations";
import { useUI } from "@/store/use-ui";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { getCondition } from "@/lib/weather-codes";
import { getTodayDaily } from "@/lib/weather";
import { cn } from "@/lib/utils";
import type { SavedPlace } from "@/types/geo";

export function FavoritesCard() {
  const { t } = useI18n();
  const favorites = useLocations((state) => state.favorites);
  const active = useLocations((state) => state.activePlace);
  const setSearchOpen = useUI((state) => state.setSearchOpen);
  const shown = favorites.slice(0, 4);

  return (
    <GlassCard className="relative flex h-full flex-col overflow-hidden">
      <WidgetHeader
        title={t("worldWeather")}
        subtitle={t("worldWeatherSubtitle")}
        icon={<Heart className="h-4 w-4" />}
        action={
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="pressable focus-ring flex h-8 items-center gap-1 rounded-lg border border-line/10 bg-surface-quiet px-2.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
          >
            <Plus className="h-3 w-3" />
            {t("addFavorite")}
          </button>
        }
      />

      {shown.length === 0 ? (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line/15 px-4 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line/10 bg-surface-quiet">
            <Heart className="h-5 w-5 text-faint" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">{t("noFavorites")}</p>
          <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted">{t("noFavoritesBody")}</p>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="pressable focus-ring mt-4 flex items-center gap-1.5 rounded-xl border border-aurora/25 bg-aurora/10 px-3 py-2 text-xs font-semibold text-aurora"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addFavorite")}
          </button>
        </div>
      ) : (
        <div className="mt-4 grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          {shown.map((place) => (
            <FavoriteMini key={place.id} place={place} active={active.id === place.id} />
          ))}
        </div>
      )}

      {favorites.length > shown.length ? (
        <p className="mt-3 text-center text-xs text-faint">
          {t("manageFavorites")} · {favorites.length}
        </p>
      ) : null}
    </GlassCard>
  );
}

function FavoriteMini({ place, active }: { place: SavedPlace; active: boolean }) {
  const { t, td } = useI18n();
  const format = useFormat();
  const router = useRouter();
  const vibrate = useHaptics();
  const setActive = useLocations((state) => state.setActivePlace);
  const query = useWeatherQuery(place);
  const weather = query.data;
  const condition = weather ? getCondition(weather.current.conditionCode) : null;
  const today = weather ? getTodayDaily(weather) : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-3 transition-colors",
        active ? "border-aurora/30 bg-aurora/[0.07]" : "border-line/10 bg-surface-quiet hover:bg-surface-lift",
      )}
    >
      <button
        type="button"
        onClick={() => {
          vibrate(6);
          setActive(place);
          router.push("/");
        }}
        className="focus-ring block w-full text-left"
        aria-label={`${place.name} · ${weather ? td(getCondition(weather.current.conditionCode).labelKey) : t("loading")}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 pr-10">
            <p className="truncate text-xs font-bold text-ink">{place.name}</p>
            <p className="mt-0.5 truncate text-xs uppercase tracking-[0.1em] text-faint">
              {place.countryCode ?? place.country}
            </p>
          </div>
        </div>

        {weather && condition ? (
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <WeatherIcon kind={condition.icon} isDay={weather.current.isDay} size={28} animated={false} className="h-7 w-7 shrink-0" />
              <p className="text-xl font-bold tabular leading-none text-ink">
                {format.temp(weather.current.temperature)}
              </p>
            </div>
            <div className="text-right">
              <p className="truncate text-xs font-medium text-muted">{td(condition.labelKey)}</p>
              {today ? (
                <p className="mt-0.5 text-xs tabular text-faint">
                  {format.temp(today.temperatureMax)} / {format.temp(today.temperatureMin)}
                </p>
              ) : null}
            </div>
          </div>
        ) : query.isError ? (
          <p className="mt-3 text-xs text-faint">{t("noWeatherData")}</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-2.5 w-full" />
          </div>
        )}
      </button>

      <FavoriteButton place={place} className="absolute right-2 top-2 z-10" />
    </div>
  );
}
