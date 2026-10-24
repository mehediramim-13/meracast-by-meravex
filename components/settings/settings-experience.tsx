"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  BellRing,
  Check,
  Clock3,
  Download,
  Gauge,
  Info,
  Languages,
  LayoutGrid,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Thermometer,
  Trash2,
  Wind,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/tooltip";
import { Button, buttonClasses } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { Segmented, Switch, type SegmentOption } from "@/components/ui/controls";
import { Logo } from "@/components/brand/logo";
import { useHaptics } from "@/hooks/use-haptics";
import { useHydrated } from "@/hooks/use-environment";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/provider";
import { APP_VERSION, STORAGE_KEYS } from "@/lib/constants";
import {
  notificationPermission,
  requestNotificationPermission,
  sendNotification,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { WIDGET_LABELS } from "@/lib/widgets";
import { useLocations } from "@/store/use-locations";
import { useSettings } from "@/store/use-settings";
import { useUI } from "@/store/use-ui";
import type { TranslationKey } from "@/i18n/en";
import type {
  PrecipUnit,
  PressureUnit,
  TemperatureUnit,
  ThemeMode,
  TimeFormat,
  WindUnit,
} from "@/types/settings";

type PermissionState = NotificationPermission | "unsupported" | null;

interface SectionMeta {
  id: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

const SECTIONS: readonly SectionMeta[] = [
  { id: "appearance", labelKey: "appearance", icon: Palette },
  { id: "units", labelKey: "units", icon: Thermometer },
  { id: "motion", labelKey: "motionAndPerformance", icon: Gauge },
  { id: "notifications", labelKey: "notificationsTitle", icon: BellRing },
  { id: "widgets", labelKey: "widgetsTitle", icon: LayoutGrid },
  { id: "install", labelKey: "install", icon: Download },
  { id: "data", labelKey: "dataAndPrivacy", icon: ShieldCheck },
  { id: "about", labelKey: "about", icon: Info },
];

const THEMES: readonly {
  value: ThemeMode;
  labelKey: TranslationKey;
  icon: LucideIcon;
  preview: string;
  surface: string;
  line: string;
}[] = [
  {
    value: "light",
    labelKey: "themeLight",
    icon: Sun,
    preview: "bg-[linear-gradient(145deg,#f7fbff_0%,#dbe9fb_58%,#c4dbf5_100%)]",
    surface: "bg-white/70",
    line: "bg-[#183b5b]/20",
  },
  {
    value: "dark",
    labelKey: "themeDark",
    icon: Moon,
    preview: "bg-[linear-gradient(145deg,#0d2137_0%,#071321_58%,#03080e_100%)]",
    surface: "bg-white/[0.09]",
    line: "bg-white/25",
  },
  {
    value: "system",
    labelKey: "themeSystem",
    icon: Monitor,
    preview:
      "bg-[linear-gradient(115deg,#f7fbff_0%,#dbe9fb_48%,#0d2137_49%,#03080e_100%)]",
    surface: "bg-white/20",
    line: "bg-white/30",
  },
];

const TEMPERATURE_OPTIONS: readonly SegmentOption<TemperatureUnit>[] = [
  { value: "c", label: "°C", shortLabel: "°C" },
  { value: "f", label: "°F", shortLabel: "°F" },
];

const WIND_OPTIONS: readonly SegmentOption<WindUnit>[] = [
  { value: "kmh", label: "km/h", shortLabel: "km/h" },
  { value: "mph", label: "mph", shortLabel: "mph" },
  { value: "ms", label: "m/s", shortLabel: "m/s" },
  { value: "kn", label: "kn", shortLabel: "kn" },
];

const PRECIP_OPTIONS: readonly SegmentOption<PrecipUnit>[] = [
  { value: "mm", label: "mm", shortLabel: "mm" },
  { value: "in", label: "in", shortLabel: "in" },
];

const PRESSURE_OPTIONS: readonly SegmentOption<PressureUnit>[] = [
  { value: "hpa", label: "hPa", shortLabel: "hPa" },
  { value: "inhg", label: "inHg", shortLabel: "inHg" },
];

const TIME_OPTIONS: readonly SegmentOption<TimeFormat>[] = [
  { value: "12h", label: "12h", shortLabel: "12h" },
  { value: "24h", label: "24h", shortLabel: "24h" },
];

export function SettingsExperience() {
  const { t } = useI18n();
  const { mode, setMode } = useTheme();
  const language = useSettings((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);
  const bengaliNumerals = useSettings((state) => state.bengaliNumerals);
  const setBengaliNumerals = useSettings((state) => state.setBengaliNumerals);
  const units = useSettings((state) => state.units);
  const setUnits = useSettings((state) => state.setUnits);
  const reduceMotion = useSettings((state) => state.reduceMotion);
  const setReduceMotion = useSettings((state) => state.setReduceMotion);
  const performanceMode = useSettings((state) => state.performanceMode);
  const setPerformanceMode = useSettings((state) => state.setPerformanceMode);
  const haptics = useSettings((state) => state.haptics);
  const setHaptics = useSettings((state) => state.setHaptics);
  const notifications = useSettings((state) => state.notifications);
  const setNotificationRules = useSettings((state) => state.setNotificationRules);
  const widgets = useSettings((state) => state.widgets);
  const resetWidgets = useSettings((state) => state.resetWidgets);
  const resetSettings = useSettings((state) => state.resetSettings);
  const clearRecents = useLocations((state) => state.clearRecents);
  const clearAllPlaces = useLocations((state) => state.clearAll);
  const setCustomizeOpen = useUI((state) => state.setCustomizeOpen);
  const setInstallOpen = useUI((state) => state.setInstallOpen);

  const queryClient = useQueryClient();
  const vibrate = useHaptics();
  const hydrated = useHydrated();
  const reduceSystem = useReducedMotion();
  const reduce = reduceSystem || reduceMotion;

  const [activeSection, setActiveSection] = useState<string>("appearance");
  const [permission, setPermission] = useState<PermissionState>(null);
  const [installed, setInstalled] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const visibleWidgets = widgets.filter((widget) => widget.visible).length;
  const permissionLabel =
    permission === "granted"
      ? t("permissionGranted")
      : permission === "denied"
        ? t("permissionDenied")
        : permission === "unsupported"
          ? t("notificationsUnsupported")
          : t("permissionDefault");
  const permissionTone =
    permission === "granted"
      ? "aurora"
      : permission === "denied" || permission === "unsupported"
        ? "danger"
        : "neutral";

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4_200);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const syncPermission = () => setPermission(notificationPermission());
    syncPermission();
    document.addEventListener("visibilitychange", syncPermission);
    window.addEventListener("focus", syncPermission);
    return () => {
      document.removeEventListener("visibilitychange", syncPermission);
      window.removeEventListener("focus", syncPermission);
    };
  }, []);

  useEffect(() => {
    if (permission && permission !== "granted" && notifications.enabled) {
      setNotificationRules({ enabled: false });
    }
  }, [permission, notifications.enabled, setNotificationRules]);

  useEffect(() => {
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
  }, []);

  useEffect(() => {
    const sections = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    if (!sections.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const jumpTo = (id: string) => {
    vibrate(5);
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setActiveSection(id);
  };

  const enableNotifications = async () => {
    vibrate(6);
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      setNotificationRules({ enabled: true });
      notify(t("permissionGranted"));
      return;
    }
    if (result === "denied") {
      notify(t("testDenied"));
      return;
    }
    if (result === "unsupported") notify(t("notificationsUnsupported"));
  };

  const toggleNotifications = (next: boolean) => {
    if (!next) {
      setNotificationRules({ enabled: false });
      return;
    }
    if (permission === "granted") {
      setNotificationRules({ enabled: true });
      return;
    }
    void enableNotifications();
  };

  const sendTestNotification = async () => {
    vibrate(6);
    let current = permission;
    if (current !== "granted") {
      current = await requestNotificationPermission();
      setPermission(current);
    }
    if (current !== "granted") {
      notify(
        current === "unsupported" ? t("notificationsUnsupported") : t("testDenied"),
      );
      return;
    }
    setNotificationRules({ enabled: true });
    const sent = await sendNotification(t("appName"), {
      body: t("settingsTestBody"),
      tag: "meracast-test",
    });
    notify(sent ? t("testSent") : t("testDenied"));
  };

  const clearCache = async () => {
    vibrate(6);
    setClearing(true);
    try {
      queryClient.clear();
      window.localStorage.removeItem(STORAGE_KEYS.queryCache);
      window.localStorage.removeItem(STORAGE_KEYS.notificationLog);
      clearRecents();
      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(
          keys.filter((key) => key.startsWith("meracast")).map((key) => window.caches.delete(key)),
        );
      }
      notify(t("clearedCache"));
    } finally {
      setClearing(false);
    }
  };

  const resetEverything = () => {
    vibrate([12, 40, 12]);
    resetSettings();
    clearAllPlaces();
    queryClient.clear();
    window.localStorage.removeItem(STORAGE_KEYS.queryCache);
    window.localStorage.removeItem(STORAGE_KEYS.notificationLog);
    window.localStorage.removeItem(STORAGE_KEYS.installDismissed);
    setResetOpen(false);
    notify(t("resetDone"));
  };

  const appearanceLabel =
    mode === "light" ? t("themeLight") : mode === "dark" ? t("themeDark") : t("themeSystem");
  const languageLabel = language === "en" ? t("english") : t("bangla");
  const temperatureLabel = units.temperature === "c" ? t("celsius") : t("fahrenheit");
  const timeLabel = units.time === "12h" ? t("twelveHour") : t("twentyFourHour");

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="settings-hero-title"
        className="relative overflow-hidden rounded-3xl border border-line/15 bg-surface/80 shadow-glass"
      >
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-center lg:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone="aurora">
                <Settings2 className="h-3 w-3" />
                {t("settingsTitle")}
              </Badge>
              <span className="text-xs font-medium text-faint">{t("settingsSubtitle")}</span>
            </div>
            <h1
              id="settings-hero-title"
              className="mt-4 max-w-2xl font-heading text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.02em] text-ink"
            >
              {t("settingsHeroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              {t("settingsHeroBody")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <HeroChip icon={Palette} label={appearanceLabel} />
              <HeroChip icon={Languages} label={languageLabel} />
              <HeroChip icon={Thermometer} label={temperatureLabel} />
              <HeroChip icon={Clock3} label={timeLabel} />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-line/15 bg-surface-quiet p-4 sm:p-5">
            <div className="relative flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-faint">
                <Sparkles className="h-3.5 w-3.5 text-aurora" />
                {t("settingsSnapshot")}
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line/15 bg-surface-quiet">
                <Logo size="sm" showWordmark={false} animated={false} />
              </span>
            </div>
            <dl className="relative mt-4 space-y-2.5">
              <SnapshotRow icon={Sun} label={t("theme")} value={appearanceLabel} />
              <SnapshotRow icon={Languages} label={t("language")} value={languageLabel} />
              <SnapshotRow icon={Wind} label={t("units")} value={`${temperatureLabel} · ${timeLabel}`} />
              <SnapshotRow
                icon={Bell}
                label={t("notificationsTitle")}
                value={
                  notifications.enabled && permission === "granted"
                    ? t("on")
                    : t("off")
                }
              />
            </dl>
            <p className="relative mt-4 border-t border-line/10 pt-3 text-xs font-medium text-faint">
              {t("settingsSavedNote")}
            </p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <nav
          aria-label={t("settingsSectionNav")}
          className="no-print sticky top-24 hidden lg:block"
        >
          <div className="glass rounded-2xl p-2">
            <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.18em] text-faint">
              {t("settingsSectionNav")}
            </p>
            <div className="space-y-0.5">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => jumpTo(section.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "pressable relative flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[12px] font-semibold transition-colors",
                      active ? "text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="settings-nav-active"
                        className="absolute inset-0 rounded-xl border border-aurora/20 bg-aurora/[0.08]"
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                      />
                    ) : null}
                    <Icon
                      className={cn(
                        "relative h-4 w-4 shrink-0",
                        active ? "text-aurora" : "text-faint",
                      )}
                    />
                    <span className="relative truncate">{t(section.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="min-w-0 space-y-5">
          <SettingsSection
            id="appearance"
            icon={Palette}
            title={t("appearance")}
            description={t("appearanceDesc")}
          >
            <div
              role="radiogroup"
              aria-label={t("theme")}
              className="grid gap-2.5 sm:grid-cols-3"
              onKeyDown={(event) => {
                const index = THEMES.findIndex((theme) => theme.value === mode);
                if (index < 0) return;
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const direction = event.key === "ArrowRight" ? 1 : -1;
                const next = THEMES[(index + direction + THEMES.length) % THEMES.length];
                if (next) setMode(next.value);
              }}
            >
              {THEMES.map((theme) => {
                const Icon = theme.icon;
                const active = theme.value === mode;
                return (
                  <motion.button
                    key={theme.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    onClick={() => {
                      vibrate(6);
                      setMode(theme.value);
                    }}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border p-2 text-left transition-colors",
                      active
                        ? "border-aurora/45 bg-aurora/[0.06] shadow-[inset_0_0_0_1px_rgb(var(--c-aurora)/0.12)]"
                        : "border-line/10 bg-surface-quiet hover:border-line/25 hover:bg-surface-lift",
                    )}
                  >
                    <span className="relative block h-[5.2rem] overflow-hidden rounded-xl border border-white/10">
                      <span className={cn("absolute inset-0", theme.preview)} aria-hidden="true" />
                      <span
                        className={cn(
                          "absolute left-3 top-3 h-2 w-12 rounded-full",
                          theme.line,
                        )}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "absolute left-3 top-7 h-1.5 w-8 rounded-full",
                          theme.line,
                          "opacity-70",
                        )}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "absolute bottom-3 left-3 right-3 h-9 rounded-lg border border-white/10",
                          theme.surface,
                        )}
                        aria-hidden="true"
                      >
                        <span className="absolute left-2 top-2 h-1.5 w-7 rounded-full bg-aurora/80" />
                        <span className="absolute left-2 top-5 h-1.5 w-12 rounded-full bg-current opacity-25" />
                      </span>
                      <span
                        className="absolute right-2.5 top-2.5 h-6 w-6 rounded-full border border-white/20 bg-black/20 backdrop-blur-sm"
                        aria-hidden="true"
                      >
                        <Icon className="m-1 h-4 w-4 text-white/80" />
                      </span>
                    </span>
                    <span className="relative mt-2.5 flex items-center gap-1.5 px-1 pb-0.5">
                      <span className={cn("text-xs font-bold", active ? "text-ink" : "text-muted")}>
                        {t(theme.labelKey)}
                      </span>
                      {active ? (
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-aurora text-[#04171b]"
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </motion.span>
                      ) : null}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="my-5 divider" />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{t("language")}</p>
                <p className="mt-0.5 text-xs text-muted">{t("settingsLanguageDesc")}</p>
              </div>
              <Segmented
                ariaLabel={t("language")}
                value={language}
                onChange={(value) => setLanguage(value)}
                options={[
                  { value: "en", label: t("english") },
                  { value: "bn", label: t("bangla") },
                ]}
                className="w-full sm:w-auto"
                fullWidth
              />
            </div>

            <div className="my-5 divider" />

            <Switch
              checked={bengaliNumerals}
              onChange={setBengaliNumerals}
              label={t("bengaliNumerals")}
              description={t("bengaliNumeralsDesc")}
            />
          </SettingsSection>

          <SettingsSection
            id="units"
            icon={Thermometer}
            title={t("units")}
            description={t("unitsDesc")}
          >
            <div className="divide-y divide-line/10">
              <UnitRow
                label={t("temperature")}
                value={units.temperature}
                options={TEMPERATURE_OPTIONS}
                onChange={(value) => setUnits({ temperature: value })}
              />
              <UnitRow
                label={t("wind")}
                value={units.wind}
                options={WIND_OPTIONS}
                onChange={(value) => setUnits({ wind: value })}
              />
              <UnitRow
                label={t("precipitation")}
                value={units.precipitation}
                options={PRECIP_OPTIONS}
                onChange={(value) => setUnits({ precipitation: value })}
              />
              <UnitRow
                label={t("pressure")}
                value={units.pressure}
                options={PRESSURE_OPTIONS}
                onChange={(value) => setUnits({ pressure: value })}
              />
              <UnitRow
                label={t("timeFormat")}
                value={units.time}
                options={TIME_OPTIONS}
                onChange={(value) => setUnits({ time: value })}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            id="motion"
            icon={Gauge}
            title={t("motionAndPerformance")}
            description={t("motionDesc")}
          >
            <div className="divide-y divide-line/10">
              <div className="pb-4">
                <Switch
                  checked={reduceMotion}
                  onChange={setReduceMotion}
                  label={t("reduceMotion")}
                  description={t("reduceMotionDesc")}
                />
              </div>
              <div className="py-4">
                <Switch
                  checked={performanceMode}
                  onChange={setPerformanceMode}
                  label={t("performanceMode")}
                  description={t("performanceModeDesc")}
                />
              </div>
              <div className="pt-4">
                <Switch
                  checked={haptics}
                  onChange={setHaptics}
                  label={t("haptics")}
                  description={t("hapticsDesc")}
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="notifications"
            icon={BellRing}
            title={t("notificationsTitle")}
            description={t("notificationsDesc")}
            action={
              permission === "granted" ? null : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void enableNotifications()}
                  disabled={permission === "unsupported"}
                >
                  <Bell className="h-3.5 w-3.5" />
                  {t("enableNotifications")}
                </Button>
              )
            }
          >
            <div className="rounded-2xl border border-line/10 bg-surface-quiet p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                      permission === "granted"
                        ? "border-aurora/25 bg-aurora/10 text-aurora"
                        : permission === "denied" || permission === "unsupported"
                          ? "border-danger/25 bg-danger/10 text-danger"
                          : "border-line/10 bg-surface-quiet text-muted",
                    )}
                  >
                    <BellRing className="h-[1.125rem] w-[1.125rem]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{t("notificationPermission")}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge tone={permissionTone}>{permissionLabel}</Badge>
                      {hydrated && permission === "default" ? (
                        <span className="text-xs text-faint">
                          {t("settingsNotificationHint")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {permission === "granted" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void sendTestNotification()}
                  >
                    <BellRing className="h-3.5 w-3.5" />
                    {t("testNotification")}
                  </Button>
                ) : null}
              </div>
              {permission === "denied" || permission === "unsupported" ? (
                <p className="mt-3 border-t border-line/10 pt-3 text-xs leading-relaxed text-danger/90">
                  {permission === "unsupported"
                    ? t("notificationsUnsupported")
                    : t("settingsNotificationBlockedHint")}
                </p>
              ) : null}
            </div>

            <div className="my-4 divider" />

            <Switch
              checked={notifications.enabled}
              onChange={toggleNotifications}
              label={t("notificationsTitle")}
              description={t("settingsNotificationHint")}
            />

            <div
              className={cn(
                "mt-3 divide-y divide-line/10 rounded-2xl border border-line/10 bg-surface-quiet px-3.5 transition-opacity",
                !notifications.enabled && "opacity-55",
              )}
            >
              <div className="py-3.5">
                <Switch
                  checked={notifications.rainSoon}
                  onChange={(value) => setNotificationRules({ rainSoon: value })}
                  label={t("rainAlerts")}
                  description={t("rainAlertsDesc")}
                  disabled={!notifications.enabled}
                />
              </div>
              <div className="py-3.5">
                <Switch
                  checked={notifications.severe}
                  onChange={(value) => setNotificationRules({ severe: value })}
                  label={t("severeAlerts")}
                  description={t("severeAlertsDesc")}
                  disabled={!notifications.enabled}
                />
              </div>
              <div className="py-3.5">
                <Switch
                  checked={notifications.morningSummary}
                  onChange={(value) => setNotificationRules({ morningSummary: value })}
                  label={t("morningSummary")}
                  description={t("morningSummaryDesc")}
                  disabled={!notifications.enabled}
                />
              </div>
              <div className="py-3.5">
                <Switch
                  checked={notifications.quietHours}
                  onChange={(value) => setNotificationRules({ quietHours: value })}
                  label={t("quietHours")}
                  description={t("quietHoursDesc")}
                  disabled={!notifications.enabled}
                />
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <label className="block min-w-0">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-faint">
                      {t("quietFrom")}
                    </span>
                    <input
                      type="time"
                      value={notifications.quietStart}
                      onChange={(event) =>
                        setNotificationRules({ quietStart: event.target.value })
                      }
                      disabled={!notifications.enabled || !notifications.quietHours}
                      className="h-10 w-full min-w-0 rounded-xl border border-line/15 bg-surface-quiet px-2.5 text-sm font-semibold tabular text-ink outline-none transition-colors focus:border-aurora/45 focus:bg-surface-lift disabled:opacity-50 sm:px-3"
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-faint">
                      {t("quietTo")}
                    </span>
                    <input
                      type="time"
                      value={notifications.quietEnd}
                      onChange={(event) =>
                        setNotificationRules({ quietEnd: event.target.value })
                      }
                      disabled={!notifications.enabled || !notifications.quietHours}
                      className="h-10 w-full min-w-0 rounded-xl border border-line/15 bg-surface-quiet px-2.5 text-sm font-semibold tabular text-ink outline-none transition-colors focus:border-aurora/45 focus:bg-surface-lift disabled:opacity-50 sm:px-3"
                    />
                  </label>
                </div>
              </div>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-faint">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("settingsNotificationScheduleNote")}
            </p>
          </SettingsSection>

          <SettingsSection
            id="widgets"
            icon={LayoutGrid}
            title={t("widgetsTitle")}
            description={t("widgetsDesc")}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  vibrate(6);
                  setCustomizeOpen(true);
                }}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {t("settingsManageWidgets")}
              </Button>
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">
                {t("settingsWidgetCount", { visible: visibleWidgets, total: widgets.length })}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  vibrate(6);
                  resetWidgets();
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("resetLayout")}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {widgets.map((widget) => (
                <span
                  key={widget.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                    widget.visible
                      ? "border-aurora/20 bg-aurora/[0.07] text-ink"
                      : "border-line/10 bg-surface-quiet text-faint line-through decoration-faint/40",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      widget.visible ? "bg-aurora" : "bg-faint/40",
                    )}
                  />
                  {t(WIDGET_LABELS[widget.id])}
                </span>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection
            id="install"
            icon={Download}
            title={t("install")}
            description={t("settingsInstallDesc")}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Logo size="lg" showWordmark={false} />
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-ink">
                    {installed ? t("installed") : t("installTitle")}
                  </p>
                  <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">
                    {installed ? t("offlineBody") : t("installInstructions")}
                  </p>
                </div>
              </div>
              <Button
                variant={installed ? "outline" : "primary"}
                size="sm"
                onClick={() => {
                  vibrate(6);
                  setInstallOpen(true);
                }}
                disabled={installed}
                className="shrink-0"
              >
                <Smartphone className="h-3.5 w-3.5" />
                {installed ? t("installed") : t("install")}
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection
            id="data"
            icon={ShieldCheck}
            title={t("dataAndPrivacy")}
            description={t("dataDesc")}
          >
            <div className="rounded-2xl border border-line/10 bg-surface-quiet px-4 py-3.5 text-xs leading-relaxed text-muted">
              {t("privacyBody")}
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{t("clearCache")}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{t("clearCacheDesc")}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void clearCache()}
                loading={clearing}
                className="shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("clearCache")}
              </Button>
            </div>

            <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-danger/15 bg-danger/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{t("resetAll")}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{t("resetAllDesc")}</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  vibrate(6);
                  setResetOpen(true);
                }}
                className="shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("resetAll")}
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection
            id="about"
            icon={Info}
            title={t("about")}
            description={t("brandStory")}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-lg">
                <Logo size="md" showWordmark showBrand />
                <p className="mt-3 font-heading text-lg font-semibold leading-snug text-ink/85">
                  {t("tagline")}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t("aboutBody")}</p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-1.5 rounded-xl border border-line/10 bg-surface-quiet px-3 py-2.5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-faint">
                  {t("version", { version: APP_VERSION })}
                </span>
                <span className="text-xs font-semibold text-muted">{t("madeWith")}</span>
              </div>
            </div>

            <div className="my-5 divider" />

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-faint">
              {t("dataSources")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{t("dataSourcesDesc")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SourceLink href="https://open-meteo.com" label={t("sourceOpenMeteo")} />
              <SourceLink href="https://www.rainviewer.com" label={t("sourceRainViewer")} />
              <SourceLink href="https://openfreemap.org" label={t("sourceOpenFreeMap")} />
            </div>

            <div className="mt-6 border-t border-line/10 pt-4">
              <Link href="/" className={buttonClasses("secondary", "sm")}>
                <Sparkles className="h-3.5 w-3.5" />
                {t("settingsBackHome")}
              </Link>
            </div>
          </SettingsSection>
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t("resetAll")}
        description={t("resetAllDesc")}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" size="sm" onClick={resetEverything}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t("resetAll")}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/[0.06] px-3.5 py-3 text-xs leading-relaxed text-muted">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          {t("resetConfirm")}
        </div>
      </Modal>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            role="status"
            aria-live="polite"
            className="no-print fixed inset-x-3 bottom-[calc(6.2rem+env(safe-area-inset-bottom,0px))] z-[70] mx-auto flex max-w-sm items-center gap-2.5 rounded-xl border border-aurora/25 bg-[#07131f]/95 px-3.5 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-aurora/15 text-aurora">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1">{toast}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function HeroChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line/15 bg-surface-quiet px-2.5 py-1 text-xs font-medium text-muted">
      <Icon className="h-3 w-3 text-aurora" />
      {label}
    </span>
  );
}

function SnapshotRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line/10 bg-surface-quiet px-3 py-2">
      <dt className="flex items-center gap-2 text-xs font-medium text-faint">
        <Icon className="h-3.5 w-3.5 text-faint" />
        {label}
      </dt>
      <dd className="truncate text-xs font-semibold text-ink">{value}</dd>
    </div>
  );
}

function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <GlassCard padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line/10 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-aurora/15 bg-aurora/[0.06] text-aurora">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2
                id={`${id}-title`}
                className="text-base font-bold tracking-[-0.025em] text-ink"
              >
                {title}
              </h2>
              <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted">{description}</p>
            </div>
          </div>
          {action ? <div className="shrink-0 sm:pl-3">{action}</div> : null}
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </GlassCard>
    </section>
  );
}

function UnitRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <div className="w-full sm:w-[21rem]">
        <Segmented
          ariaLabel={label}
          value={value}
          options={options}
          onChange={onChange}
          size="sm"
          fullWidth
        />
      </div>
    </div>
  );
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="pressable inline-flex items-center gap-1.5 rounded-full border border-line/10 bg-surface-quiet px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-line/25 hover:text-ink"
    >
      {label}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
