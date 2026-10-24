"use client";

import { create } from "zustand";
import type { SceneKind } from "@/types/weather";

interface SceneState {
  kind: SceneKind;
  intensity: number;
  placeName: string | null;
  setScene: (kind: SceneKind, intensity?: number, placeName?: string) => void;
}

export const useScene = create<SceneState>((set) => ({
  kind: "clear-night",
  intensity: 0,
  placeName: null,
  setScene: (kind, intensity = 0, placeName) => set({ kind, intensity, placeName }),
}));
