import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PLACE, STORAGE_KEYS } from "@/lib/constants";
import { MAX_FAVORITES, useLocations } from "@/store/use-locations";
import type { Place } from "@/types/geo";

function place(name: string, latitude: number, longitude: number, id = name.toLowerCase()): Place {
  return {
    id,
    name,
    country: "Bangladesh",
    countryCode: "BD",
    latitude,
    longitude,
    timezone: "Asia/Dhaka",
  };
}

function resetLocations() {
  useLocations.setState({
    activePlace: DEFAULT_PLACE,
    favorites: [],
    recents: [],
    homePlaceId: null,
  });
}

describe("locations store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetLocations();
  });

  it("deduplicates favorites by place and supports remove plus undo", () => {
    const dhaka = place("Dhaka", 23.8103, 90.4125, "dhaka");

    expect(useLocations.getState().addFavorite(dhaka)).toBe("added");
    expect(
      useLocations.getState().addFavorite(place("Dhaka duplicate", 23.811, 90.413, "dhaka-2")),
    ).toBe("duplicate");
    expect(useLocations.getState().favorites).toHaveLength(1);

    const toggled = useLocations.getState().toggleFavorite(dhaka);
    expect(toggled.status).toBe("removed");
    if (toggled.status !== "removed") return;

    expect(toggled.index).toBe(0);
    expect(useLocations.getState().favorites).toHaveLength(0);

    useLocations.getState().restoreFavorite(toggled.favorite, toggled.index);
    expect(useLocations.getState().favorites[0]?.name).toBe("Dhaka");
  });

  it("enforces the favorite limit without losing earlier entries", () => {
    for (let index = 0; index < MAX_FAVORITES; index += 1) {
      const result = useLocations
        .getState()
        .addFavorite(place(`City ${index}`, 20 + index * 0.2, 88 + index * 0.2, `city-${index}`));
      expect(result).toBe("added");
    }

    expect(useLocations.getState().favorites).toHaveLength(MAX_FAVORITES);
    expect(
      useLocations.getState().addFavorite(place("Overflow", 30, 95, "overflow")),
    ).toBe("limit");
    expect(useLocations.getState().favorites).toHaveLength(MAX_FAVORITES);
  });

  it("keeps one recent entry for the same place and a stable active place", () => {
    const first = place("Chattogram", 22.3569, 91.7832, "ctg");
    const same = place("Chattogram again", 22.357, 91.783, "ctg-2");

    useLocations.getState().setActivePlace(first);
    useLocations.getState().setActivePlace(same);

    expect(useLocations.getState().activePlace.id).toBe("ctg-2");
    expect(useLocations.getState().recents).toHaveLength(1);
    expect(useLocations.getState().recents[0]?.name).toBe("Chattogram again");
  });

  it("pins one home first, keeps it fixed and clears it when removed", () => {
    const dhaka = place("Dhaka", 23.8103, 90.4125, "dhaka");
    const sylhet = place("Sylhet", 24.8949, 91.8687, "sylhet");
    const khulna = place("Khulna", 22.8456, 89.5403, "khulna");
    [dhaka, sylhet, khulna].forEach((city) => useLocations.getState().addFavorite(city));

    useLocations.getState().setHomePlace(sylhet);
    expect(useLocations.getState().homePlaceId).toBe("sylhet");
    expect(useLocations.getState().favorites.map((favorite) => favorite.id)).toEqual([
      "sylhet",
      "dhaka",
      "khulna",
    ]);

    useLocations.getState().setHomePlace(khulna);
    expect(useLocations.getState().homePlaceId).toBe("khulna");
    expect(useLocations.getState().favorites.map((favorite) => favorite.id)).toEqual([
      "khulna",
      "sylhet",
      "dhaka",
    ]);

    useLocations.getState().reorderFavorite("khulna", 2);
    expect(useLocations.getState().favorites[0]?.id).toBe("khulna");
    useLocations.getState().reorderFavorite("dhaka", 0);
    expect(useLocations.getState().favorites.map((favorite) => favorite.id)).toEqual([
      "khulna",
      "dhaka",
      "sylhet",
    ]);

    useLocations.getState().removeFavorite("khulna");
    expect(useLocations.getState().homePlaceId).toBeNull();
    expect(useLocations.getState().favorites).toHaveLength(2);
  });

  it("persists the favorite order and home id with the current version", () => {
    const dhaka = place("Dhaka", 23.8103, 90.4125, "dhaka");
    const sylhet = place("Sylhet", 24.8949, 91.8687, "sylhet");
    useLocations.getState().addFavorite(dhaka);
    useLocations.getState().addFavorite(sylhet);
    useLocations.getState().setHomePlace(sylhet);
    useLocations.getState().reorderFavorite("dhaka", 1);

    const raw = window.localStorage.getItem(STORAGE_KEYS.locations);
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw ?? "{}") as {
      state?: { favorites?: Array<{ id: string }>; homePlaceId?: string | null };
      version?: number;
    };
    expect(stored.version).toBe(2);
    expect(stored.state?.homePlaceId).toBe("sylhet");
    expect(stored.state?.favorites?.map((favorite) => favorite.id)).toEqual(["sylhet", "dhaka"]);
  });

  it("migrates version 1 favorites and recents without loss", async () => {
    const dhaka = place("Dhaka", 23.8103, 90.4125, "dhaka");
    const recent = place("Rajshahi", 24.3745, 88.6042, "rajshahi");
    window.localStorage.setItem(
      STORAGE_KEYS.locations,
      JSON.stringify({
        version: 1,
        state: {
          activePlace: dhaka,
          favorites: [{ ...dhaka, savedAt: 1 }],
          recents: [recent],
        },
      }),
    );

    await useLocations.persist.rehydrate();

    expect(useLocations.getState().favorites).toHaveLength(1);
    expect(useLocations.getState().favorites[0]?.name).toBe("Dhaka");
    expect(useLocations.getState().recents[0]?.name).toBe("Rajshahi");
    expect(useLocations.getState().homePlaceId).toBeNull();
  });
});
