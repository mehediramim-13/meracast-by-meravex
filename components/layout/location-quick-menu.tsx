"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock3,
  CloudRain,
  GripVertical,
  Heart,
  House,
  Loader2,
  LocateFixed,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useHydrated, useMediaQuery, useNow, useOnline } from "@/hooks/use-environment";
import { useFormat } from "@/hooks/use-format";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useHaptics } from "@/hooks/use-haptics";
import { useFavoriteSummariesQuery, useGeocodeQuery } from "@/hooks/use-weather";
import { useI18n } from "@/i18n/provider";
import { useLocations } from "@/store/use-locations";
import { useSettings } from "@/store/use-settings";
import { useToast } from "@/store/use-toast";
import { useUI } from "@/store/use-ui";
import { formatUtcTime, toBengaliDigits } from "@/lib/format";
import { localizedPlaceDetail, localizedPlaceName } from "@/lib/place-localization";
import { placeToSearchParams, samePlace } from "@/lib/place";
import { getCondition } from "@/lib/weather-codes";
import { cn } from "@/lib/utils";
import type { FavoriteSummary } from "@/types/weather";
import type { Place, SavedPlace } from "@/types/geo";

interface LocationQuickMenuProps {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function timeZoneFor(place: Place): string {
  if (place.timezone && place.timezone !== "auto") return place.timezone;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka";
  } catch {
    return "Asia/Dhaka";
  }
}

function summaryFor(
  summaries: FavoriteSummary[] | undefined,
  place: Place,
): FavoriteSummary | undefined {
  return summaries?.find(
    (summary) =>
      Math.abs(summary.latitude - place.latitude) < 0.001 &&
      Math.abs(summary.longitude - place.longitude) < 0.001,
  );
}

function SummarySkeleton() {
  return (
    <span className="flex items-center gap-2" aria-hidden="true">
      <span className="skeleton h-5 w-5 rounded-full" />
      <span className="skeleton h-3 w-9" />
      <span className="skeleton h-3 w-12" />
    </span>
  );
}

/**
 * Lazily loaded quick-switch surface: a left-aligned popover on desktop and a
 * bottom sheet below 640px. All location mutations flow through the shared
 * locations store so the full search modal stays in sync.
 */
export function LocationQuickMenu({ open, triggerRef }: LocationQuickMenuProps) {
  const { t, language } = useI18n();
  const router = useRouter();
  const vibrate = useHaptics();
  const format = useFormat();
  const online = useOnline();
  const hydrated = useHydrated();
  const now = useNow(30_000);
  const isMobile = useMediaQuery("(max-width: 639px)");
  const reduceMotion = useReducedMotion();
  const timeFormat = useSettings((state) => state.units.time);
  const bengaliNumerals = useSettings((state) => state.bengaliNumerals);

  const setOpen = useUI((state) => state.setLocationMenuOpen);
  const setSearchOpen = useUI((state) => state.setSearchOpen);

  const favorites = useLocations((state) => state.favorites);
  const recents = useLocations((state) => state.recents);
  const activePlace = useLocations((state) => state.activePlace);
  const homePlaceId = useLocations((state) => state.homePlaceId);
  const setActivePlace = useLocations((state) => state.setActivePlace);
  const setHomePlace = useLocations((state) => state.setHomePlace);
  const reorderFavorite = useLocations((state) => state.reorderFavorite);
  const clearRecents = useLocations((state) => state.clearRecents);

  const { locate, status, reset } = useGeolocation();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 360 });
  const [portalReady, setPortalReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  const openRef = useRef(open);
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 250);
  const geocode = useGeocodeQuery(open ? debounced : "", language, { enabled: open });
  const summaries = useFavoriteSummariesQuery(favorites, open && favorites.length > 0);

  const showSearch = trimmed.length >= 2;
  const results = showSearch ? geocode.data ?? [] : [];
  const searchLoading =
    showSearch && (geocode.isLoading || (geocode.isFetching && geocode.isPlaceholderData));
  const locating = status === "locating";

  const orderedFavorites = useMemo(() => {
    if (!homePlaceId) return favorites;
    const home = favorites.find((favorite) => favorite.id === homePlaceId);
    if (!home) return favorites;
    return [home, ...favorites.filter((favorite) => favorite.id !== homePlaceId)];
  }, [favorites, homePlaceId]);

  const recentPlaces = useMemo(
    () =>
      recents
        .filter((recent) => !favorites.some((favorite) => samePlace(favorite, recent)))
        .slice(0, 5),
    [favorites, recents],
  );

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

  const close = useCallback(() => setOpen(false), [setOpen]);

  const choose = useCallback(
    (place: Place) => {
      vibrate(7);
      setActivePlace(place);
      close();
      router.push(`/?${placeToSearchParams(place).toString()}`);
    },
    [close, router, setActivePlace, vibrate],
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    openRef.current = open;
    if (open) {
      wasOpenRef.current = true;
      setQuery("");
      setActiveIndex(0);
      return;
    }
    setQuery("");
    setActiveIndex(0);
    reset();
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open, reset, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (!open || isMobile) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(360, window.innerWidth - 24);
      setPosition({
        top: rect.bottom + 8,
        left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12)),
        width,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isMobile, open, triggerRef]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [close, isMobile, open, triggerRef]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
    };
  }, [isMobile, open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, results.length - 1)));
  }, [results.length]);

  const resolveMyLocation = async () => {
    if (locating) return;
    const place = await locate(language);
    if (!place || !openRef.current) return;
    choose(place);
  };

  const setHome = (place: Place) => {
    vibrate(6);
    setHomePlace(place);
    useToast.getState().push({
      message: t("quickHomeSet", { city: localizedPlaceName(place, language) }),
      tone: "success",
    });
  };

  const moveFavorite = (place: SavedPlace, direction: "up" | "down") => {
    if (place.id === homePlaceId) return;
    const index = orderedFavorites.findIndex((favorite) => favorite.id === place.id);
    if (index < 0) return;
    vibrate(4);
    reorderFavorite(place.id, index + (direction === "up" ? -1 : 1));
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      if (!results.length) return;
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      if (!results.length) return;
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      if (!showSearch) return;
      event.preventDefault();
      const place = results[activeIndex] ?? results[0];
      if (place) choose(place);
    }
  };

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const typing =
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable);

    if (event.key === "Tab") {
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    if (typing) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const rows = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>("[data-quick-row]") ?? [],
    ).filter((element) => element.offsetParent !== null);
    if (!rows.length) return;
    event.preventDefault();
    const current = rows.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "ArrowDown"
        ? (current + 1 + rows.length) % rows.length
        : (current - 1 + rows.length) % rows.length;
    rows[next]?.focus();
  };

  const locationButton = (
    <button
      type="button"
      onClick={() => void resolveMyLocation()}
      aria-busy={locating}
      aria-disabled={locating}
      className={cn(
        "pressable flex min-h-12 w-full items-center gap-3 rounded-xl border border-aurora/20 bg-aurora/[0.06] px-3 text-left transition-colors hover:bg-aurora/[0.1]",
        locating && "cursor-progress opacity-70",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-aurora/20 bg-aurora/10 text-aurora">
        {locating ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-ink">
          {locating ? t("locating") : t("useMyLocation")}
        </span>
        <span className="block truncate text-[0.7rem] text-muted">{t("useMyLocationDesc")}</span>
      </span>
    </button>
  );

  const menu = (
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-[90]",
            isMobile ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          {isMobile ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm"
              onClick={close}
              aria-hidden="true"
            />
          ) : (
            <div className="absolute inset-0" aria-hidden="true" onClick={close} />
          )}

          <motion.div
            ref={panelRef}
            id="location-quick-menu"
            role="dialog"
            aria-modal={isMobile ? true : undefined}
            aria-labelledby="location-quick-title"
            aria-describedby="location-quick-description"
            onKeyDown={onPanelKeyDown}
            onClick={(event) => event.stopPropagation()}
            initial={reduceMotion ? false : { opacity: 0, y: isMobile ? 12 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: isMobile ? 12 : -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={
              isMobile
                ? undefined
                : {
                    top: position.top,
                    left: position.left,
                    width: position.width,
                    maxHeight: "min(70vh, 46rem)",
                  }
            }
            className={cn(
              "absolute flex flex-col overflow-hidden border border-line/15 bg-[var(--modal-bg)] shadow-2xl shadow-black/30",
              isMobile
                ? "inset-x-0 bottom-0 max-h-[86svh] rounded-t-[1.75rem]"
                : "pointer-events-auto rounded-2xl",
            )}
          >
            <div className="flex shrink-0 items-start gap-2 px-3 pb-1 pt-3 sm:px-4 sm:pt-4">
              <div className="min-w-0 flex-1">
                <div
                  className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line/25 sm:hidden"
                  aria-hidden="true"
                />
                <h2 id="location-quick-title" className="text-sm font-bold text-ink">
                  {t("quickSwitchTitle")}
                </h2>
                <p
                  id="location-quick-description"
                  className="truncate text-[0.7rem] text-muted"
                >
                  {t("quickSwitchSubtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={isMobile ? t("quickSheetClose") : t("close")}
                className="focus-ring pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line/15 bg-surface-quiet text-muted transition-colors hover:bg-surface-lift hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="shrink-0 px-3 pb-2 pt-2 sm:px-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("searchPlaceholder")}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showSearch && results.length > 0}
                  aria-controls="quick-location-results"
                  aria-activedescendant={
                    showSearch && results[activeIndex]
                      ? `quick-location-result-${activeIndex}`
                      : undefined
                  }
                  className="h-11 w-full rounded-xl border border-line/15 bg-surface-quiet pl-9 pr-9 text-sm font-medium text-ink outline-none transition-colors placeholder:text-faint focus:border-aurora/40 focus:bg-surface-lift"
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
                    className="pressable absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-faint hover:bg-white/5 hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <kbd className="kbd absolute right-2.5 top-1/2 hidden -translate-y-1/2 sm:inline-flex">
                    esc
                  </kbd>
                )}
              </div>
              <div className="mt-2">{locationButton}</div>
              {locationMessage ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-2 rounded-xl border border-solar/20 bg-solar/[0.06] px-3 py-2 text-[0.7rem] leading-relaxed text-muted"
                >
                  <p>
                    <span className="font-semibold text-solar">{locationMessage.title}. </span>
                    {locationMessage.body}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!openRef.current) return;
                      choose(activePlace);
                    }}
                    className="focus-ring mt-1.5 rounded-md border border-solar/20 bg-surface-quiet px-2 py-1 text-[0.7rem] font-semibold text-ink hover:bg-surface-lift"
                  >
                    {t("useLastCity", { city: localizedPlaceName(activePlace, language) })}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] sm:px-4 sm:pb-4">
              {showSearch ? (
                <section aria-live="polite" aria-busy={searchLoading}>
                  <div className="flex items-center justify-between px-1 pb-1.5">
                    <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-faint">
                      {t("search")}
                    </h3>
                    {geocode.isFetching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-faint" aria-hidden="true" />
                    ) : null}
                  </div>
                  {searchLoading ? (
                    <div className="space-y-1.5" aria-label={t("searchingResults")}>
                      {[0, 1, 2].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-xl border border-line/10 p-2.5"
                        >
                          <span className="skeleton h-9 w-9 rounded-lg" />
                          <div className="flex-1 space-y-1.5">
                            <span className="skeleton block h-3 w-28" />
                            <span className="skeleton block h-2.5 w-40" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : geocode.isError && online && !results.length ? (
                    <div
                      role="status"
                      className="rounded-xl border border-line/10 bg-surface-quiet px-3 py-4 text-center"
                    >
                      <p className="text-xs font-semibold text-ink">{t("quickSearchError")}</p>
                      <p className="mt-1 text-[0.7rem] leading-relaxed text-muted">
                        {t("quickSearchErrorBody")}
                      </p>
                      <button
                        type="button"
                        onClick={() => void geocode.refetch()}
                        className="focus-ring pressable mt-2.5 min-h-9 rounded-lg border border-line/15 bg-surface-lift px-3 text-xs font-semibold text-ink hover:bg-white/5"
                      >
                        {t("errorRetry")}
                      </button>
                    </div>
                  ) : results.length ? (
                    <div id="quick-location-results" role="listbox" className="space-y-1">
                      {results.map((place, index) => {
                        const active = index === activeIndex;
                        return (
                          <div
                            key={place.id}
                            id={`quick-location-result-${index}`}
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={cn(
                              "flex items-center gap-1 rounded-xl border p-1.5 transition-colors",
                              active
                                ? "border-aurora/25 bg-aurora/[0.09]"
                                : "border-transparent hover:bg-surface-quiet",
                            )}
                          >
                            <button
                              type="button"
                              data-quick-row
                              onClick={() => choose(place)}
                              className="focus-ring min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left"
                            >
                              <span className="block truncate text-xs font-semibold text-ink">
                                {localizedPlaceName(place, language)}
                              </span>
                              <span className="block truncate text-[0.7rem] text-muted">
                                {localizedPlaceDetail(place, language) || t("yourLocation")}
                              </span>
                            </button>
                            <FavoriteButton place={place} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      role="status"
                      className="rounded-xl border border-line/10 bg-surface-quiet px-3 py-4 text-center"
                    >
                      <p className="text-xs font-semibold text-ink">
                        {online ? t("noResults") : t("offlineSearch")}
                      </p>
                      <p className="mt-1 text-[0.7rem] leading-relaxed text-muted">
                        {online ? t("noResultsBody") : t("offlineSearchBody")}
                      </p>
                    </div>
                  )}
                </section>
              ) : (
                <>
                  <section aria-labelledby="quick-favorites-heading">
                    <div className="flex items-center justify-between px-1 pb-1.5">
                      <h3
                        id="quick-favorites-heading"
                        className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-faint"
                      >
                        <Heart className="h-3 w-3" aria-hidden="true" />
                        {t("favoritePlaces")}
                        {favorites.length ? (
                          <span className="rounded-full bg-surface-quiet px-1.5 py-0.5 tabular text-[0.6rem] text-muted">
                            {format.num(favorites.length)}
                          </span>
                        ) : null}
                      </h3>
                      {!online && favorites.length ? (
                        <span className="rounded-full border border-line/15 px-1.5 py-0.5 text-[0.6rem] font-semibold text-muted">
                          {t("quickOffline")}
                        </span>
                      ) : null}
                    </div>

                    {favorites.length ? (
                      <ul className="space-y-1.5">
                        {orderedFavorites.map((place, index) => {
                          const summary = summaryFor(summaries.data, place);
                          const current = samePlace(place, activePlace);
                          const isHome = place.id === homePlaceId;
                          const canMoveUp = !isHome && index > (homePlaceId ? 1 : 0);
                          const canMoveDown =
                            !isHome && index < orderedFavorites.length - 1;
                          const city = localizedPlaceName(place, language);
                          const condition = summary
                            ? getCondition(summary.conditionCode)
                            : null;
                          return (
                            <li
                              key={place.id}
                              onDragOver={(event) => {
                                if (!draggingId || draggingId === place.id) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (!draggingId || draggingId === place.id) {
                                  setDraggingId(null);
                                  return;
                                }
                                const targetIndex = orderedFavorites.findIndex(
                                  (favorite) => favorite.id === place.id,
                                );
                                if (targetIndex >= 0) reorderFavorite(draggingId, targetIndex);
                                setDraggingId(null);
                              }}
                              className={cn(
                                "rounded-xl border transition-colors",
                                current
                                  ? "border-aurora/25 bg-aurora/[0.07]"
                                  : "border-line/10 bg-surface-quiet/45",
                                draggingId === place.id && "opacity-60",
                              )}
                            >
                              <div className="flex items-start gap-1 p-1.5">
                                <button
                                  type="button"
                                  data-quick-row
                                  onClick={() => choose(place)}
                                  aria-current={current ? "true" : undefined}
                                  className="focus-ring min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left"
                                >
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <span className="truncate text-xs font-bold text-ink">
                                      {city}
                                    </span>
                                    {isHome ? (
                                      <span className="shrink-0 rounded-full border border-aurora/20 bg-aurora/10 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-aurora">
                                        {t("quickHome")}
                                      </span>
                                    ) : null}
                                    {current ? (
                                      <span className="flex shrink-0 items-center text-aurora">
                                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span className="sr-only">{t("quickCurrent")}</span>
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="mt-0.5 block truncate text-[0.68rem] text-muted">
                                    {localizedPlaceDetail(place, language) ||
                                      t("currentLocation")}
                                  </span>
                                  <span className="mt-1 flex min-w-0 items-center gap-2.5 text-[0.7rem] text-muted">
                                    <span className="flex shrink-0 items-center gap-1 tabular">
                                      <Clock3 className="h-3 w-3 text-faint" aria-hidden="true" />
                                      {hydrated
                                        ? bengaliNumerals
                                          ? toBengaliDigits(
                                              formatUtcTime(
                                                now.getTime(),
                                                timeZoneFor(place),
                                                timeFormat,
                                              ),
                                            )
                                          : formatUtcTime(
                                              now.getTime(),
                                              timeZoneFor(place),
                                              timeFormat,
                                            )
                                        : "—:—"}
                                    </span>
                                    {summary ? (
                                      <span className="flex min-w-0 items-center gap-1">
                                        {condition ? (
                                          <WeatherIcon
                                            kind={condition.icon}
                                            isDay={summary.isDay}
                                            size={18}
                                            animated={false}
                                            className="h-[18px] w-[18px] shrink-0"
                                          />
                                        ) : null}
                                        <span className="tabular font-semibold text-ink">
                                          {summary.temperature === null
                                            ? "—"
                                            : format.temp(summary.temperature)}
                                        </span>
                                      </span>
                                    ) : summaries.isLoading ? (
                                      <SummarySkeleton />
                                    ) : summaries.isError ? (
                                      <span className="truncate text-[0.65rem] text-faint">
                                        {t("quickWeatherUnavailable")}
                                      </span>
                                    ) : null}
                                    {summary?.precipitationProbability !== null &&
                                    summary?.precipitationProbability !== undefined ? (
                                      <span className="flex shrink-0 items-center gap-0.5 tabular text-rain">
                                        <CloudRain className="h-3 w-3" aria-hidden="true" />
                                        {format.percent(summary.precipitationProbability)}
                                        <span className="sr-only">
                                          {t("quickRainNextHour")}
                                        </span>
                                      </span>
                                    ) : null}
                                  </span>
                                </button>

                                <div className="flex shrink-0 items-center gap-0.5">
                                  <FavoriteButton place={place} />
                                  <button
                                    type="button"
                                    onClick={() => setHome(place)}
                                    aria-pressed={isHome}
                                    aria-label={
                                      isHome ? t("quickHome") : t("quickSetHome", { city })
                                    }
                                    title={isHome ? t("quickHome") : t("quickSetHome", { city })}
                                    className={cn(
                                      "focus-ring pressable flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                                      isHome
                                        ? "border-aurora/30 bg-aurora/10 text-aurora"
                                        : "border-line/15 bg-surface-quiet text-muted hover:bg-surface-lift hover:text-ink",
                                    )}
                                  >
                                    <House
                                      className={cn("h-4 w-4", isHome && "fill-current")}
                                      aria-hidden="true"
                                    />
                                  </button>
                                  <span
                                    draggable={!isHome}
                                    onDragStart={(event) => {
                                      if (isHome) {
                                        event.preventDefault();
                                        return;
                                      }
                                      setDraggingId(place.id);
                                      event.dataTransfer.effectAllowed = "move";
                                      event.dataTransfer.setData("text/plain", place.id);
                                    }}
                                    onDragEnd={() => setDraggingId(null)}
                                    title={isHome ? t("quickHome") : t("quickDrag")}
                                    aria-hidden="true"
                                    className={cn(
                                      "hidden h-10 w-7 items-center justify-center text-faint hover:text-muted sm:flex",
                                      isHome
                                        ? "cursor-not-allowed opacity-25"
                                        : "cursor-grab active:cursor-grabbing",
                                    )}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 border-t border-line/10 px-2 py-1">
                                <span className="min-w-0 truncate pl-1 text-[0.62rem] text-faint">
                                  {current
                                    ? t("quickCurrent")
                                    : isHome
                                      ? t("quickHome")
                                      : ""}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => moveFavorite(place, "up")}
                                    disabled={!canMoveUp}
                                    aria-label={t("quickMoveUp", { city })}
                                    title={t("quickMoveUp", { city })}
                                    className="focus-ring pressable flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-white/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-25"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveFavorite(place, "down")}
                                    disabled={!canMoveDown}
                                    aria-label={t("quickMoveDown", { city })}
                                    title={t("quickMoveDown", { city })}
                                    className="focus-ring pressable flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-white/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-25"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="rounded-xl border border-dashed border-line/15 bg-surface-quiet/60 px-3 py-5 text-center">
                        <Heart className="mx-auto h-5 w-5 text-faint" aria-hidden="true" />
                        <p className="mt-2 text-xs font-semibold text-ink">
                          {t("quickNoFavorites")}
                        </p>
                        <p className="mx-auto mt-1 max-w-[15rem] text-[0.7rem] leading-relaxed text-muted">
                          {t("quickNoFavoritesBody")}
                        </p>
                      </div>
                    )}
                  </section>

                  {recentPlaces.length ? (
                    <section className="mt-4" aria-labelledby="quick-recent-heading">
                      <div className="flex items-center justify-between px-1 pb-1.5">
                        <h3
                          id="quick-recent-heading"
                          className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-faint"
                        >
                          <Clock3 className="h-3 w-3" aria-hidden="true" />
                          {t("recentSearches")}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            vibrate(4);
                            clearRecents();
                          }}
                          className="focus-ring pressable rounded px-1.5 py-0.5 text-[0.68rem] font-semibold text-faint hover:text-ink"
                        >
                          {t("clear")}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {recentPlaces.map((place) => (
                          <div
                            key={place.id}
                            className="flex items-center gap-1 rounded-xl border border-transparent p-1.5 transition-colors hover:bg-surface-quiet"
                          >
                            <button
                              type="button"
                              data-quick-row
                              onClick={() => choose(place)}
                              className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left"
                            >
                              <Clock3 className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden="true" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-semibold text-ink">
                                  {localizedPlaceName(place, language)}
                                </span>
                                <span className="block truncate text-[0.68rem] text-muted">
                                  {localizedPlaceDetail(place, language) || t("recentSearches")}
                                </span>
                              </span>
                            </button>
                            <FavoriteButton place={place} />
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  vibrate(5);
                  close();
                  setSearchOpen(true);
                }}
                className="focus-ring pressable mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line/15 bg-surface-quiet px-3 text-xs font-semibold text-muted transition-colors hover:bg-surface-lift hover:text-ink"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                {t("quickManage")}
              </button>

              <p className="sr-only">{t("quickKeyboardHint")}</p>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  if (!portalReady || typeof document === "undefined") return null;
  return createPortal(menu, document.body);
}
