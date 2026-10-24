"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => defaultValue);
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => setNow(new Date());
    const start = () => {
      tick();
      if (timer) clearInterval(timer);
      timer = setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
}

export function useOnScreen<T extends Element>(
  options: IntersectionObserverInit = { rootMargin: "120px" },
): { ref: (element: T | null) => void; isOnScreen: boolean } {
  const [element, setElement] = useState<T | null>(null);
  const [isOnScreen, setIsOnScreen] = useState(false);

  useEffect(() => {
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsOnScreen(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setIsOnScreen(entry.isIntersecting);
    }, options);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, options]);

  return { ref: setElement, isOnScreen };
}

export function useDocumentVisibility(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    document.addEventListener("visibilitychange", callback);
    return () => document.removeEventListener("visibilitychange", callback);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "visible",
    () => true,
  );
}
