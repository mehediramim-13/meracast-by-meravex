import type { Metadata } from "next";
import { RainPlanner } from "@/components/planner/rain-planner";
import { DEFAULT_PLACE, SITE } from "@/lib/constants";
import { weatherProvider } from "@/lib/api/provider";
import { parsePlannerUrlState } from "@/lib/rain-planner";
import { placeFromSearchParams } from "@/lib/place";
import type { WeatherData } from "@/types/weather";

export const revalidate = 600;

interface PlannerPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export function generateMetadata({ searchParams }: PlannerPageProps): Metadata {
  const place = placeFromSearchParams(searchParams) ?? DEFAULT_PLACE;
  const title = `${place.name} Rain Planner`;
  const description = `Plan around the rain in ${place.name}${place.country ? `, ${place.country}` : ""}. Pick a moment and an activity for a plain-language reading, the best nearby dry windows and a shareable plan from MeraCast.`;
  const params = new URLSearchParams();
  params.set("lat", place.latitude.toFixed(4));
  params.set("lon", place.longitude.toFixed(4));
  params.set("name", place.name);
  if (place.country) params.set("country", place.country);
  if (place.countryCode) params.set("countryCode", place.countryCode);
  if (place.admin1) params.set("admin1", place.admin1);
  return {
    title,
    description,
    alternates: { canonical: `/rain-planner?${params.toString()}` },
    openGraph: {
      title: `${title} · ${SITE.name}`,
      description,
      url: `/rain-planner?${params.toString()}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE.name}`,
      description,
    },
  };
}

export default async function RainPlannerPage({ searchParams }: PlannerPageProps) {
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

  return (
    <RainPlanner
      initialPlace={place}
      initialWeather={initialWeather}
      initial={parsePlannerUrlState(searchParams)}
    />
  );
}
