export type RadarOverlayKind = "radar" | "satellite";

export type RadarFrameKind = "observed" | "nowcast";

export interface RadarViewport {
  latitude: number;
  longitude: number;
  zoom: number;
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface RadarGridPoint {
  latitude: number;
  longitude: number;
  temperatureLabel: string | null;
  windLabel: string | null;
  windUnit: string;
  windDirection: number | null;
  title: string;
}
