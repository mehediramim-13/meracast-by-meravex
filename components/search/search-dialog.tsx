"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock3, Heart, Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/tooltip";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useHaptics } from "@/hooks/use-haptics";
import { queryKeys, useGeocodeQuery } from "@/hooks/use-weather";
import { useI18n } from "@/i18n/provider";
import { useLocations } from "@/store/use-locations";
import { useUI } from "@/store/use-ui";
import { placeToSearchParams } from "@/lib/place";
import { cn } from "@/lib/utils";
import type { Place } from "@/types/geo";

export function SearchDialog() {
  const open = useUI((state) => state.searchOpen);
  const setOpen = useUI((state) => state.setSearchOpen);
  const { t, language } = useI18n();
  const router = useRouter();
  const vibrate = useHaptics();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const debounced = useDebouncedValue(query.trim(), 250);
  const geocode = useGeocodeQuery(debounced, language);
  const queryClient = useQueryClient();
  const favorites = useLocations((state) => state.favorites);
  const recents = useLocations((state) => state.recents);
  const activePlace = useLocations((state) => state.activePlace);
  const setActivePlace = useLocations((state) => state.setActivePlace);
  const removeRecent = useLocations((state) => state.removeRecent);
  const { locate, status, reset } = useGeolocation();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);

  const results = debounced.length >= 2 ? geocode.data ?? [] : [];
  const showSuggestions = debounced.length < 2;
  const suggestionPlaces = showSuggestions ? [...recents, ...favorites] : results;
  const locating = status === "locating";

  useEffect(() => {
    openRef.current = open;
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
    reset?.();
  }, [open, reset]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, suggestionPlaces.length - 1)));
  }, [suggestionPlaces.length]);

  useEffect(() => {
    const key = queryKeys.geocode(debounced, language);
    return () => {
      void queryClient.cancelQueries({ queryKey: key, exact: true });
    };
  }, [debounced, language, queryClient]);

  const choose = (place: Place) => {
    vibrate(7);
    setActivePlace(place);
    const params = placeToSearchParams(place);
    setOpen(false);
    router.push(`/?${params.toString()}`);
  };

  const resolveMyLocation = async () => {
    if (locating) return;
    const place = await locate(language);
    if (!place || !openRef.current) return;
    choose(place);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionPlaces.length) {
      if (event.key === "Enter" && results[0]) choose(results[0]);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestionPlaces.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + suggestionPlaces.length) % suggestionPlaces.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const place = suggestionPlaces[activeIndex];
      if (place) choose(place);
    }
  };

  const locationMessage =
    status === "denied"
      ? { title: t("locationDenied"), body: t("locationDeniedBody") }
      : status === "timeout"
        ? { title: t("locationTimeout"), body: t("locationTimeoutBody") }
        : status === "unavailable"
          ? { title: t("locationUnavailable"), body: t("locationUnavailableBody") }
          : status === "insecure"
            ? { title: t("locationInsecure"), body: t("locationInsecureBody") }
            : status === "unsupported"
              ? { title: t("locationUnsupported"), body: t("useLocationInstead") }
              : null;

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={t("searchTitle")}
      description={t("searchShortcut")}
      size="lg"
      className="sm:max-h-[82svh]"
      initialFocusRef={inputRef}
    >
      <div className="sticky top-0 z-10 -mx-1 bg-[var(--modal-bg)] pb-3 pt-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionPlaces.length > 0}
            aria-controls="search-results"
            aria-activedescendant={
              suggestionPlaces[activeIndex] ? `search-result-${activeIndex}` : undefined
            }
            className="h-12 w-full rounded-2xl border border-line/15 bg-surface-quiet pl-10 pr-10 text-sm font-medium text-ink outline-none transition-colors placeholder:text-faint focus:border-aurora/40 focus:bg-surface-lift"
          />
          {query ? (
            <button
              type="button"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery("");
                setActiveIndex(0);
                inputRef.current?.focus();
              }}
              aria-label={t("clear")}
              className="pressable absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-faint hover:bg-white/5 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="kbd absolute right-3 top-1/2 -translate-y-1/2">esc</kbd>
          )}
        </div>

        <button
          type="button"
          onClick={() => void resolveMyLocation()}
          aria-busy={locating}
          aria-disabled={locating}
          className={cn(
            "pressable mt-2.5 flex h-14 min-h-14 w-full items-center gap-3 rounded-xl border border-aurora/20 bg-aurora/[0.06] px-3.5 text-left transition-colors hover:bg-aurora/[0.1]",
            locating && "cursor-progress opacity-70",
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-aurora/20 bg-aurora/10 text-aurora">
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-ink">
              {locating ? t("locating") : t("useMyLocation")}
            </span>
            <span className="block text-xs text-muted">{t("useMyLocationDesc")}</span>
          </span>
        </button>
      </div>

      {locationMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 rounded-xl border border-solar/20 bg-solar/[0.06] px-3 py-2.5 text-xs leading-relaxed text-muted"
        >
          <p>
            <span className="font-semibold text-solar">{locationMessage.title}. </span>
            {locationMessage.body}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!openRef.current) return;
              vibrate(5);
              choose(activePlace);
            }}
            className="focus-ring mt-2 rounded-md border border-solar/20 bg-surface-quiet px-2 py-1 text-xs font-semibold text-ink hover:bg-surface-lift"
          >
            {t("useLastCity", { city: activePlace.name })}
          </button>
        </div>
      ) : null}

      <div ref={listRef} id="search-results" role="listbox" className="pb-2">
        {showSuggestions ? (
          <div className="space-y-4 pt-1">
            {recents.length ? (
              <section>
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-faint">
                    <Clock3 className="h-3 w-3" />
                    {t("recentSearches")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => useLocations.getState().clearRecents()}
                    className="pressable rounded px-1.5 py-0.5 text-xs font-semibold text-faint hover:text-ink"
                  >
                    {t("clear")}
                  </button>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {recents.map((place, index) => (
                    <PlaceButton
                      key={place.id}
                      place={place}
                      index={index}
                      active={activeIndex === index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(place)}
                      action={
                        <>
                          <FavoriteButton place={place} />
                          <button
                            type="button"
                            onClick={() => removeRecent(place.id)}
                            aria-label={`${t("remove")} ${place.name}`}
                            className="focus-ring pressable flex h-9 w-9 items-center justify-center rounded-lg text-faint opacity-100 transition-opacity hover:bg-white/10 hover:text-ink sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      }
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-[0.18em] text-faint">
                <Heart className="h-3 w-3" />
                {t("favoritePlaces")}
              </h3>
              {favorites.length ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {favorites.map((place, index) => (
                    <PlaceButton
                      key={place.id}
                      place={place}
                      index={recents.length + index}
                      active={activeIndex === recents.length + index}
                      onMouseEnter={() => setActiveIndex(recents.length + index)}
                      onClick={() => choose(place)}
                      action={<FavoriteButton place={place} />}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line/10 px-3 py-4 text-center text-xs text-faint">
                  {t("noFavoritesBody")}
                </p>
              )}
            </section>

            {!recents.length && !favorites.length ? (
              <div className="rounded-2xl border border-dashed border-line/10 px-5 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-aurora/10 text-aurora">
                  <MapPin className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-bold text-ink">{t("searchEmpty")}</p>
                <p className="mt-1 text-xs text-muted">{t("searchEmptyBody")}</p>
              </div>
            ) : null}
          </div>
        ) : geocode.isLoading && !results.length ? (
          <div className="space-y-1.5 py-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : geocode.isError ? (
          <div className="rounded-xl border border-danger/20 bg-danger/[0.06] px-4 py-6 text-center">
            <p className="text-sm font-semibold text-ink">{t("errorTitle")}</p>
            <p className="mt-1 text-xs text-muted">{t("errorBody")}</p>
            <button
              type="button"
              onClick={() => void geocode.refetch()}
              className="pressable mt-3 rounded-lg border border-line/15 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-white/5"
            >
              {t("errorRetry")}
            </button>
          </div>
        ) : results.length ? (
          <>
            {geocode.isFetching ? (
              <div
                role="status"
                className="flex items-center gap-2 px-1 py-2 text-xs font-medium text-faint"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("searchingResults")}
              </div>
            ) : null}
            <AnimatePresence initial={false}>
              <ul className="space-y-1">
                {results.map((place, index) => (
                  <motion.li
                    key={place.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.025, 0.15) }}
                  >
                    <PlaceButton
                      place={place}
                      index={index}
                      active={activeIndex === index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(place)}
                      meta={
                        place.population ? (
                          <Badge tone="neutral" className="hidden shrink-0 sm:inline-flex">
                            {new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-US", {
                              notation: "compact",
                              maximumFractionDigits: 1,
                            }).format(place.population)}
                          </Badge>
                        ) : null
                      }
                      action={<FavoriteButton place={place} />}
                    />
                  </motion.li>
                ))}
              </ul>
            </AnimatePresence>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-line/10 px-5 py-8 text-center">
            <p className="text-sm font-bold text-ink">{t("noResults")}</p>
            <p className="mt-1 text-xs text-muted">{t("noResultsBody")}</p>
          </div>
        )}
      </div>

      <p className="pb-1 pt-2 text-center text-xs font-medium text-faint">
        {t("poweredBy")} · Open-Meteo · RainViewer
      </p>
    </Modal>
  );
}

function PlaceButton({
  place,
  index,
  active,
  onClick,
  onMouseEnter,
  action,
  meta,
}: {
  place: Place;
  index: number;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  action?: ReactNode;
  meta?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "group flex min-h-14 items-stretch gap-1 rounded-xl border border-line/10 bg-surface-quiet transition-colors",
        active ? "border-line/20 bg-surface-lift" : "hover:bg-surface-lift",
      )}
      onMouseEnter={onMouseEnter}
    >
      <button
        type="button"
        id={`search-result-${index}`}
        role="option"
        aria-selected={active}
        onClick={onClick}
        className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line/10 bg-surface-quiet text-aurora">
          <MapPin className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{place.name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {[place.admin1, place.country].filter(Boolean).join(", ") || t("view")}
          </span>
        </span>
        {meta}
      </button>
      <div className="flex shrink-0 items-center gap-1 pr-1.5">
        {place.countryCode ? (
          <span className="w-7 text-right text-[0.625rem] font-bold uppercase tracking-[0.08em] text-faint">
            {place.countryCode}
          </span>
        ) : null}
        {action}
      </div>
    </div>
  );
}
