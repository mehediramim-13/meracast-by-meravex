"use client";

import { useEffect, useRef } from "react";
import { createTranslator } from "@/i18n/provider";
import { fetchWeatherClient } from "@/lib/api/client";
import { deriveAlerts } from "@/lib/alerts";
import { getTodayDaily, getUpcomingHourly } from "@/lib/weather";
import { getCondition } from "@/lib/weather-codes";
import { STORAGE_KEYS } from "@/lib/constants";
import { sendNotification } from "@/lib/notifications";
import { safeJsonParse } from "@/lib/utils";
import { useOnline } from "@/hooks/use-environment";
import { useLocations } from "@/store/use-locations";
import { useSettings } from "@/store/use-settings";

type NotificationLog = Record<string, number>;

const CHECK_INTERVAL = 10 * 60 * 1000;
const COOLDOWN = 6 * 60 * 60 * 1000;

function readLog(): NotificationLog {
  if (typeof window === "undefined") return {};
  return safeJsonParse<NotificationLog>(window.localStorage.getItem(STORAGE_KEYS.notificationLog) ?? "") ?? {};
}

function writeLog(log: NotificationLog) {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const pruned = Object.fromEntries(Object.entries(log).filter(([, at]) => at > cutoff));
  window.localStorage.setItem(STORAGE_KEYS.notificationLog, JSON.stringify(pruned));
}

function localClock(timeZone: string): { hour: number; minute: number; date: string } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
    return {
      hour: Number(value("hour")) % 24,
      minute: Number(value("minute")),
      date: `${value("year")}-${value("month")}-${value("day")}`,
    };
  } catch {
    return null;
  }
}

function inQuietHours(clock: { hour: number; minute: number }, start: string, end: string): boolean {
  const toMinutes = (value: string): number => {
    const [hour, minute] = value.split(":").map(Number);
    return (hour ?? 0) * 60 + (minute ?? 0);
  };
  const now = clock.hour * 60 + clock.minute;
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (from === to) return false;
  if (from < to) return now >= from && now < to;
  return now >= from || now < to;
}

/**
 * A gentle, app-open notification scheduler. There is no server push by design:
 * notifications only run while a tab is open, and never during quiet hours.
 */
export function useNotificationScheduler() {
  const enabled = useSettings((state) => state.notifications.enabled);
  const notifications = useSettings((state) => state.notifications);
  const language = useSettings((state) => state.language);
  const place = useLocations((state) => state.activePlace);
  const online = useOnline();
  const running = useRef(false);

  useEffect(() => {
    if (!enabled || !online) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    let disposed = false;

    const check = async (): Promise<void> => {
      if (running.current || disposed) return;
      if (Notification.permission !== "granted") return;
      const clock = localClock(place.timezone === "auto" ? "Asia/Dhaka" : place.timezone);
      if (clock && notifications.quietHours && inQuietHours(clock, notifications.quietStart, notifications.quietEnd)) {
        return;
      }
      running.current = true;
      const { t } = createTranslator(language);
      try {
        const weather = await fetchWeatherClient(place);
        const log = readLog();
        const claim = (key: string, cooldown = COOLDOWN): boolean => {
          const last = log[key] ?? 0;
          if (Date.now() - last < cooldown) return false;
          log[key] = Date.now();
          return true;
        };

        if (notifications.severe) {
          const alert = deriveAlerts(weather).find(
            (item) => item.severity === "warning" || item.severity === "severe",
          );
          if (alert && claim(`alert-${alert.id}`)) {
            await sendNotification(t("notifySevereTitle", { city: weather.place.name }), {
              body: t(alert.titleKey as Parameters<typeof t>[0]),
              tag: `alert-${alert.id}`,
            });
          }
        }

        if (notifications.rainSoon) {
          const next = getUpcomingHourly(weather, 3);
          const wet = next.find(
            (hour) => hour.precipitationProbability >= 55 || hour.precipitation >= 0.2,
          );
          if (wet) {
            const target = Date.parse(`${wet.time.length === 16 ? `${wet.time}:00` : wet.time}Z`) -
              weather.meta.utcOffsetSeconds * 1000;
            const minutes = Math.max(0, Math.round((target - Date.now()) / 60_000));
            if (minutes <= 120 && claim(`rain-${wet.time}`, 3 * 60 * 60 * 1000)) {
              await sendNotification(t("notifyRainTitle"), {
                body: t("notifyRainBody", {
                  minutes: Math.max(5, minutes),
                  city: weather.place.name,
                }),
                tag: `rain-${wet.time}`,
              });
            }
          }
        }

        if (notifications.morningSummary && clock && clock.hour >= 6 && clock.hour < 9) {
          const today = getTodayDaily(weather);
          if (today && claim(`morning-${clock.date}`, 20 * 60 * 60 * 1000)) {
            await sendNotification(t("notifyMorningTitle", { city: weather.place.name }), {
              body: t("notifyMorningBody", {
                condition: t(getCondition(today.conditionCode).labelKey),
                high: Math.round(today.temperatureMax),
                low: Math.round(today.temperatureMin),
                chance: Math.round(today.precipitationProbabilityMax),
              }),
              tag: `morning-${clock.date}`,
            });
          }
        }

        writeLog(log);
      } catch {
        // Network hiccups simply postpone the next check.
      } finally {
        running.current = false;
      }
    };

    const timer = window.setTimeout(() => void check(), 8_000);
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [enabled, notifications, language, place, online]);
}
