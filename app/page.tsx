import type { Metadata } from "next";
import { HomeDashboard } from "@/components/dashboard/home-dashboard";
import { DEFAULT_PLACE, SITE } from "@/lib/constants";
import { weatherProvider } from "@/lib/api/provider";
import { placeFromSearchParams } from "@/lib/place";
import type { WeatherData } from "@/types/weather";

export const revalidate = 600;

interface HomePageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export function generateMetadata({ searchParams }: HomePageProps): Metadata {
  const place = placeFromSearchParams(searchParams);
  if (!place) {
    return {
      title: `${SITE.name} — ${SITE.tagline}`,
      alternates: { canonical: "/" },
    };
  }
  const title = `${place.name} weather`;
  const description = `Live conditions, a 48-hour outlook and a 16-day forecast for ${place.name}${
    place.country ? `, ${place.country}` : ""
  }. Nowcast, air quality, radar and a Rain Planner from MeraCast.`;
  const query = new URLSearchParams();
  query.set("lat", place.latitude.toFixed(4));
  query.set("lon", place.longitude.toFixed(4));
  query.set("name", place.name);
  if (place.country) query.set("country", place.country);
  if (place.countryCode) query.set("countryCode", place.countryCode);
  if (place.admin1) query.set("admin1", place.admin1);
  return {
    title,
    description,
    alternates: { canonical: `/?${query.toString()}` },
    openGraph: {
      title: `${title} · ${SITE.name}`,
      description,
      url: `/?${query.toString()}`,
    },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const fromUrl = Boolean(searchParams.lat && searchParams.lon);
  const place = placeFromSearchParams(searchParams) ?? DEFAULT_PLACE;
  let initialWeather: WeatherData | undefined;

  try {
    initialWeather = await weatherProvider.forecast({
      latitude: place.latitude,
      longitude: place.longitude,
      place,
    });
  } catch {
    initialWeather = undefined;
  }

  return <HomeDashboard initialPlace={place} initialWeather={initialWeather} fromUrl={fromUrl} />;
}
