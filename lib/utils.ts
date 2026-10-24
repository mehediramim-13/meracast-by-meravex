import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function placeSlug(name: string, countryCode?: string): string {
  const base = slugify(name) || "place";
  return countryCode ? `${base}-${countryCode.toLowerCase()}` : base;
}

export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function stablePlaceId(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

export function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getDeviceTier(): "low" | "medium" | "high" {
  if (typeof navigator === "undefined") return "medium";
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  if ((memory && memory <= 2) || cores <= 4) return "low";
  if (cores <= 8) return "medium";
  return "high";
}

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none)").matches;
}

export function transitionDelay(index: number, step = 0.045, max = 0.4): number {
  return Math.min(index * step, max);
}

export function ordinal(value: number, language: "en" | "bn" = "en"): string {
  if (language === "bn") return `${value}`;
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(Math.round((value / total) * 100), 0, 100);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
