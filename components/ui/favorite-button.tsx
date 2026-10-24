"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import type { MouseEvent } from "react";
import { useI18n } from "@/i18n/provider";
import { useHaptics } from "@/hooks/use-haptics";
import { MAX_FAVORITES, useLocations } from "@/store/use-locations";
import { toast } from "@/store/use-toast";
import { samePlace } from "@/lib/place";
import { cn } from "@/lib/utils";
import type { Place } from "@/types/geo";

interface FavoriteButtonProps {
  place: Place;
  className?: string;
  showLabel?: boolean;
  stopPropagation?: boolean;
}

/**
 * One visible heart control for search results, recents, the current hero,
 * the header and the favorites card. It owns the optimistic-looking animation,
 * the localized accessible label, the store mutation and the toast/undo copy.
 */
export function FavoriteButton({
  place,
  className,
  showLabel = false,
  stopPropagation = true,
}: FavoriteButtonProps) {
  const { t } = useI18n();
  const favorites = useLocations((state) => state.favorites);
  const toggleFavorite = useLocations((state) => state.toggleFavorite);
  const restoreFavorite = useLocations((state) => state.restoreFavorite);
  const vibrate = useHaptics();
  const reduceMotion = useReducedMotion();
  const isFavorite = favorites.some((favorite) => samePlace(favorite, place));
  const label = isFavorite ? t("removeFavorite") : t("addFavorite");

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) event.stopPropagation();
    vibrate(6);
    const result = toggleFavorite(place);
    if (result.status === "removed") {
      toast({
        message: t("favoriteRemoved", { city: place.name }),
        action: {
          label: t("undo"),
          onClick: () => restoreFavorite(result.favorite, result.index),
        },
      });
    } else if (result.status === "added") {
      toast({ message: t("favoriteAdded", { city: place.name }), tone: "success" });
    } else if (result.status === "limit") {
      toast({ message: t("favoriteLimitReached", { max: MAX_FAVORITES }), tone: "danger" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isFavorite}
      aria-label={label}
      title={`${label} · ${place.name}`}
      className={cn(
        "focus-ring pressable inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition-colors",
        showLabel ? "h-10 gap-2 px-3" : "h-10 w-10",
        isFavorite
          ? "border-aurora/30 bg-aurora/12 text-aurora"
          : "border-line/15 bg-surface-quiet text-muted hover:bg-surface-lift hover:text-ink",
        showLabel && "min-w-[9.5rem]",
        className,
      )}
    >
      <motion.span
        key={String(isFavorite)}
        initial={reduceMotion ? false : { scale: 0.72, opacity: 0.65 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 22 }}
        className="flex"
      >
        <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} aria-hidden="true" />
      </motion.span>
      {showLabel ? (
        <span className="whitespace-nowrap">{isFavorite ? t("favoriteSaved") : t("addFavorite")}</span>
      ) : null}
    </button>
  );
}
