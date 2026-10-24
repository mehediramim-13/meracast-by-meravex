"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock3, Loader2, MapPin, Search, Star } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useGeocodeQuery } from "@/hooks/use-weather";
import { useI18n } from "@/i18n/provider";
import { useLocations } from "@/store/use-locations";
import { samePlace } from "@/lib/place";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Place } from "@/types/geo";

interface PlaceComboboxProps {
  value?: Place;
  onSelect: (place: Place) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function PlaceCombobox({
  value,
  onSelect,
  label,
  placeholder,
  className,
  compact = false,
}: PlaceComboboxProps) {
  const { t, language } = useI18n();
  const listId = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value?.name ?? "");
  const [activeIndex, setActiveIndex] = useState(0);
  const debounced = useDebouncedValue(query.trim(), 240);
  const favorites = useLocations((state) => state.favorites);
  const recents = useLocations((state) => state.recents);
  const searching = debounced.length >= 2 && debounced !== value?.name;
  const geocode = useGeocodeQuery(searching ? debounced : "", language);

  const suggestions = [...recents, ...favorites]
    .filter((place, index, list) => {
      if (value && samePlace(place, value)) return false;
      return list.findIndex((candidate) => samePlace(candidate, place)) === index;
    })
    .slice(0, 6);

  const results = searching ? geocode.data ?? [] : suggestions;
  const showCurrent = Boolean(value) && !searching;
  const optionCount = results.length + (showCurrent ? 1 : 0);

  useEffect(() => {
    if (!open) setQuery(value?.name ?? "");
  }, [open, value?.name]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced]);

  const choose = (place: Place) => {
    setQuery(place.name);
    setOpen(false);
    onSelect(place);
  };

  const activePlace = (): Place | null => {
    if (showCurrent) {
      if (activeIndex === 0) return value ?? null;
      return results[activeIndex - 1] ?? null;
    }
    return results[activeIndex] ?? null;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (optionCount) setActiveIndex((index) => (index + 1) % optionCount);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (optionCount) setActiveIndex((index) => (index - 1 + optionCount) % optionCount);
    } else if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      const place = activePlace();
      if (place) choose(place);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery(value?.name ?? "");
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {label ? (
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-faint">
          {label}
        </span>
      ) : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && optionCount ? `${listId}-option-${activeIndex}` : undefined
          }
          aria-label={label ?? t("plannerSearchPlace")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={(event) => {
            setOpen(true);
            event.currentTarget.select();
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? t("plannerSearchPlace")}
          className={cn(
            "w-full rounded-xl border border-line/15 bg-surface-quiet pl-10 pr-10 text-sm font-medium text-ink outline-none transition-colors placeholder:text-faint focus:border-aurora/45 focus:bg-surface-lift",
            compact ? "h-11" : "h-12",
          )}
        />
        {searching && geocode.isFetching ? (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-aurora" />
        ) : (
          <MapPin className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-aurora/70" />
        )}
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={springs.snappy}
            className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-line/20 bg-[var(--modal-bg)] shadow-lift"
          >
            <div
              id={listId}
              role="listbox"
              aria-label={t("plannerSearchPlace")}
              className="max-h-72 overflow-y-auto overscroll-contain p-1.5"
            >
              {showCurrent && value ? (
                <button
                  type="button"
                  id={`${listId}-option-0`}
                  role="option"
                  aria-selected={activeIndex === 0}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    activeIndex === 0 ? "bg-surface-lift" : "hover:bg-surface-quiet",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-aurora/20 bg-aurora/10 text-aurora">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-ink">
                      {value.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {[value.admin1, value.country].filter(Boolean).join(", ") || t("plannerCurrent")}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-faint">
                    {value.countryCode}
                  </span>
                </button>
              ) : null}

              {searching && geocode.isLoading && !results.length ? (
                <div className="space-y-1 p-1" aria-busy="true">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="skeleton h-11 rounded-lg" />
                  ))}
                </div>
              ) : null}

              {results.map((place, index) => {
                const optionIndex = showCurrent ? index + 1 : index;
                return (
                  <button
                    key={place.id}
                    type="button"
                    id={`${listId}-option-${optionIndex}`}
                    role="option"
                    aria-selected={activeIndex === optionIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(optionIndex)}
                    onClick={() => choose(place)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      activeIndex === optionIndex ? "bg-surface-lift" : "hover:bg-surface-quiet",
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line/10 bg-surface-quiet text-muted">
                      {recents.some((recent) => samePlace(recent, place)) ? (
                        <Clock3 className="h-3.5 w-3.5" />
                      ) : favorites.some((favorite) => samePlace(favorite, place)) ? (
                        <Star className="h-3.5 w-3.5" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-ink">
                        {place.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {[place.admin1, place.country].filter(Boolean).join(", ") || t("view")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-faint">
                      {place.countryCode}
                    </span>
                  </button>
                );
              })}

              {searching && !geocode.isLoading && !results.length ? (
                <div className="px-3 py-5 text-center">
                  <p className="text-xs font-semibold text-ink">{t("noResults")}</p>
                  <p className="mt-1 text-xs text-muted">{t("noResultsBody")}</p>
                </div>
              ) : null}

              {!searching && !suggestions.length ? (
                <p className="px-3 py-4 text-center text-xs leading-relaxed text-faint">
                  {t("plannerSearchHint")}
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
