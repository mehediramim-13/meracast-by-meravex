import type { Metadata } from "next";
import { RadarExperience } from "@/components/radar/radar-experience";
import { DEFAULT_PLACE, SITE } from "@/lib/constants";
import { weatherProvider } from "@/lib/api/provider";
import { placeFromSearchParams } from "@/lib/place";
import type { RadarData } from "@/types/weather";

export const revalidate = 300;

interface RadarPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export function generateMetadata({ searchParams }: RadarPageProps): Metadata {
  const place = placeFromSearchParams(searchParams) ?? DEFAULT_PLACE;
  const title = `${place.name} radar`;
  const description = `Live RainViewer radar for ${place.name}${
    place.country ? `, ${place.country}` : ""
  }. Scrub two hours of rain sweeps, play the loop and sample temperature and wind across the map with MeraCast.`;
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
    alternates: { canonical: `/radar?${params.toString()}` },
    openGraph: {
      title: `${title} · ${SITE.name}`,
      description,
      url: `/radar?${params.toString()}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE.name}`,
      description,
    },
  };
}

export default async function RadarPage({ searchParams }: RadarPageProps) {
  const place = placeFromSearchParams(searchParams) ?? DEFAULT_PLACE;
  const fromUrl = Boolean(searchParams.lat && searchParams.lon);
  let initialRadar: RadarData | undefined;

  try {
    initialRadar = await weatherProvider.radar();
  } catch {
    initialRadar = undefined;
  }

  return (
    <RadarExperience
      initialPlace={place}
      initialRadar={initialRadar}
      fromUrl={fromUrl}
    />
  );
}
