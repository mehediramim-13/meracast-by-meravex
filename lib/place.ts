import type { Place } from "@/types/geo";

export function samePlace(
  a: Pick<Place, "latitude" | "longitude">,
  b: Pick<Place, "latitude" | "longitude">,
  tolerance = 0.02,
): boolean {
  return (
    Math.abs(a.latitude - b.latitude) <= tolerance &&
    Math.abs(a.longitude - b.longitude) <= tolerance
  );
}

export function placeSlug(place: Pick<Place, "name" | "countryCode" | "latitude" | "longitude">): string {
  const name = place.name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const country = (place.countryCode ?? "xx").toLowerCase();
  return `${name || "place"}-${country}-${place.latitude.toFixed(2)}-${place.longitude.toFixed(2)}`.replace(
    /\./g,
    "p",
  );
}

export function placeToSearchParams(place: Place): URLSearchParams {
  const params = new URLSearchParams();
  params.set("lat", place.latitude.toFixed(4));
  params.set("lon", place.longitude.toFixed(4));
  params.set("name", place.name);
  if (place.country) params.set("country", place.country);
  if (place.countryCode) params.set("countryCode", place.countryCode);
  if (place.admin1) params.set("admin1", place.admin1);
  if (place.timezone) params.set("tz", place.timezone);
  return params;
}

export function placeFromSearchParams(params: URLSearchParams | Record<string, string | string[] | undefined>): Place | null {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const lat = Number(get("lat"));
  const lon = Number(get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const name = get("name")?.trim() || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  return {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${lat.toFixed(3)}-${lon.toFixed(3)}`,
    name,
    country: get("country") ?? "",
    countryCode: get("countryCode") ?? get("cc"),
    admin1: get("admin1"),
    latitude: lat,
    longitude: lon,
    timezone: get("tz") ?? "auto",
  };
}

export function placeLabel(place: Place): string {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}
