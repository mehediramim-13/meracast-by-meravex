import type { Place } from "@/types/geo";
import type { Language } from "@/types/settings";

type LocalizedNames = Partial<Record<Language, string>>;

/**
 * Geocoding returns canonical English names. Providers that do return a
 * localized label can pass it through these optional fields; the small map
 * below covers the app's home region so Bangla share cards stay consistent
 * even when the upstream provider has no localized city label.
 */
interface LocalizedPlaceFields {
  localizedName?: string;
  localizedNames?: LocalizedNames;
  localizedAdmin1?: string;
  localizedAdmin1Names?: LocalizedNames;
  localizedCountry?: string;
  localizedCountryNames?: LocalizedNames;
}

const CITY_NAMES: Record<string, LocalizedNames> = {
  dhaka: { bn: "ঢাকা" },
  chattogram: { bn: "চট্টগ্রাম" },
  "chittagong": { bn: "চট্টগ্রাম" },
  sylhet: { bn: "সিলেট" },
  khulna: { bn: "খুলনা" },
  rajshahi: { bn: "রাজশাহী" },
  barishal: { bn: "বরিশাল" },
  barisal: { bn: "বরিশাল" },
  rangpur: { bn: "রংপুর" },
  mymensingh: { bn: "ময়মনসিংহ" },
  "cox's bazar": { bn: "কক্সবাজার" },
  "cox’s bazar": { bn: "কক্সবাজার" },
  narayanganj: { bn: "নারায়ণগঞ্জ" },
  gazipur: { bn: "গাজীপুর" },
};

const ADMIN_NAMES: Record<string, LocalizedNames> = {
  "dhaka division": { bn: "ঢাকা বিভাগ" },
  "chittagong division": { bn: "চট্টগ্রাম বিভাগ" },
  "chattogram division": { bn: "চট্টগ্রাম বিভাগ" },
  "sylhet division": { bn: "সিলেট বিভাগ" },
  "khulna division": { bn: "খুলনা বিভাগ" },
  "rajshahi division": { bn: "রাজশাহী বিভাগ" },
  "barishal division": { bn: "বরিশাল বিভাগ" },
  "barisal division": { bn: "বরিশাল বিভাগ" },
  "rangpur division": { bn: "রংপুর বিভাগ" },
  "mymensingh division": { bn: "ময়মনসিংহ বিভাগ" },
};

const COUNTRY_NAMES: Record<string, LocalizedNames> = {
  bangladesh: { bn: "বাংলাদেশ" },
  india: { bn: "ভারত" },
  pakistan: { bn: "পাকিস্তান" },
  nepal: { bn: "নেপাল" },
  "united states": { bn: "যুক্তরাষ্ট্র" },
  "united kingdom": { bn: "যুক্তরাজ্য" },
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase().normalize("NFKC");
}

function explicitName(
  fields: LocalizedPlaceFields,
  language: Language,
  pluralKey: "localizedNames" | "localizedAdmin1Names" | "localizedCountryNames",
  singularKey: "localizedName" | "localizedAdmin1" | "localizedCountry",
): string | undefined {
  const plural = fields[pluralKey]?.[language]?.trim();
  if (plural) return plural;
  const singular = fields[singularKey]?.trim();
  return singular || undefined;
}

export function localizedPlaceName(place: Place, language: Language): string {
  if (language === "en") return place.name;
  const explicit = explicitName(
    place as Place & LocalizedPlaceFields,
    language,
    "localizedNames",
    "localizedName",
  );
  if (explicit) return explicit;
  return CITY_NAMES[normalizeName(place.name)]?.bn ?? place.name;
}

export function localizedAdmin1Name(place: Place, language: Language): string {
  if (!place.admin1) return "";
  if (language === "en") return place.admin1;
  const explicit = explicitName(
    place as Place & LocalizedPlaceFields,
    language,
    "localizedAdmin1Names",
    "localizedAdmin1",
  );
  if (explicit) return explicit;
  return ADMIN_NAMES[normalizeName(place.admin1)]?.bn ?? place.admin1;
}

export function localizedCountryName(place: Place, language: Language): string {
  if (!place.country) return "";
  if (language === "en") return place.country;
  const explicit = explicitName(
    place as Place & LocalizedPlaceFields,
    language,
    "localizedCountryNames",
    "localizedCountry",
  );
  if (explicit) return explicit;

  if (place.countryCode) {
    try {
      const region = new Intl.DisplayNames([language], { type: "region" }).of(
        place.countryCode.toUpperCase(),
      );
      if (region) return region;
    } catch {
      // Older runtimes may not support Intl.DisplayNames; use the map below.
    }
  }

  return COUNTRY_NAMES[normalizeName(place.country)]?.bn ?? place.country;
}

export function localizedPlaceDetail(place: Place, language: Language): string {
  return [localizedAdmin1Name(place, language), localizedCountryName(place, language)]
    .filter(Boolean)
    .join(", ");
}
