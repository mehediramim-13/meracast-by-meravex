import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

const ROUTES = [
  { path: "", priority: 1, changeFrequency: "hourly" as const },
  { path: "/rain-planner", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/radar", priority: 0.8, changeFrequency: "hourly" as const },
  { path: "/settings", priority: 0.4, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url.replace(/\/$/, "");
  const lastModified = new Date();

  return ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
