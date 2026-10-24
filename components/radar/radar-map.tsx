"use client";

import {
  LocateFixed,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react";
import maplibregl, {
  type Map as MapLibreMap,
  type MapSourceDataEvent,
  type Marker,
  type RasterTileSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { MAP_ATTRIBUTION, PROVIDER_URLS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Place } from "@/types/geo";
import type { RadarGridPoint, RadarOverlayKind, RadarViewport } from "@/types/radar";
import type { ResolvedTheme } from "@/types/settings";
import type { RadarFrame } from "@/types/weather";

type OverlaySlot = "a" | "b";
type OverlayState = { path: string; kind: RadarOverlayKind };

interface RadarMapProps {
  host: string;
  theme: ResolvedTheme;
  language: "en" | "bn";
  place: Place;
  overlay: RadarOverlayKind;
  frame: RadarFrame | null;
  opacity: number;
  grid: RadarGridPoint[];
  showTemperature: boolean;
  showWind: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onViewChange: (viewport: RadarViewport) => void;
}

function tileUrl(host: string, frame: RadarFrame, kind: RadarOverlayKind): string {
  const suffix =
    kind === "radar"
      ? "/256/{z}/{x}/{y}/2/1_1.png"
      : "/256/{z}/{x}/{y}/0/0_0.png";
  return `${host}${frame.path}${suffix}`;
}

function styleUrl(theme: ResolvedTheme): string {
  return theme === "light" ? PROVIDER_URLS.mapLight : PROVIDER_URLS.mapDark;
}

// A transparent 1×1 PNG keeps the overlay sources valid while RainViewer has no
// frames yet. MapLibre accepts a placeholder URL without tile tokens.
const BLANK_TILE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// Radar sits above land, roads and boundaries but beneath the place labels that
// both OpenFreeMap styles render from vector tiles.
const LABEL_ANCHOR = "place_other";

function createPlaceMarker(place: Place): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "relative flex flex-col items-center";

  const dot = document.createElement("span");
  dot.className =
    "relative h-3 w-3 rounded-full border-2 border-white bg-[#7eb3b8]";

  const label = document.createElement("span");
  label.textContent = place.name;
  label.className =
    "mt-2 max-w-[10rem] truncate rounded-full border border-white/15 bg-[#06111d]/88 px-2 py-0.5 text-xs font-medium text-white";

  element.append(dot, label);
  return element;
}

function createGridMarker(
  point: RadarGridPoint,
  showTemperature: boolean,
  showWind: boolean,
): HTMLDivElement {
  const element = document.createElement("div");
  element.className =
    "pointer-events-none flex items-center gap-1 rounded-md border border-white/15 bg-[#06111d]/78 px-1.5 py-1 text-xs font-medium leading-none text-white";
  element.title = point.title;

  if (showTemperature && point.temperatureLabel) {
    const temperature = document.createElement("span");
    temperature.textContent = point.temperatureLabel;
    temperature.className = "tabular-nums text-white";
    element.append(temperature);
  }

  if (showWind && point.windLabel) {
    if (element.childElementCount > 0) {
      const divider = document.createElement("span");
      divider.className = "h-2.5 w-px bg-white/20";
      element.append(divider);
    }
    if (point.windDirection !== null) {
      const arrow = document.createElement("span");
      arrow.textContent = "↑";
      arrow.className = "inline-block text-xs leading-none text-aurora";
      arrow.style.transform = `rotate(${(point.windDirection + 180) % 360}deg)`;
      element.append(arrow);
    }
    const wind = document.createElement("span");
    wind.textContent = `${point.windLabel} ${point.windUnit}`;
    wind.className = "tabular-nums text-white/90";
    element.append(wind);
  }

  return element;
}

function MapControlButton({
  label,
  onClick,
  children,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center text-white/80 transition-colors hover:bg-white/10 hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-aurora/80",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  );
}

export default function RadarMap({
  host,
  theme,
  language,
  place,
  overlay,
  frame,
  opacity,
  grid,
  showTemperature,
  showWind,
  isFullscreen,
  onToggleFullscreen,
  onViewChange,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const placeMarkerRef = useRef<Marker | null>(null);
  const gridMarkersRef = useRef<Marker[]>([]);
  const previousPlaceRef = useRef(`${place.latitude}:${place.longitude}`);
  const viewCallbackRef = useRef(onViewChange);
  const frameRef = useRef({ frame, overlay });
  const opacityRef = useRef(opacity);
  const slotsRef = useRef<Record<OverlaySlot, OverlayState | null>>({
    a: null,
    b: null,
  });
  const activeSlotRef = useRef<OverlaySlot | null>(null);
  const pendingRef = useRef<{
    slot: OverlaySlot;
    sourceId: string;
  } | null>(null);
  const mapReadyRef = useRef(false);
  const hostRef = useRef(host);
  const styleUrlRef = useRef(styleUrl(theme));
  const [ready, setReady] = useState(false);
  const vibrate = useHaptics();

  viewCallbackRef.current = onViewChange;
  frameRef.current = { frame, overlay };
  opacityRef.current = opacity;
  hostRef.current = host;

  const applyFrameRef = useRef<(nextFrame: RadarFrame | null, kind: RadarOverlayKind) => void>(
    () => undefined,
  );

  const emitView = () => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const bounds = map.getBounds();
    viewCallbackRef.current({
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.getZoom(),
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  };

  const activateSlot = (slot: OverlaySlot) => {
    const map = mapRef.current;
    if (!map) return;
    const other: OverlaySlot = slot === "a" ? "b" : "a";
    try {
      map.setPaintProperty(`overlay-${other}`, "raster-opacity", 0);
      map.setPaintProperty(`overlay-${slot}`, "raster-opacity", opacityRef.current);
    } catch {
      return;
    }
    activeSlotRef.current = slot;
    pendingRef.current = null;
  };

  const applyFrame = (nextFrame: RadarFrame | null, kind: RadarOverlayKind) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    if (!nextFrame) {
      activeSlotRef.current = null;
      pendingRef.current = null;
      try {
        map.setPaintProperty("overlay-a", "raster-opacity", 0);
        map.setPaintProperty("overlay-b", "raster-opacity", 0);
      } catch {
        // The map can be mid-teardown during route changes.
      }
      return;
    }

    const currentSlot = activeSlotRef.current;
    const currentState = currentSlot ? slotsRef.current[currentSlot] : null;
    if (
      currentSlot &&
      currentState &&
      currentState.path === nextFrame.path &&
      currentState.kind === kind
    ) {
      return;
    }

    const slot: OverlaySlot = currentSlot === "a" ? "b" : "a";
    const sourceId = `overlay-${slot}`;
    const source = map.getSource(sourceId) as RasterTileSource | undefined;
    if (!source) return;

    try {
      map.setPaintProperty(sourceId, "raster-opacity", 0);
    } catch {
      return;
    }

    slotsRef.current[slot] = { path: nextFrame.path, kind };
    pendingRef.current = { slot, sourceId };
    source.setTiles([tileUrl(hostRef.current, nextFrame, kind)]);
  };

  applyFrameRef.current = applyFrame;

  const ensureOverlays = (map: MapLibreMap) => {
    const current = frameRef.current;
    const initialTile = current.frame
      ? tileUrl(hostRef.current, current.frame, current.overlay)
      : BLANK_TILE;

    if (!map.getSource("overlay-a")) {
      map.addSource("overlay-a", {
        type: "raster",
        tiles: [initialTile],
        tileSize: 256,
        // RainViewer serves radar tiles through zoom 7 and expects MapLibre to
        // overzoom the last available level beyond that.
        maxzoom: 7,
        attribution: MAP_ATTRIBUTION,
      });
    }
    if (!map.getSource("overlay-b")) {
      map.addSource("overlay-b", {
        type: "raster",
        tiles: [BLANK_TILE],
        tileSize: 256,
        maxzoom: 7,
      });
    }

    const before = map.getLayer(LABEL_ANCHOR) ? LABEL_ANCHOR : undefined;
    (["a", "b"] as OverlaySlot[]).forEach((slot) => {
      const layerId = `overlay-${slot}`;
      if (map.getLayer(layerId)) return;
      map.addLayer(
        {
          id: layerId,
          type: "raster",
          source: layerId,
          minzoom: 0,
          maxzoom: 20,
          paint: {
            "raster-opacity": 0,
            "raster-fade-duration": 90,
            "raster-resampling": "linear",
          },
        },
        before,
      );
    });

    slotsRef.current = { a: null, b: null };
    activeSlotRef.current = null;
    pendingRef.current = null;

    if (current.frame) {
      slotsRef.current.a = {
        path: current.frame.path,
        kind: current.overlay,
      };
      activeSlotRef.current = "a";
      try {
        map.setPaintProperty("overlay-a", "raster-opacity", opacityRef.current);
      } catch {
        // Safe to ignore if the style was replaced.
      }
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl(theme),
      center: [place.longitude, place.latitude],
      zoom: 7,
      minZoom: 2,
      maxZoom: 16,
      fadeDuration: 0,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
    });
    mapRef.current = map;
    styleUrlRef.current = styleUrl(theme);

    const handleSourceData = (event: MapSourceDataEvent) => {
      const sourceId = event.sourceId;
      if (!sourceId || !sourceId.startsWith("overlay-")) return;
      if (!map.isSourceLoaded(sourceId)) return;
      const pending = pendingRef.current;
      if (!pending || pending.sourceId !== sourceId) return;
      activateSlot(pending.slot);
    };

    const handleStyleReady = () => {
      ensureOverlays(map);
      mapReadyRef.current = true;
      setReady(true);

      if (containerRef.current && !placeMarkerRef.current) {
        placeMarkerRef.current = new maplibregl.Marker({
          element: createPlaceMarker(place),
          anchor: "center",
        })
          .setLngLat([place.longitude, place.latitude])
          .addTo(map);
      }

      emitView();
      applyFrameRef.current(frameRef.current.frame, frameRef.current.overlay);
    };

    map.on("load", handleStyleReady);
    map.on("style.load", handleStyleReady);
    map.on("sourcedata", handleSourceData);
    map.on("moveend", emitView);

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      gridMarkersRef.current.forEach((marker) => marker.remove());
      gridMarkersRef.current = [];
      placeMarkerRef.current?.remove();
      placeMarkerRef.current = null;
      activeSlotRef.current = null;
      pendingRef.current = null;
      slotsRef.current = { a: null, b: null };
      mapReadyRef.current = false;
      setReady(false);
      map.remove();
      mapRef.current = null;
    };
    // The map is created once. Theme, frame, opacity and place changes are
    // applied by the effects below without rebuilding the GL context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    frameRef.current = { frame, overlay };
    applyFrameRef.current(frame, overlay);
  }, [frame, overlay]);

  useEffect(() => {
    opacityRef.current = opacity;
    const map = mapRef.current;
    const slot = activeSlotRef.current;
    if (!map || !slot) return;
    try {
      map.setPaintProperty(`overlay-${slot}`, "raster-opacity", opacity);
    } catch {
      // Ignore paint updates during teardown.
    }
  }, [opacity]);

  useEffect(() => {
    const map = mapRef.current;
    const nextStyle = styleUrl(theme);
    if (!map || nextStyle === styleUrlRef.current) return;
    styleUrlRef.current = nextStyle;
    mapReadyRef.current = false;
    map.setStyle(nextStyle, { diff: false });
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!placeMarkerRef.current) {
      placeMarkerRef.current = new maplibregl.Marker({
        element: createPlaceMarker(place),
        anchor: "center",
      })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);
    } else {
      placeMarkerRef.current.setLngLat([place.longitude, place.latitude]);
      const element = placeMarkerRef.current.getElement();
      const label = element.querySelector("span:last-child");
      if (label) label.textContent = place.name;
    }

    const placeKey = `${place.latitude}:${place.longitude}`;
    const moved = previousPlaceRef.current !== placeKey;
    previousPlaceRef.current = placeKey;
    if (moved) {
      map.flyTo({
        center: [place.longitude, place.latitude],
        zoom: Math.max(map.getZoom(), 8),
        duration: 1_200,
        essential: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    gridMarkersRef.current.forEach((marker) => marker.remove());
    gridMarkersRef.current = grid
      .filter((point) => point.temperatureLabel || point.windLabel)
      .map((point) =>
        new maplibregl.Marker({
          element: createGridMarker(point, showTemperature, showWind),
          anchor: "center",
        })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map),
      );

    return () => {
      gridMarkersRef.current.forEach((marker) => marker.remove());
      gridMarkersRef.current = [];
    };
  }, [grid, showTemperature, showWind, ready]);

  const focusPlace = () => {
    const map = mapRef.current;
    if (!map) return;
    vibrate(5);
    map.flyTo({
      center: [place.longitude, place.latitude],
      zoom: Math.max(map.getZoom(), 8),
      duration: 1_200,
      essential: true,
    });
  };

  return (
    <div className="relative h-full w-full bg-[#071019]">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label={
          language === "bn"
            ? "ইন্টারঅ্যাকটিভ আবহাওয়া রাডার ম্যাপ"
            : "Interactive weather radar map"
        }
      />
      <div className="pointer-events-none absolute right-3 top-3 z-30 flex flex-col overflow-hidden rounded-xl border border-white/15 bg-[#06111d]/88">
        <div className="pointer-events-auto flex flex-col">
          <MapControlButton
            label={language === "bn" ? "জুম ইন" : "Zoom in"}
            onClick={() => {
              vibrate(4);
              mapRef.current?.zoomIn({ duration: 260 });
            }}
          >
            <Plus className="h-4 w-4" />
          </MapControlButton>
          <span className="mx-2 h-px bg-white/10" />
          <MapControlButton
            label={language === "bn" ? "জুম আউট" : "Zoom out"}
            onClick={() => {
              vibrate(4);
              mapRef.current?.zoomOut({ duration: 260 });
            }}
          >
            <Minus className="h-4 w-4" />
          </MapControlButton>
          <span className="mx-2 h-px bg-white/10" />
          <MapControlButton
            label={language === "bn" ? "স্থানে ফিরে যান" : "Center on place"}
            onClick={focusPlace}
          >
            <LocateFixed className="h-4 w-4" />
          </MapControlButton>
          <span className="mx-2 h-px bg-white/10" />
          <MapControlButton
            label={
              isFullscreen
                ? language === "bn"
                  ? "পূর্ণ স্ক্রিন থেকে বের"
                  : "Exit full screen"
                : language === "bn"
                  ? "পূর্ণ স্ক্রিন"
                  : "Full screen"
            }
            onClick={() => {
              vibrate(5);
              onToggleFullscreen();
            }}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </MapControlButton>
        </div>
      </div>
    </div>
  );
}
