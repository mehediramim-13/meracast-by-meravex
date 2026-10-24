"use client";

import { create } from "zustand";
import type { Place } from "@/types/geo";

export type ShareTarget = "weather" | "planner" | null;

interface UIState {
  searchOpen: boolean;
  locationMenuOpen: boolean;
  paletteOpen: boolean;
  customizeOpen: boolean;
  installOpen: boolean;
  shareOpen: boolean;
  shareTarget: ShareTarget;
  mobileMenuOpen: boolean;
  mapPickerOpen: boolean;
  mapPickerTarget: "dashboard" | "planner";
  mapPickResult: Place | null;
  setSearchOpen: (open: boolean) => void;
  setLocationMenuOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  setCustomizeOpen: (open: boolean) => void;
  setInstallOpen: (open: boolean) => void;
  openShare: (target: Exclude<ShareTarget, null>) => void;
  closeShare: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  openMapPicker: (target: "dashboard" | "planner") => void;
  closeMapPicker: () => void;
  setMapPickResult: (place: Place | null) => void;
  closeAllOverlays: () => void;
}

export const useUI = create<UIState>((set) => ({
  searchOpen: false,
  locationMenuOpen: false,
  paletteOpen: false,
  customizeOpen: false,
  installOpen: false,
  shareOpen: false,
  shareTarget: null,
  mobileMenuOpen: false,
  mapPickerOpen: false,
  mapPickerTarget: "dashboard",
  mapPickResult: null,
  setSearchOpen: (searchOpen) =>
    set(searchOpen ? { searchOpen, locationMenuOpen: false } : { searchOpen }),
  setLocationMenuOpen: (locationMenuOpen) =>
    set(
      locationMenuOpen
        ? { locationMenuOpen, searchOpen: false, paletteOpen: false }
        : { locationMenuOpen },
    ),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setCustomizeOpen: (customizeOpen) => set({ customizeOpen }),
  setInstallOpen: (installOpen) => set({ installOpen }),
  openShare: (target) => set({ shareOpen: true, shareTarget: target }),
  closeShare: () => set({ shareOpen: false, shareTarget: null }),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  openMapPicker: (mapPickerTarget) => set({ mapPickerOpen: true, mapPickerTarget, mapPickResult: null }),
  closeMapPicker: () => set({ mapPickerOpen: false, mapPickResult: null }),
  setMapPickResult: (mapPickResult) => set({ mapPickResult }),
  closeAllOverlays: () =>
    set({
      searchOpen: false,
      locationMenuOpen: false,
      paletteOpen: false,
      customizeOpen: false,
      installOpen: false,
      shareOpen: false,
      shareTarget: null,
      mobileMenuOpen: false,
      mapPickerOpen: false,
    }),
}));
