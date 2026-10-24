import type { Coordinates } from "@/types/geo";

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 300_000,
};

export type GeolocationFailureCode =
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | "insecure";

export class GeolocationError extends Error {
  readonly code: GeolocationFailureCode;
  readonly nativeCode?: number;

  constructor(code: GeolocationFailureCode, message: string, nativeCode?: number) {
    super(message);
    this.name = "GeolocationError";
    this.code = code;
    this.nativeCode = nativeCode;
  }
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

export function hasSecureGeolocationContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext !== false;
}

/**
 * Converts the browser's numeric PositionError into an app-level error with a
 * stable code. Browsers don't always expose the PERMISSION_DENIED constants on
 * mocked/test error objects, so the numeric code is the source of truth.
 */
export function geolocationErrorFrom(error: GeolocationPositionError): GeolocationError {
  const code = Number(error.code);
  if (code === 1) {
    return new GeolocationError("denied", error.message || "Location permission was denied", code);
  }
  if (code === 2) {
    return new GeolocationError("unavailable", error.message || "Location is unavailable", code);
  }
  if (code === 3) {
    return new GeolocationError("timeout", error.message || "Location request timed out", code);
  }
  return new GeolocationError("unavailable", error.message || "Location is unavailable", code);
}

export async function getGeolocationPermission(): Promise<PermissionState | "unknown"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
  try {
    const permission = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return permission.state;
  } catch {
    return "unknown";
  }
}

/**
 * Starts a one-shot location request. Call this from the user gesture path —
 * never from an effect — so installed PWAs receive the permission prompt at a
 * predictable moment.
 */
export function getCurrentCoordinates(
  options: PositionOptions = GEOLOCATION_OPTIONS,
): Promise<Coordinates> {
  if (!isGeolocationSupported()) {
    return Promise.reject(new GeolocationError("unsupported", "Geolocation is not supported"));
  }

  if (!hasSecureGeolocationContext()) {
    return Promise.reject(
      new GeolocationError("insecure", "Geolocation requires a secure HTTPS context"),
    );
  }

  return new Promise<Coordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => reject(geolocationErrorFrom(error)),
      options,
    );
  });
}
