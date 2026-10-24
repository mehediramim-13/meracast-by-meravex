"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_PLACE, STORAGE_KEYS } from "@/lib/constants";
import { samePlace } from "@/lib/place";
import type { Place, SavedPlace } from "@/types/geo";

export const MAX_FAVORITES = 12;
export const MAX_RECENTS = 5;

/**
 * Storage can be unavailable in private windows or when the browser blocks
 * localStorage. Keep the in-memory store usable instead of crashing the app.
 */
const safeStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    try {
      return window.localStorage.getItem(name);
    } catch (error) {
      console.error("Could not read saved locations", error);
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      window.localStorage.setItem(name, value);
    } catch (error) {
      console.error("Could not save locations", error);
    }
  },
  removeItem: (name: string) => {
    try {
      window.localStorage.removeItem(name);
    } catch (error) {
      console.error("Could not remove saved locations", error);
    }
  },
}));

export type FavoriteAddResult = "added" | "duplicate" | "limit";

export type FavoriteToggleResult =
  | { status: "added" }
  | { status: "removed"; favorite: SavedPlace; index: number }
  | { status: "duplicate" }
  | { status: "limit" };

interface LocationActions {
  setActivePlace: (place: Place) => void;
  addFavorite: (place: Place) => FavoriteAddResult;
  removeFavorite: (id: string) => SavedPlace | null;
  restoreFavorite: (favorite: SavedPlace, index?: number) => void;
  toggleFavorite: (place: Place) => FavoriteToggleResult;
  setHomePlace: (place: Place | null) => void;
  reorderFavorite: (id: string, targetIndex: number) => void;
  addRecent: (place: Place) => void;
  removeRecent: (id: string) => void;
  clearRecents: () => void;
  clearAll: () => void;
}

export interface LocationsStore {
  activePlace: Place;
  favorites: SavedPlace[];
  recents: Place[];
  homePlaceId: string | null;
  setActivePlace: LocationActions["setActivePlace"];
  addFavorite: LocationActions["addFavorite"];
  removeFavorite: LocationActions["removeFavorite"];
  restoreFavorite: LocationActions["restoreFavorite"];
  toggleFavorite: LocationActions["toggleFavorite"];
  setHomePlace: LocationActions["setHomePlace"];
  reorderFavorite: LocationActions["reorderFavorite"];
  addRecent: LocationActions["addRecent"];
  removeRecent: LocationActions["removeRecent"];
  clearRecents: LocationActions["clearRecents"];
  clearAll: LocationActions["clearAll"];
}

export const useLocations = create<LocationsStore>()(
  persist(
    (set, get) => ({
      activePlace: DEFAULT_PLACE,
      favorites: [],
      recents: [],
      homePlaceId: null,
      setActivePlace: (place) => {
        set((state) => {
          const recent = { ...place, id: place.id };
          const recents = [
            recent,
            ...state.recents.filter((item) => !samePlace(item, place)),
          ].slice(0, MAX_RECENTS);
          return { activePlace: place, recents };
        });
      },
      addFavorite: (place) => {
        let result: FavoriteAddResult = "duplicate";
        set((state) => {
          if (state.favorites.some((favorite) => samePlace(favorite, place))) {
            result = "duplicate";
            return state;
          }
          if (state.favorites.length >= MAX_FAVORITES) {
            result = "limit";
            return state;
          }
          result = "added";
          return {
            favorites: [...state.favorites, { ...place, addedAt: Date.now() }],
          };
        });
        return result;
      },
      removeFavorite: (id) => {
        let removed: SavedPlace | null = null;
        set((state) => {
          const index = state.favorites.findIndex((favorite) => favorite.id === id);
          if (index < 0) return state;
          removed = state.favorites[index] ?? null;
          return {
            favorites: state.favorites.filter((favorite) => favorite.id !== id),
            homePlaceId: state.homePlaceId === id ? null : state.homePlaceId,
          };
        });
        return removed;
      },
      restoreFavorite: (favorite, index) => {
        set((state) => {
          if (state.favorites.some((item) => samePlace(item, favorite))) return state;
          const target = Math.min(Math.max(index ?? state.favorites.length, 0), state.favorites.length);
          const favorites = [...state.favorites];
          favorites.splice(target, 0, favorite);
          return { favorites: favorites.slice(0, MAX_FAVORITES) };
        });
      },
      toggleFavorite: (place) => {
        const state = get();
        const index = state.favorites.findIndex((favorite) => samePlace(favorite, place));
        if (index >= 0) {
          const favorite = state.favorites[index];
          if (!favorite) return { status: "duplicate" };
          const result = state.removeFavorite(favorite.id);
          return result ? { status: "removed", favorite: result, index } : { status: "duplicate" };
        }
        const result = state.addFavorite(place);
        return { status: result };
      },
      setHomePlace: (place) => {
        if (!place) {
          set({ homePlaceId: null });
          return;
        }
        set((state) => {
          const index = state.favorites.findIndex((favorite) => samePlace(favorite, place));
          const favorite = index >= 0 ? state.favorites[index] : undefined;
          if (!favorite) return state;
          return {
            homePlaceId: favorite.id,
            favorites: [favorite, ...state.favorites.filter((_, itemIndex) => itemIndex !== index)],
          };
        });
      },
      reorderFavorite: (id, targetIndex) => {
        set((state) => {
          if (id === state.homePlaceId) return state;
          const index = state.favorites.findIndex((favorite) => favorite.id === id);
          if (index < 0 || state.favorites.length < 2) return state;
          const minimum = state.homePlaceId ? 1 : 0;
          const target = Math.min(
            Math.max(Math.round(targetIndex), minimum),
            state.favorites.length - 1,
          );
          if (target === index) return state;
          const favorites = [...state.favorites];
          const [moved] = favorites.splice(index, 1);
          if (!moved) return state;
          favorites.splice(target, 0, moved);
          return { favorites };
        });
      },
      addRecent: (place) =>
        set((state) => ({
          recents: [place, ...state.recents.filter((item) => !samePlace(item, place))].slice(
            0,
            MAX_RECENTS,
          ),
        })),
      removeRecent: (id) => set((state) => ({ recents: state.recents.filter((p) => p.id !== id) })),
      clearRecents: () => set({ recents: [] }),
      clearAll: () =>
        set({ activePlace: DEFAULT_PLACE, favorites: [], recents: [], homePlaceId: null }),
    }),
    {
      name: STORAGE_KEYS.locations,
      storage: safeStorage,
      version: 2,
      skipHydration: true,
      partialize: (state) => ({
        activePlace: state.activePlace,
        favorites: state.favorites,
        recents: state.recents,
        homePlaceId: state.homePlaceId,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Partial<LocationsStore> | undefined;
        const favorites = Array.isArray(state?.favorites) ? state.favorites : [];
        const candidateHome = version >= 2 ? state?.homePlaceId : null;
        const homeFavorite = candidateHome
          ? favorites.find((favorite) => favorite.id === candidateHome)
          : undefined;
        const homePlaceId = homeFavorite ? candidateHome : null;
        const orderedFavorites =
          homeFavorite && favorites[0]?.id !== homeFavorite.id
            ? [homeFavorite, ...favorites.filter((favorite) => favorite.id !== homeFavorite.id)]
            : favorites;
        return {
          ...state,
          activePlace: state?.activePlace ?? DEFAULT_PLACE,
          favorites: orderedFavorites,
          recents: Array.isArray(state?.recents) ? state.recents : [],
          homePlaceId,
        } as LocationsStore;
      },
    },
  ),
);
