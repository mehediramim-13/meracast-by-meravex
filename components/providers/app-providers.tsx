"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";
import { I18nProvider } from "@/i18n/provider";
import { STORAGE_KEYS } from "@/lib/constants";
import { getGeolocationPermission } from "@/lib/geolocation";
import { useSettings } from "@/store/use-settings";
import { useLocations } from "@/store/use-locations";
import { useTheme } from "@/hooks/use-theme";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 8,
        gcTime: 1000 * 60 * 60 * 24,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          const status = (error as { status?: number }).status;
          if (status && status >= 400 && status < 500 && status !== 429) return false;
          return failureCount < 3;
        },
        retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 8_000),
        networkMode: "offlineFirst",
      },
    },
  });
}

function StoreHydration() {
  useEffect(() => {
    let cancelled = false;

    const launch = async () => {
      await Promise.all([useSettings.persist.rehydrate(), useLocations.persist.rehydrate()]);
      if (cancelled || window.location.pathname !== "/") return;
      const params = new URLSearchParams(window.location.search);
      if (params.has("lat") || params.has("lon")) return;

      const marker = "meracast:home-launch";
      try {
        if (window.sessionStorage.getItem(marker) === "1") return;
      } catch {
        // sessionStorage can be unavailable; a repeated check is harmless.
      }

      const state = useLocations.getState();
      if (!state.homePlaceId) return;
      const home = state.favorites.find((favorite) => favorite.id === state.homePlaceId);
      if (!home) return;

      const permission = await getGeolocationPermission();
      if (cancelled) return;
      try {
        window.sessionStorage.setItem(marker, "1");
      } catch {
        // Ignore storage failures; launching on home again is not destructive.
      }
      if (permission === "granted") return;
      state.setActivePlace(home);
    };

    void launch();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

function ThemeSync() {
  const { resolved } = useTheme();
  const language = useSettings((state) => state.language);
  const reduceMotion = useSettings((state) => state.reduceMotion);
  const performanceMode = useSettings((state) => state.performanceMode);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dataset.reduceMotion = String(reduceMotion);
    root.dataset.performance = String(performanceMode);
    root.dataset.theme = resolved;
  }, [language, reduceMotion, performanceMode, resolved]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  const reduceMotion = useSettings((state) => state.reduceMotion);
  const [persister] = useState<Persister | null>(() => {
    if (typeof window === "undefined") return null;
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: STORAGE_KEYS.queryCache,
      throttleTime: 1200,
    });
  });

  const content = (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      <I18nProvider>
        <StoreHydration />
        <ThemeSync />
        {children}
      </I18nProvider>
    </MotionConfig>
  );

  if (!persister) {
    return <QueryClientProvider client={client}>{content}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && query.queryKey[0] !== "volatile",
        },
      }}
    >
      {content}
    </PersistQueryClientProvider>
  );
}
