import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeDashboard } from "@/components/dashboard/home-dashboard";
import { weatherProvider } from "@/lib/api/provider";
import { placeFromSearchParams, placeSlug } from "@/lib/place";
import { SITE } from "@/lib/constants";
import type { WeatherData } from "@/types/weather";

export const revalidate = 600;

interface CityPageProps {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}

export function generateMetadata({ params, searchParams }: CityPageProps): Metadata {
  const place = placeFromSearchParams(searchParams);
  if (!place) {
    return { title: "City forecast" };
  }
  const description = `Live weather, hourly and 16-day forecast for ${place.name}${
    place.country ? `, ${place.country}` : ""
  } — plus air quality, radar and the MeraCast Rain Planner.`;
  return {
    title: `${place.name} weather`,
    description,
    alternates: { canonical: `/city/${params.slug}` },
    openGraph: {
      title: `${place.name} weather · ${SITE.name}`,
      description,
      url: `/city/${params.slug}`,
    },
  };
}

export default async function CityPage({ params, searchParams }: CityPageProps) {
  const place = placeFromSearchParams(searchParams);
  if (!place) notFound();
  if (params.slug !== placeSlug(place)) notFound();

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

  return <HomeDashboard initialPlace={place} initialWeather={initialWeather} fromUrl />;
}
