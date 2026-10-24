"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CloudRainWind,
  CloudSun,
  Command,
  Download,
  Languages,
  MapPin,
  MoonStar,
  Radar,
  Search,
  Settings2,
  Share2,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Modal } from "@/components/ui/modal";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useHaptics } from "@/hooks/use-haptics";
import { useGeocodeQuery } from "@/hooks/use-weather";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/provider";
import { useLocations } from "@/store/use-locations";
import { useSettings } from "@/store/use-settings";
import { useUI } from "@/store/use-ui";
import { placeToSearchParams, samePlace } from "@/lib/place";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/en";

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  group: "navigation" | "actions" | "places" | "favorites";
  run: () => void;
}

const GROUP_LABEL: Record<CommandItem["group"], TranslationKey> = {
  navigation: "commandNavigation",
  actions: "commandActions",
  favorites: "commandFavorites",
  places: "search",
};

export function CommandPalette() {
  const open = useUI((state) => state.paletteOpen);
  const setOpen = useUI((state) => state.setPaletteOpen);
  const openShare = useUI((state) => state.openShare);
  const setInstallOpen = useUI((state) => state.setInstallOpen);
  const { t, language } = useI18n();
  const router = useRouter();
  const vibrate = useHaptics();
  const { cycle } = useTheme();
  const toggleLanguage = useSettings((state) => state.toggleLanguage);
  const favorites = useLocations((state) => state.favorites);
  const setActivePlace = useLocations((state) => state.setActivePlace);
  const addRecent = useLocations((state) => state.addRecent);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const debounced = useDebouncedValue(query.trim(), 240);
  const geocode = useGeocodeQuery(debounced, language);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router, setOpen],
  );

  const jumpTo = useCallback(
    (place: (typeof favorites)[number]) => {
      vibrate(7);
      setActivePlace(place);
      addRecent(place);
      setOpen(false);
      router.push(`/?${placeToSearchParams(place).toString()}`);
    },
    [vibrate, setActivePlace, addRecent, setOpen, router],
  );

  const items = useMemo<CommandItem[]>(() => {
    const base: CommandItem[] = [
      {
        id: "nav-weather",
        label: t("navWeather"),
        hint: t("commandNavigation"),
        icon: CloudSun,
        group: "navigation",
        run: () => navigate("/"),
      },
      {
        id: "nav-planner",
        label: t("commandRainPlanner"),
        hint: t("navPlanner"),
        icon: CloudRainWind,
        group: "navigation",
        run: () => navigate("/rain-planner"),
      },
      {
        id: "nav-radar",
        label: t("commandRadar"),
        hint: t("navRadar"),
        icon: Radar,
        group: "navigation",
        run: () => navigate("/radar"),
      },
      {
        id: "nav-settings",
        label: t("commandOpenSettings"),
        hint: t("navSettings"),
        icon: Settings2,
        group: "navigation",
        run: () => navigate("/settings"),
      },
      {
        id: "action-theme",
        label: t("commandToggleTheme"),
        hint: t("theme"),
        icon: MoonStar,
        group: "actions",
        run: () => {
          cycle();
          setOpen(false);
        },
      },
      {
        id: "action-language",
        label: t("commandToggleLanguage"),
        hint: t("language"),
        icon: Languages,
        group: "actions",
        run: () => {
          toggleLanguage();
          setOpen(false);
        },
      },
      {
        id: "action-share",
        label: t("commandShare"),
        hint: t("shareWeather"),
        icon: Share2,
        group: "actions",
        run: () => {
          setOpen(false);
          openShare("weather");
        },
      },
      {
        id: "action-install",
        label: t("install"),
        hint: t("installTitle"),
        icon: Download,
        group: "actions",
        run: () => {
          setOpen(false);
          setInstallOpen(true);
        },
      },
    ];

    const favoriteItems: CommandItem[] = favorites.map((place) => ({
      id: `favorite-${place.id}`,
      label: place.name,
      hint: [place.admin1, place.country].filter(Boolean).join(", "),
      icon: Star,
      group: "favorites",
      run: () => jumpTo(place),
    }));

    const placeItems: CommandItem[] = (debounced.length >= 2 ? geocode.data ?? [] : []).map(
      (place) => ({
        id: `place-${place.id}`,
        label: place.name,
        hint: [place.admin1, place.country].filter(Boolean).join(", "),
        icon: MapPin,
        group: "places",
        run: () => {
          vibrate(7);
          setActivePlace(place);
          addRecent(place);
          setOpen(false);
          router.push(`/?${placeToSearchParams(place).toString()}`);
        },
      }),
    );

    const all = [...base, ...favoriteItems, ...placeItems];
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) || item.hint?.toLowerCase().includes(needle),
    );
  }, [
    t,
    favorites,
    debounced,
    geocode.data,
    query,
    cycle,
    toggleLanguage,
    openShare,
    setInstallOpen,
    setOpen,
    router,
    setActivePlace,
    addRecent,
    vibrate,
    navigate,
    jumpTo,
  ]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const run = (item: CommandItem | undefined) => {
    if (!item) return;
    vibrate(6);
    item.run();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((current) => (items.length ? (current + 1) % items.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((current) => (items.length ? (current - 1 + items.length) % items.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(items[index]);
    }
  };

  let lastGroup: CommandItem["group"] | null = null;

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={t("commandTitle")}
      size="md"
      className="sm:max-h-[76svh]"
      hideClose
    >
      <div className="sticky top-0 z-10 -mx-1 bg-[var(--modal-bg)] pb-2 pt-1">
        <div className="relative">
          <Command className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-aurora" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("commandPlaceholder")}
            aria-label={t("commandPlaceholder")}
            role="combobox"
            aria-controls="command-results"
            aria-expanded
            aria-activedescendant={items[index] ? `command-${items[index]!.id}` : undefined}
            className="h-12 w-full rounded-2xl border border-line/15 bg-surface-quiet pl-10 pr-12 text-sm font-medium text-ink outline-none placeholder:text-faint focus:border-aurora/40 focus:bg-surface-lift"
          />
          <kbd className="kbd absolute right-3 top-1/2 -translate-y-1/2">esc</kbd>
        </div>
      </div>

      <div id="command-results" role="listbox" className="min-h-[12rem] pb-3">
        {items.length ? (
          <ul className="space-y-1">
            {items.map((item, itemIndex) => {
              const Icon = item.icon;
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <li key={item.id}>
                  {showGroup ? (
                    <p className="px-2 pb-1 pt-3 text-xs font-bold uppercase tracking-[0.2em] text-faint first:pt-1">
                      {t(GROUP_LABEL[item.group])}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    id={`command-${item.id}`}
                    role="option"
                    aria-selected={index === itemIndex}
                    onMouseEnter={() => setIndex(itemIndex)}
                    onClick={() => run(item)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left transition-colors",
                      index === itemIndex ? "bg-surface-lift" : "hover:bg-surface-quiet",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line/10",
                        item.group === "actions"
                          ? "bg-solar/10 text-solar"
                          : item.group === "favorites"
                            ? "bg-solar/10 text-solar"
                            : "bg-aurora/[0.08] text-aurora",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">
                        {item.label}
                      </span>
                      {item.hint ? (
                        <span className="block truncate text-xs text-faint">{item.hint}</span>
                      ) : null}
                    </span>
                    <ArrowRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-faint transition-opacity",
                        index === itemIndex ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Search className="h-6 w-6 text-faint" />
            <p className="text-sm font-semibold text-ink">{t("commandNoResults")}</p>
            <p className="text-xs text-muted">{t("noResultsBody")}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line/10 pt-3 text-xs text-faint">
        <span>{t("commandHint")}</span>
        <span className="flex items-center gap-1">
          <kbd className="kbd">⌘</kbd>
          <kbd className="kbd">K</kbd>
        </span>
      </div>
    </Modal>
  );
}
