import { describe, expect, it } from "vitest";
import {
  localizedAdmin1Name,
  localizedCountryName,
  localizedPlaceDetail,
  localizedPlaceName,
} from "@/lib/place-localization";
import type { Place } from "@/types/geo";

const dhaka: Place = {
  id: "dhaka-bd",
  name: "Dhaka",
  country: "Bangladesh",
  countryCode: "BD",
  admin1: "Dhaka Division",
  latitude: 23.8103,
  longitude: 90.4125,
  timezone: "Asia/Dhaka",
};

describe("Bangla place localization", () => {
  it("localizes the default Dhaka plan for the share card", () => {
    expect(localizedPlaceName(dhaka, "bn")).toBe("ঢাকা");
    expect(localizedAdmin1Name(dhaka, "bn")).toBe("ঢাকা বিভাগ");
    expect(localizedCountryName(dhaka, "bn")).toBe("বাংলাদেশ");
    expect(localizedPlaceDetail(dhaka, "bn")).toBe("ঢাকা বিভাগ, বাংলাদেশ");
  });

  it("keeps canonical English labels for the English card", () => {
    expect(localizedPlaceName(dhaka, "en")).toBe("Dhaka");
    expect(localizedAdmin1Name(dhaka, "en")).toBe("Dhaka Division");
    expect(localizedCountryName(dhaka, "en")).toBe("Bangladesh");
  });

  it("uses provider-localized fields when they are available", () => {
    const localized = {
      ...dhaka,
      localizedNames: { bn: "ঢাকা শহর" },
      localizedAdmin1Names: { bn: "ঢাকা অঞ্চল" },
      localizedCountryNames: { bn: "বাংলাদেশ গণপ্রজাতন্ত্রী" },
    } as Place;

    expect(localizedPlaceName(localized, "bn")).toBe("ঢাকা শহর");
    expect(localizedAdmin1Name(localized, "bn")).toBe("ঢাকা অঞ্চল");
    expect(localizedCountryName(localized, "bn")).toBe("বাংলাদেশ গণপ্রজাতন্ত্রী");
  });

  it("falls back gracefully for places outside the local dictionary", () => {
    const london: Place = {
      id: "london-gb",
      name: "London",
      country: "United Kingdom",
      countryCode: "GB",
      admin1: "England",
      latitude: 51.5072,
      longitude: -0.1276,
      timezone: "Europe/London",
    };

    expect(localizedPlaceName(london, "bn")).toBe("London");
    expect(localizedAdmin1Name(london, "bn")).toBe("England");
    expect(localizedCountryName(london, "bn")).toBe("যুক্তরাজ্য");
    expect(localizedPlaceDetail(london, "bn")).toBe("England, যুক্তরাজ্য");
  });

  it("handles a place with no admin or country", () => {
    const bare: Place = {
      id: "bare",
      name: "Somewhere",
      country: "",
      latitude: 0,
      longitude: 0,
      timezone: "UTC",
    };

    expect(localizedPlaceDetail(bare, "bn")).toBe("");
  });
});
