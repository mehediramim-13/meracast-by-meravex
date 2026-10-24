"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Heart, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useLocations } from "@/store/use-locations";
import { useSettings } from "@/store/use-settings";
import { useUI } from "@/store/use-ui";
import { useHydrated, useNow } from "@/hooks/use-environment";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import { formatUtcTime, toBengaliDigits } from "@/lib/format";
import { localizedPlaceName } from "@/lib/place-localization";
import { samePlace } from "@/lib/place";

const LocationQuickMenu = dynamic(
  () => import("@/components/layout/location-quick-menu").then((module) => module.LocationQuickMenu),
  { ssr: false },
);

/**
 * The header location chip. The trigger stays small and fixed-width, while the
 * heavier menu (search, weather summaries, drag and drop) loads on first use.
 */
export function LocationQuickSwitch() {
  const { t, language } = useI18n();
  const place = useLocations((state) => state.activePlace);
  const favorites = useLocations((state) => state.favorites);
  const open = useUI((state) => state.locationMenuOpen);
  const setOpen = useUI((state) => state.setLocationMenuOpen);
  const setSearchOpen = useUI((state) => state.setSearchOpen);
  const timeFormat = useSettings((state) => state.units.time);
  const bengaliNumerals = useSettings((state) => state.bengaliNumerals);
  const hydrated = useHydrated();
  const now = useNow(20_000);
  const vibrate = useHaptics();
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  const timeZone = place.timezone && place.timezone !== "auto" ? place.timezone : "Asia/Dhaka";
  const clockRaw = formatUtcTime(now.getTime(), timeZone, timeFormat);
  const clock = bengaliNumerals ? toBengaliDigits(clockRaw) : clockRaw;
  const isFavorite = favorites.some((favorite) => samePlace(favorite, place));
  const city = localizedPlaceName(place, language);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          vibrate(5);
          if (!open) setSearchOpen(false);
          setOpen(!open);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "location-quick-menu" : undefined}
        aria-label={t("changeLocation", { city })}
        className={cn(
          "focus-ring pressable group flex h-11 w-[8.75rem] shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-left text-sm transition-colors sm:w-[12.5rem] lg:w-[14rem]",
          open
            ? "border-aurora/30 bg-surface-lift text-ink"
            : "border-line/15 bg-surface-quiet text-ink hover:border-line/25 hover:bg-surface-lift",
        )}
      >
        <MapPin className="hidden h-3.5 w-3.5 shrink-0 text-aurora sm:block" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{city}</span>
        {isFavorite ? (
          <Heart className="h-3 w-3 shrink-0 fill-current text-aurora" aria-hidden="true" />
        ) : null}
        <span className="tabular hidden shrink-0 text-xs font-medium text-muted sm:inline">
          {hydrated ? clock : "—:—"}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
          className="flex shrink-0 items-center text-faint group-hover:text-muted"
          aria-hidden="true"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.span>
      </button>

      {mounted ? <LocationQuickMenu open={open} triggerRef={triggerRef} /> : null}
    </>
  );
}
