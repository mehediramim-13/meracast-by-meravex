"use client";

import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { PROVIDER_URLS } from "@/lib/constants";
import type { ResolvedTheme } from "@/types/settings";

interface PickerMapProps {
  latitude: number;
  longitude: number;
  theme: ResolvedTheme;
  language: "en" | "bn";
  onPick: (latitude: number, longitude: number) => void;
}

function styleFor(theme: ResolvedTheme): string {
  return theme === "light" ? PROVIDER_URLS.mapLight : PROVIDER_URLS.mapDark;
}

export default function PickerMap({ latitude, longitude, theme, language, onPick }: PickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const callbackRef = useRef(onPick);
  callbackRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleFor(theme),
      center: [longitude, latitude],
      zoom: 9,
      attributionControl: { compact: true },
      maxZoom: 16,
      minZoom: 2,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (event) => {
      callbackRef.current(event.lngLat.lat, event.lngLat.lng);
    });
    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; theme and position are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(styleFor(theme));
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 9), duration: 900 });
    if (!markerRef.current) {
      const element = document.createElement("div");
      element.className =
        "relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-aurora text-[#06211d]";
      element.innerHTML = '<span class="h-2.5 w-2.5 rounded-full bg-current"></span>';
      markerRef.current = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([longitude, latitude]);
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="application"
      aria-label={
        language === "bn" ? "স্থান বাছার ম্যাপ" : "Location picker map"
      }
    />
  );
}
