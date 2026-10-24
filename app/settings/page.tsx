import type { Metadata } from "next";
import { SettingsExperience } from "@/components/settings/settings-experience";
import { SITE } from "@/lib/constants";

const description =
  "Tune MeraCast to your rhythm: theme, English or Bengali, measurement units, motion and performance, notifications, dashboard widgets, install and privacy.";

export const metadata: Metadata = {
  title: "Settings",
  description,
  alternates: { canonical: "/settings" },
  openGraph: {
    title: `Settings · ${SITE.name}`,
    description,
    url: "/settings",
  },
  twitter: {
    card: "summary",
    title: `Settings · ${SITE.name}`,
    description,
  },
};

export default function SettingsPage() {
  return <SettingsExperience />;
}
