"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { reverseGeocodeClient } from "@/lib/api/client";
import {
  GeolocationError,
  getCurrentCoordinates,
  getGeolocationPermission,
  hasSecureGeolocationContext,
  isGeolocationSupported,
} from "@/lib/geolocation";
import type { Place } from "@/types/geo";

export type GeolocationStatus =
  | "idle"
  | "locating"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | "insecure";

function deviceTimezone(fallback: string): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function useGeolocation() {
  const { t } = useI18n();
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const requestRef = useRef(0);
  const reverseAbortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    requestRef.current += 1;
    reverseAbortRef.current?.abort();
    reverseAbortRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(
    () => () => {
      requestRef.current += 1;
      reverseAbortRef.current?.abort();
    },
    [],
  );

  const locate = useCallback(
    async (language: "en" | "bn"): Promise<Place | null> => {
      const requestId = ++requestRef.current;
      setStatus("locating");

      if (!isGeolocationSupported()) {
        console.error("Geolocation unavailable", { code: "unsupported" });
        setStatus("unsupported");
        return null;
      }

      if (!hasSecureGeolocationContext()) {
        console.error("Geolocation unavailable", { code: "insecure" });
        setStatus("insecure");
        return null;
      }

      try {
        const permission = await getGeolocationPermission();
        if (requestId !== requestRef.current) return null;
        if (permission === "denied") {
          console.error("Geolocation failed", { code: "denied", message: "Permission state is denied" });
          setStatus("denied");
          return null;
        }

        const coordinates = await getCurrentCoordinates();
        if (requestId !== requestRef.current) return null;

        const controller = new AbortController();
        reverseAbortRef.current = controller;

        try {
          const place = await reverseGeocodeClient(
            coordinates.latitude,
            coordinates.longitude,
            language,
            controller.signal,
          );
          if (requestId !== requestRef.current) return null;
          reverseAbortRef.current = null;
          setStatus("idle");
          return {
            ...place,
            timezone: deviceTimezone(place.timezone),
          };
        } catch (error) {
          if (requestId !== requestRef.current || controller.signal.aborted) return null;
          console.error("Reverse geocoding failed", {
            code: "reverse-geocode",
            message: error instanceof Error ? error.message : String(error),
          });
          reverseAbortRef.current = null;
          setStatus("idle");
          return {
            id: `here-${coordinates.latitude.toFixed(4)}-${coordinates.longitude.toFixed(4)}`,
            name: t("yourLocation"),
            country: "",
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            timezone: deviceTimezone("auto"),
          };
        }
      } catch (error) {
        if (requestId !== requestRef.current) return null;
        const geolocationError =
          error instanceof GeolocationError
            ? error
            : new GeolocationError(
                "unavailable",
                error instanceof Error ? error.message : String(error),
              );
        console.error("Geolocation failed", {
          code: geolocationError.code,
          nativeCode: geolocationError.nativeCode,
          message: geolocationError.message,
        });
        setStatus(geolocationError.code);
        return null;
      }
    },
    [t],
  );

  return { locate, status, reset };
}
