"use client";

import dynamic from "next/dynamic";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/provider";
import { reverseGeocodeClient } from "@/lib/api/client";
import { placeToSearchParams } from "@/lib/place";
import { useLocations } from "@/store/use-locations";
import { useUI } from "@/store/use-ui";
import type { Place } from "@/types/geo";

const PickerMap = dynamic(() => import("@/components/maps/picker-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-quiet">
      <Loader2 className="h-5 w-5 animate-spin text-aurora" />
    </div>
  ),
});

export function LocationPickerModal() {
  const open = useUI((state) => state.mapPickerOpen);
  const target = useUI((state) => state.mapPickerTarget);
  const close = useUI((state) => state.closeMapPicker);
  const setResult = useUI((state) => state.setMapPickResult);
  const closeMap = useUI((state) => state.closeMapPicker);
  const activePlace = useLocations((state) => state.activePlace);
  const setActivePlace = useLocations((state) => state.setActivePlace);
  const { t, language } = useI18n();
  const { resolved } = useTheme();
  const { locate, status, reset } = useGeolocation();
  const router = useRouter();
  const [center, setCenter] = useState({ latitude: activePlace.latitude, longitude: activePlace.longitude });
  const [candidate, setCandidate] = useState<Place | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    reset();
    if (open) {
      setCenter({ latitude: activePlace.latitude, longitude: activePlace.longitude });
      setCandidate(null);
    }
  }, [open, activePlace.latitude, activePlace.longitude, reset]);

  const pick = async (latitude: number, longitude: number) => {
    setResolving(true);
    try {
      const place = await reverseGeocodeClient(latitude, longitude, language);
      setCandidate(place);
      setCenter({ latitude, longitude });
    } catch {
      setCandidate({
        id: `pinned-${latitude.toFixed(4)}-${longitude.toFixed(4)}`,
        name: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
        country: "",
        latitude,
        longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "auto",
      });
      setCenter({ latitude, longitude });
    } finally {
      setResolving(false);
    }
  };

  const resolveMyLocation = async () => {
    if (status === "locating") return;
    const place = await locate(language);
    if (!place) return;
    setCandidate(place);
    setCenter({ latitude: place.latitude, longitude: place.longitude });
  };

  const locationError =
    status === "denied"
      ? t("locationDenied")
      : status === "timeout"
        ? t("locationTimeout")
        : status === "unavailable"
          ? t("locationUnavailable")
          : status === "insecure"
            ? t("locationInsecure")
            : status === "unsupported"
              ? t("locationUnsupported")
              : null;

  const confirm = () => {
    if (!candidate) return;
    if (target === "planner") {
      setResult(candidate);
      setCandidate(null);
      closeMap();
      return;
    }
    setActivePlace(candidate);
    const params = placeToSearchParams(candidate).toString();
    setCandidate(null);
    close();
    router.push(`/?${params}`);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("plannerPickMap")}
      description={t("plannerMapHint")}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {locationError ? (
              <p role="status" aria-live="polite" className="text-xs leading-relaxed text-solar">
                {locationError}
              </p>
            ) : resolving ? (
              <p className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("locating")}
              </p>
            ) : candidate ? (
              <p className="flex items-center gap-2 text-xs text-ink">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-aurora" />
                <span className="truncate font-semibold">{candidate.name}</span>
                <span className="hidden truncate text-faint sm:inline">
                  {[candidate.admin1, candidate.country].filter(Boolean).join(", ")}
                </span>
              </p>
            ) : (
              <p className="text-xs text-faint">{t("mapPickMode")}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void resolveMyLocation()}
              disabled={status === "locating"}
            >
              <LocateFixed className="h-3.5 w-3.5" />
              {status === "locating" ? t("locating") : t("plannerNow")}
            </Button>
            <Button variant="primary" size="sm" disabled={!candidate || resolving} onClick={confirm}>
              {t("mapPickConfirm")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="relative h-[54svh] min-h-[20rem] overflow-hidden rounded-2xl border border-line/10">
        {open ? (
          <PickerMap
            latitude={center.latitude}
            longitude={center.longitude}
            theme={resolved}
            language={language}
            onPick={(latitude, longitude) => void pick(latitude, longitude)}
          />
        ) : null}
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-[#06111d]/75 px-2.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md">
          {t("mapPickMode")}
        </div>
      </div>
    </Modal>
  );
}
