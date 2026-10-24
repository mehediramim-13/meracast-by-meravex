"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { CloudRainWind, CloudSun, Plus, Radar, Settings2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/motion";
import { useHaptics } from "@/hooks/use-haptics";
import { useLocations } from "@/store/use-locations";
import { useUI } from "@/store/use-ui";
import type { TranslationKey } from "@/i18n/en";

export const NAV_ITEMS = [
  { href: "/", labelKey: "navWeather" as TranslationKey, icon: CloudSun },
  { href: "/rain-planner", labelKey: "navPlanner" as TranslationKey, icon: CloudRainWind },
  { href: "/radar", labelKey: "navRadar" as TranslationKey, icon: Radar },
  { href: "/settings", labelKey: "navSettings" as TranslationKey, icon: Settings2 },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/city");
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const vibrate = useHaptics();

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[17.5rem] flex-col border-r border-line/10 bg-[var(--sidebar-bg)] lg:flex">
      <div className="px-6 pt-7">
        <Link
          href="/"
          className="focus-ring inline-flex rounded-xl"
          onClick={() => vibrate(5)}
          aria-label={`${t("appName")} — ${t("tagline")}`}
        >
          <span className="flex items-center gap-2.5">
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[13px] border border-line/15 bg-[#0b1b2b]">
              <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" aria-hidden="true">
                <path
                  d="M11.5 31.5V20.4C11.5 17.2 15.3 15.9 17.5 18.4L24 25.6L30.5 18.4C32.7 15.9 36.5 17.2 36.5 20.4V31.5"
                  stroke="#7EB3B8"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="24" cy="36.2" r="2.3" fill="#7EB3B8" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-[1.15rem] font-bold leading-none tracking-[-0.035em]">
                Mera<span className="text-aurora">Cast</span>
              </span>
              <span className="mt-1 block text-xs font-medium text-faint">
                by MeraVex
              </span>
            </span>
          </span>
        </Link>
      </div>

      <nav aria-label="Primary" className="mt-8 flex flex-col gap-1 px-4">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => vibrate(5)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group pressable relative flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold",
                active ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl border border-line/15 bg-surface-quiet"
                  transition={springs.layout}
                />
              ) : null}
              <Icon
                className={cn(
                  "relative h-[1.15rem] w-[1.15rem] transition-colors",
                  active ? "text-aurora" : "text-muted group-hover:text-ink",
                )}
                strokeWidth={2}
              />
              <span className="relative">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 flex min-h-0 flex-1 flex-col px-4">
        <div className="flex items-center justify-between px-2.5">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">
            {t("favoritePlaces")}
          </p>
          <Link
            href="/settings"
            className="focus-ring rounded-md p-1 text-faint transition-colors hover:text-ink"
            aria-label={t("manageFavorites")}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Link>
        </div>
        <SidebarFavorites />
      </div>

      <div className="p-4">
        <div className="rounded-2xl border border-line/15 bg-surface-quiet p-4">
          <p className="font-heading text-base font-semibold leading-snug text-ink">{t("tagline")}</p>
          <p className="mt-3 text-xs font-medium text-faint">by MeraVex</p>
        </div>
      </div>
    </aside>
  );
}

function SidebarFavorites() {
  const favorites = useLocations((state) => state.favorites);
  const active = useLocations((state) => state.activePlace);
  const setActive = useLocations((state) => state.setActivePlace);
  const setSearchOpen = useUI((state) => state.setSearchOpen);
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const vibrate = useHaptics();

  return (
    <div className="mt-2 min-h-0 space-y-1 overflow-y-auto no-scrollbar">
      {favorites.length === 0 ? (
        <p className="px-2.5 pb-2 pt-2 text-xs leading-relaxed text-faint">{t("noFavoritesBody")}</p>
      ) : (
        favorites.slice(0, 5).map((place) => {
          const isCurrent =
            Math.abs(place.latitude - active.latitude) < 0.01 &&
            Math.abs(place.longitude - active.longitude) < 0.01;
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => {
                vibrate(6);
                setActive(place);
                if (pathname !== "/") router.push("/");
              }}
              className={cn(
                "pressable group flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors",
                isCurrent ? "bg-surface-quiet text-ink" : "text-muted hover:bg-surface-quiet hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  isCurrent ? "bg-aurora" : "bg-faint/40",
                )}
              />
              <span className="min-w-0 flex-1 truncate">{place.name}</span>
              <span className="shrink-0 text-xs font-medium uppercase tracking-[0.06em] text-faint">
                {place.countryCode}
              </span>
            </button>
          );
        })
      )}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="pressable flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-faint transition-colors hover:bg-surface-quiet hover:text-ink"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("addFavorite")}
      </button>
    </div>
  );
}
