"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Languages, Monitor, Moon, Search, Sun } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useSettings } from "@/store/use-settings";
import { useUI } from "@/store/use-ui";
import { useTheme } from "@/hooks/use-theme";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { IconButton } from "@/components/ui/icon-button";
import { LocationQuickSwitch } from "@/components/layout/location-quick-switch";

export function Header() {
  const { t, language } = useI18n();
  const setSearchOpen = useUI((state) => state.setSearchOpen);
  const setPaletteOpen = useUI((state) => state.setPaletteOpen);
  const { mode, resolved, cycle } = useTheme();
  const toggleLanguage = useSettings((state) => state.toggleLanguage);
  const vibrate = useHaptics();
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const next = latest > 10;
    if (next !== scrolled) setScrolled(next);
  });

  const ThemeIcon = mode === "system" ? Monitor : resolved === "dark" ? Moon : Sun;

  return (
    <header
      className={cn(
        "no-print sticky top-0 z-40 transition-colors duration-300",
        scrolled
          ? "border-b border-line/10 bg-[var(--header-bg)]"
          : "border-b border-transparent",
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-[4.25rem] w-full max-w-[1600px] items-center gap-3 px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
        <Link href="/" className="focus-ring mr-1 shrink-0 rounded-lg lg:hidden" aria-label={t("appName")}>
          <Logo size="sm" showWordmark={false} />
        </Link>

        <button
          type="button"
          onClick={() => {
            vibrate(5);
            setSearchOpen(true);
          }}
          className="pressable group hidden h-11 w-full max-w-[22rem] items-center gap-2.5 rounded-xl border border-line/15 bg-surface-quiet px-3.5 text-left text-sm text-muted transition-colors hover:border-line/25 hover:bg-surface-lift sm:flex"
          aria-label={t("search")}
          aria-keyshortcuts="/"
        >
          <Search className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-aurora" />
          <span className="min-w-0 flex-1 truncate">{t("searchPlaceholder")}</span>
          <kbd className="kbd hidden sm:inline-flex">/</kbd>
        </button>

        <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <Link
            href="/rain-planner"
            className="focus-ring hidden items-center gap-2 rounded-xl border border-line/15 bg-surface-quiet px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface-lift hover:text-ink md:flex lg:hidden xl:flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-aurora" aria-hidden="true" />
            {t("navPlanner")}
          </Link>

          <LocationQuickSwitch />

          <button
            type="button"
            onClick={() => {
              vibrate(7);
              toggleLanguage();
            }}
            className="pressable flex h-11 min-w-11 items-center gap-1.5 rounded-xl border border-line/15 bg-surface-quiet px-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-lift hover:text-ink"
            aria-label={`${t("switchLanguage")}: ${language === "en" ? t("bangla") : t("english")}`}
            title={t("switchLanguage")}
          >
            <Languages className="h-4 w-4" />
            <span className="hidden xs:inline">{language === "en" ? "বাং" : "EN"}</span>
          </button>

          <IconButton label={t("theme")} onClick={cycle} variant="glass">
            <motion.span
              key={mode}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex"
            >
              <ThemeIcon className="h-4 w-4" />
            </motion.span>
          </IconButton>

          <button
            type="button"
            onClick={() => {
              vibrate(5);
              setPaletteOpen(true);
            }}
            className="pressable hidden h-11 items-center gap-2 rounded-xl border border-line/15 bg-surface-quiet px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface-lift hover:text-ink xl:flex"
            aria-label={t("commandTitle")}
          >
            <span className="flex items-center gap-0.5">
              <kbd className="kbd">⌘</kbd>
              <kbd className="kbd">K</kbd>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
