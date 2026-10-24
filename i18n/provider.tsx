"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { en, type TranslationKey } from "./en";
import { bn } from "./bn";
import { useSettings } from "@/store/use-settings";
import type { Language } from "@/types/settings";

type Vars = Record<string, string | number>;
type Translate = (key: TranslationKey, vars?: Vars) => string;
type TranslateDynamic = (key: string, fallback?: string, vars?: Vars) => string;

interface I18nContextValue {
  language: Language;
  locale: string;
  t: Translate;
  td: TranslateDynamic;
  dir: "ltr";
}

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, bn };

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = vars[token];
    return value === undefined ? match : String(value);
  });
}

export function createTranslator(language: Language): { t: Translate; td: TranslateDynamic } {
  const dictionary = dictionaries[language];
  const fallbackDictionary = dictionaries.en;
  const t: Translate = (key, vars) => interpolate(dictionary[key] ?? fallbackDictionary[key], vars);
  const td: TranslateDynamic = (key, fallback, vars) => {
    const value =
      (dictionary as Record<string, string>)[key] ??
      (fallbackDictionary as Record<string, string>)[key] ??
      fallback ??
      key;
    return interpolate(value, vars);
  };
  return { t, td };
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const language = useSettings((state) => state.language);
  const value = useMemo<I18nContextValue>(() => {
    const { t, td } = createTranslator(language);
    return {
      language,
      locale: language === "bn" ? "bn-BD" : "en-US",
      t,
      td,
      dir: "ltr",
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}

export function useTranslation() {
  const { t, td, language, locale } = useI18n();
  return { t, td, language, locale };
}

export function useConditionTranslator() {
  const { td } = useI18n();
  return useCallback((labelKey: string) => td(labelKey), [td]);
}

export type { TranslationKey };
