"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay = 250,
): (...args: Args) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return useCallback(
    (...args: Args) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}

export function useIntersection<T extends Element>(
  onEnter: () => void,
  options: IntersectionObserverInit = { threshold: 0.2 },
): (node: T | null) => void {
  const callback = useRef(onEnter);
  callback.current = onEnter;

  return useCallback(
    (node: T | null) => {
      if (!node || typeof IntersectionObserver === "undefined") return;
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          callback.current();
          observer.disconnect();
        }
      }, options);
      observer.observe(node);
    },
    [options],
  );
}
