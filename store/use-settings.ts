"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_UNITS, DEFAULT_WIDGETS, STORAGE_KEYS } from "@/lib/constants";
import type {
  Language,
  NotificationRules,
  SettingsState,
  ThemeMode,
  UnitPreferences,
  WidgetId,
  WidgetLayoutItem,
} from "@/types/settings";

const DEFAULT_SETTINGS: SettingsState = {
  theme: "system",
  language: "en",
  bengaliNumerals: false,
  units: DEFAULT_UNITS,
  reduceMotion: false,
  performanceMode: false,
  haptics: true,
  notifications: {
    enabled: false,
    rainSoon: true,
    severe: true,
    morningSummary: true,
    quietHours: true,
    quietStart: "23:00",
    quietEnd: "06:30",
  },
  widgets: DEFAULT_WIDGETS,
  onboarded: false,
};

interface SettingsActions {
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  setBengaliNumerals: (enabled: boolean) => void;
  setUnits: (units: Partial<UnitPreferences>) => void;
  setReduceMotion: (enabled: boolean) => void;
  setPerformanceMode: (enabled: boolean) => void;
  setHaptics: (enabled: boolean) => void;
  setNotificationRules: (rules: Partial<NotificationRules>) => void;
  toggleWidget: (id: WidgetId) => void;
  setWidgets: (widgets: WidgetLayoutItem[]) => void;
  resetWidgets: () => void;
  resetSettings: () => void;
  markOnboarded: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleLanguage: () => set({ language: get().language === "en" ? "bn" : "en" }),
      setBengaliNumerals: (bengaliNumerals) => set({ bengaliNumerals }),
      setUnits: (units) => set({ units: { ...get().units, ...units } }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setPerformanceMode: (performanceMode) => set({ performanceMode }),
      setHaptics: (haptics) => set({ haptics }),
      setNotificationRules: (rules) =>
        set({ notifications: { ...get().notifications, ...rules } }),
      toggleWidget: (id) =>
        set({
          widgets: get().widgets.map((widget) =>
            widget.id === id ? { ...widget, visible: !widget.visible } : widget,
          ),
        }),
      setWidgets: (widgets) => set({ widgets }),
      resetWidgets: () => set({ widgets: DEFAULT_WIDGETS }),
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
      markOnboarded: () => set({ onboarded: true }),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: 1,
      skipHydration: true,
      partialize: (state): SettingsState => ({
        theme: state.theme,
        language: state.language,
        bengaliNumerals: state.bengaliNumerals,
        units: state.units,
        reduceMotion: state.reduceMotion,
        performanceMode: state.performanceMode,
        haptics: state.haptics,
        notifications: state.notifications,
        widgets: state.widgets,
        onboarded: state.onboarded,
      }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<SettingsState>;
        return {
          ...current,
          ...stored,
          units: { ...DEFAULT_UNITS, ...stored.units },
          notifications: { ...current.notifications, ...stored.notifications },
          widgets: Array.isArray(stored.widgets) && stored.widgets.length ? stored.widgets : DEFAULT_WIDGETS,
        };
      },
    },
  ),
);
