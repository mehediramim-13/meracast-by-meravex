import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GEOLOCATION_OPTIONS,
  getCurrentCoordinates,
  geolocationErrorFrom,
} from "@/lib/geolocation";

const originalGeolocation = navigator.geolocation;

function stubGeolocation(
  implementation: (
    success: PositionCallback,
    failure?: PositionErrorCallback,
    options?: PositionOptions,
  ) => void,
) {
  const getCurrentPosition = vi.fn(implementation);
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}

function positionError(code: number, message: string): GeolocationPositionError {
  return { code, message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError;
}

beforeEach(() => {
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
});

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: originalGeolocation,
  });
});

describe("getCurrentCoordinates", () => {
  it("resolves coordinates with the low-accuracy, five-minute options", async () => {
    const getCurrentPosition = stubGeolocation((success) => {
      success({
        coords: { latitude: 23.8103, longitude: 90.4125 },
      } as GeolocationPosition);
    });

    await expect(getCurrentCoordinates()).resolves.toEqual({
      latitude: 23.8103,
      longitude: 90.4125,
    });
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      GEOLOCATION_OPTIONS,
    );
    expect(GEOLOCATION_OPTIONS).toMatchObject({
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 300_000,
    });
  });

  it("maps a denied permission to a typed denied error", async () => {
    stubGeolocation((_success, failure) => {
      failure?.(positionError(1, "User denied Geolocation"));
    });

    await expect(getCurrentCoordinates()).rejects.toMatchObject({
      code: "denied",
      nativeCode: 1,
    });
  });

  it("maps an unavailable position to a typed unavailable error", async () => {
    stubGeolocation((_success, failure) => {
      failure?.(positionError(2, "Location unavailable"));
    });

    await expect(getCurrentCoordinates()).rejects.toMatchObject({
      code: "unavailable",
      nativeCode: 2,
    });
  });

  it("maps a timeout to a typed timeout error", async () => {
    stubGeolocation((_success, failure) => {
      failure?.(positionError(3, "Timeout expired"));
    });

    await expect(getCurrentCoordinates()).rejects.toMatchObject({
      code: "timeout",
      nativeCode: 3,
    });
  });

  it("keeps the original browser message on typed errors", () => {
    const error = geolocationErrorFrom(positionError(3, "Timeout expired"));
    expect(error.message).toBe("Timeout expired");
  });
});
