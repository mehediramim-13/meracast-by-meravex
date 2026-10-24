"use client";

import { useEffect, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { WeatherScene } from "@/components/effects/weather-scene";
import { SearchDialog } from "@/components/search/search-dialog";
import { CommandPalette } from "@/components/command/command-palette";
import { CustomizeWidgets } from "@/components/settings/customize-widgets";
import { ShareModal } from "@/components/share/share-modal";
import { LocationPickerModal } from "@/components/maps/location-picker-modal";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Toaster } from "@/components/ui/toaster";
import { useNotificationScheduler } from "@/hooks/use-notification-scheduler";
import { useScene } from "@/store/use-scene";
import { useUI } from "@/store/use-ui";

function Notifications() {
  useNotificationScheduler();
  return null;
}

export function AppChrome({ children }: { children: ReactNode }) {
  const kind = useScene((state) => state.kind);
  const intensity = useScene((state) => state.intensity);
  const setLocationMenuOpen = useUI((state) => state.setLocationMenuOpen);
  const setPaletteOpen = useUI((state) => state.setPaletteOpen);
  const closeAllOverlays = useUI((state) => state.closeAllOverlays);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setLocationMenuOpen(true);
        return;
      }
      if (event.key === "Escape" && !typing) {
        closeAllOverlays();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPaletteOpen, setLocationMenuOpen, closeAllOverlays]);

  return (
    <>
      <WeatherScene kind={kind} intensity={intensity} />
      <OfflineBanner />
      <div className="relative z-10 min-h-svh">
        <Sidebar />
        <div className="lg:pl-[17.5rem]">
          <Header />
          <main
            id="main-content"
            className="mx-auto w-full max-w-[1600px] px-4 pb-nav pt-3 sm:px-6 sm:pt-5 lg:px-8 lg:pb-8 lg:pt-6"
          >
            {children}
            <Footer />
          </main>
        </div>
        <BottomNav />
      </div>
      <SearchDialog />
      <CommandPalette />
      <CustomizeWidgets />
      <ShareModal />
      <LocationPickerModal />
      <InstallPrompt />
      <ServiceWorkerRegister />
      <Toaster />
      <Notifications />
    </>
  );
}
