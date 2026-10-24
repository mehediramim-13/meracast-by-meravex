import type { Language, TimeFormat, TemperatureUnit } from "@/types/settings";

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;
const LATIN_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export interface NumberOptions {
  language?: Language;
  bengaliNumerals?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  signDisplay?: "auto" | "always" | "exceptZero" | "never";
}

export function toBengaliDigits(input: string): string {
  return input.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)] ?? digit);
}

export function toLatinDigits(input: string): string {
  return input.replace(/[০-৯]/g, (digit) => {
    const index = BENGALI_DIGITS.indexOf(digit as (typeof BENGALI_DIGITS)[number]);
    return index >= 0 ? (LATIN_DIGITS[index] ?? digit) : digit;
  });
}

export function formatNumber(value: number, options: NumberOptions = {}): string {
  const {
    language = "en",
    bengaliNumerals = false,
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    signDisplay = "auto",
  } = options;

  if (!Number.isFinite(value)) return "—";

  const locale = bengaliNumerals ? "bn-BD" : language === "bn" ? "bn-BD" : "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
    signDisplay,
    useGrouping: true,
  }).format(value);

  return bengaliNumerals ? toBengaliDigits(formatted) : toLatinDigits(formatted);
}

export function formatPercentValue(value: number, options: NumberOptions = {}): string {
  return `${formatNumber(Math.round(value), options)}%`;
}

export function formatTemperatureValue(
  valueC: number,
  unit: TemperatureUnit,
  options: NumberOptions = {},
): string {
  const converted = unit === "f" ? valueC * 1.8 + 32 : valueC;
  return formatNumber(converted, {
    ...options,
    maximumFractionDigits: 0,
  });
}

export function formatTemperature(
  valueC: number,
  unit: TemperatureUnit,
  options: NumberOptions = {},
): string {
  return `${formatTemperatureValue(valueC, unit, options)}°`;
}

export function formatWindValue(
  kmh: number,
  unit: "kmh" | "mph" | "ms" | "kn",
  options: NumberOptions = {},
): string {
  const factor = unit === "mph" ? 0.621371 : unit === "ms" ? 0.277778 : unit === "kn" ? 0.539957 : 1;
  return formatNumber(kmh * factor, {
    ...options,
    maximumFractionDigits: unit === "ms" || unit === "kn" ? 1 : 0,
  });
}

export function formatPrecipValue(
  mm: number,
  unit: "mm" | "in",
  options: NumberOptions = {},
): string {
  return formatNumber(unit === "in" ? mm * 0.0393701 : mm, {
    ...options,
    minimumFractionDigits: 0,
    maximumFractionDigits: unit === "in" ? 2 : 1,
  });
}

export function formatPressureValue(
  hpa: number,
  unit: "hpa" | "inhg",
  options: NumberOptions = {},
): string {
  return formatNumber(unit === "inhg" ? hpa * 0.02953 : hpa, {
    ...options,
    minimumFractionDigits: unit === "inhg" ? 2 : 0,
    maximumFractionDigits: unit === "inhg" ? 2 : 0,
  });
}

export function formatVisibilityValue(
  km: number,
  unit: TemperatureUnit,
  options: NumberOptions = {},
): string {
  return formatNumber(unit === "f" ? km * 0.621371 : km, {
    ...options,
    maximumFractionDigits: km < 10 ? 1 : 0,
  });
}

/** Parses an Open-Meteo local ISO string ("2026-10-22T15:00") without timezone shifts. */
export function splitLocalIso(iso: string): { date: string; hour: number; minute: number } | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return null;
  return {
    date: match[1] ?? "",
    hour: Number(match[2] ?? 0),
    minute: Number(match[3] ?? 0),
  };
}

export interface ClockOptions extends NumberOptions {
  timeFormat?: TimeFormat;
  am?: string;
  pm?: string;
}

export function formatLocalTime(iso: string, options: ClockOptions = {}): string {
  const parsed = splitLocalIso(iso);
  if (!parsed) return "—";
  const { timeFormat = "12h", am = "AM", pm = "PM", bengaliNumerals = false } = options;
  const { hour, minute } = parsed;
  const paddedMinute = String(minute).padStart(2, "0");
  let result: string;
  if (timeFormat === "12h") {
    const suffix = hour >= 12 ? pm : am;
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    result = `${displayHour}:${paddedMinute} ${suffix}`;
  } else {
    result = `${String(hour).padStart(2, "0")}:${paddedMinute}`;
  }
  return bengaliNumerals ? toBengaliDigits(result) : result;
}

export function formatLocalHour(
  iso: string,
  options: Omit<ClockOptions, "minute"> = {},
): string {
  const parsed = splitLocalIso(iso);
  if (!parsed) return "—";
  const { timeFormat = "12h", am = "AM", pm = "PM", bengaliNumerals = false } = options;
  const { hour } = parsed;
  let result: string;
  if (timeFormat === "12h") {
    result = `${hour % 12 === 0 ? 12 : hour % 12} ${hour >= 12 ? pm : am}`;
  } else {
    result = `${String(hour).padStart(2, "0")}:00`;
  }
  return bengaliNumerals ? toBengaliDigits(result) : result;
}

export function isoDateOf(iso: string): string {
  return iso.slice(0, 10);
}

export function addDaysToIsoDate(date: string, days: number): string {
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function diffIsoDates(a: string, b: string): number {
  const aDate = Date.parse(`${a}T12:00:00Z`);
  const bDate = Date.parse(`${b}T12:00:00Z`);
  return Math.round((aDate - bDate) / 86_400_000);
}

const WEEKDAYS = {
  en: {
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
  bn: {
    short: ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"],
    long: ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"],
  },
} as const;

const MONTHS = {
  en: {
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    long: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
  },
  bn: {
    short: ["জানু", "ফেব", "মার্চ", "এপ্রি", "মে", "জুন", "জুল", "আগ", "সেপ", "অক্টো", "নভে", "ডিসে"],
    long: [
      "জানুয়ারি",
      "ফেব্রুয়ারি",
      "মার্চ",
      "এপ্রিল",
      "মে",
      "জুন",
      "জুলাই",
      "আগস্ট",
      "সেপ্টেম্বর",
      "অক্টোবর",
      "নভেম্বর",
      "ডিসেম্বর",
    ],
  },
} as const;

function dateParts(isoDate: string): { year: number; month: number; day: number; weekday: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, weekday };
}

export function formatWeekday(
  isoDate: string,
  language: Language = "en",
  style: "short" | "long" = "short",
): string {
  const parts = dateParts(isoDate);
  if (!parts) return "—";
  return WEEKDAYS[language][style][parts.weekday] ?? "—";
}

export function formatMonthDay(
  isoDate: string,
  language: Language = "en",
  bengaliNumerals = false,
  style: "short" | "long" = "short",
): string {
  const parts = dateParts(isoDate);
  if (!parts) return "—";
  const month = MONTHS[language][style][parts.month - 1] ?? "";
  const day = bengaliNumerals ? toBengaliDigits(String(parts.day)) : String(parts.day);
  return language === "bn" ? `${day} ${month}` : `${month} ${day}`;
}

export function formatFullDate(
  isoDate: string,
  language: Language = "en",
  bengaliNumerals = false,
): string {
  const parts = dateParts(isoDate);
  if (!parts) return "—";
  const year = bengaliNumerals ? toBengaliDigits(String(parts.year)) : String(parts.year);
  return `${formatWeekday(isoDate, language, "long")}, ${formatMonthDay(
    isoDate,
    language,
    bengaliNumerals,
    "long",
  )} ${year}`;
}

export function getDateParts(isoDate: string): ReturnType<typeof dateParts> {
  return dateParts(isoDate);
}

export function formatShortDateTime(iso: string, language: Language = "en", bengaliNumerals = false): string {
  const date = iso.slice(0, 10);
  return `${formatWeekday(date, language)} ${formatMonthDay(date, language, bengaliNumerals)}`;
}

export function formatUtcTime(epochMs: number, timeZone: string, timeFormat: TimeFormat = "12h"): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(epochMs));
  if (timeFormat === "24h") return formatted;
  const [hoursRaw, minutes] = formatted.split(":");
  const hours = Number(hoursRaw);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${suffix}`;
}

/** Converts a local wall-clock ISO (no offset) + offset into a real epoch. */
export function localIsoToEpoch(iso: string, utcOffsetSeconds: number): number {
  const withSeconds = iso.length === 16 ? `${iso}:00` : iso;
  const asUtc = Date.parse(`${withSeconds}Z`);
  return asUtc - utcOffsetSeconds * 1000;
}

/** Returns the wall-clock ISO at `date` in a timezone with a fixed offset. */
export function epochToLocalIso(epochMs: number, utcOffsetSeconds: number): string {
  return new Date(epochMs + utcOffsetSeconds * 1000).toISOString().slice(0, 16);
}

export function nowLocalIso(utcOffsetSeconds: number): string {
  return epochToLocalIso(Date.now(), utcOffsetSeconds);
}

export function relativeDayKey(
  isoDate: string,
  todayIso: string,
): "today" | "tomorrow" | "yesterday" | "dayAfterTomorrow" | "other" {
  const diff = diffIsoDates(isoDate, todayIso);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff === 2) return "dayAfterTomorrow";
  return "other";
}

export function formatDuration(seconds: number, language: Language = "en", bengaliNumerals = false): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  const hLabel = language === "bn" ? "ঘ" : "h";
  const mLabel = language === "bn" ? "মি" : "m";
  const h = bengaliNumerals ? toBengaliDigits(String(hours)) : String(hours);
  const m = bengaliNumerals ? toBengaliDigits(String(minutes)) : String(minutes);
  if (hours > 0 && minutes > 0) return `${h}${hLabel} ${m}${mLabel}`;
  if (hours > 0) return `${h}${hLabel}`;
  return `${m}${mLabel}`;
}

export function formatDateInput(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date(epochMs));
}

export function formatTimeInput(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(epochMs));
}
