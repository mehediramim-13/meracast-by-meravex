import type { Metadata } from "next";
import { OfflineExperience } from "@/components/pwa/offline-experience";

export const metadata: Metadata = {
  title: "Offline",
  description: "MeraCast is offline. Your last saved forecast is still within reach.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflineExperience />;
}
