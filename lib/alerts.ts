import { getCondition } from "@/lib/weather-codes";
import { getUpcomingHourly } from "@/lib/weather";
import type { HourlyPoint, WeatherAlert, WeatherData } from "@/types/weather";

const SEVERITY_RANK: Record<WeatherAlert["severity"], number> = {
  advisory: 1,
  watch: 2,
  warning: 3,
  severe: 4,
};

function firstSustained(
  hours: HourlyPoint[],
  predicate: (hour: HourlyPoint) => boolean,
  consecutive = 1,
): { first: HourlyPoint; last: HourlyPoint } | null {
  let first: HourlyPoint | null = null;
  let count = 0;
  for (const hour of hours) {
    if (predicate(hour)) {
      if (!first) first = hour;
      count += 1;
      if (count >= consecutive) return { first, last: hour };
    } else {
      first = null;
      count = 0;
    }
  }
  if (first) return { first, last: hours[hours.length - 1] ?? first };
  return null;
}

function sum(hours: HourlyPoint[]): number {
  return hours.reduce((total, hour) => total + hour.precipitation, 0);
}

/**
 * MeraCast advisories are derived from Open-Meteo thresholds. They are
 * deliberately labelled as such in the interface and must never be presented
 * as official CAP or meteorological-agency warnings.
 */
export function deriveAlerts(weather: WeatherData): WeatherAlert[] {
  const next72 = getUpcomingHourly(weather, 72);
  const next48 = next72.slice(0, 48);
  const next24 = next72.slice(0, 24);
  const alerts: WeatherAlert[] = [];

  const rain24 = sum(next24);
  const rain72 = sum(next72);
  const heavyRun = firstSustained(next24, (hour) => hour.precipitation >= 5, 2);
  const rainfall = heavyRun ? sum(next24) : Math.max(rain24, 0);

  if (rain24 >= 40 || (heavyRun && rainfall >= 18)) {
    const start = heavyRun?.first.time ?? next24[0]?.time ?? weather.current.time;
    const end = heavyRun?.last.time ?? next24[next24.length - 1]?.time ?? weather.current.time;
    alerts.push({
      id: "heavy-rain",
      severity: rain24 >= 80 ? "severe" : rain24 >= 55 ? "warning" : "watch",
      titleKey: "alertHeavyRainTitle",
      detailKey: "alertHeavyRainBody",
      icon: "rain",
      startsAt: start,
      endsAt: end,
      values: { amount: String(Math.round(rain24)) },
      metrics: { amount: rain24 },
    });
  }

  const storm = firstSustained(next48, (hour) => getCondition(hour.conditionCode).tone === "storm");
  if (storm) {
    alerts.push({
      id: "storm",
      severity: getCondition(storm.first.conditionCode).intensity >= 5 ? "warning" : "watch",
      titleKey: "alertStormTitle",
      detailKey: "alertStormBody",
      icon: "storm",
      startsAt: storm.first.time,
      endsAt: storm.last.time,
    });
  }

  const heat = firstSustained(next72, (hour) => hour.apparentTemperature >= 38, 2);
  if (heat) {
    const peak = Math.max(...next72.map((hour) => hour.apparentTemperature));
    alerts.push({
      id: "heat",
      severity: peak >= 44 ? "severe" : peak >= 40 ? "warning" : "watch",
      titleKey: "alertHeatTitle",
      detailKey: "alertHeatBody",
      icon: "heat",
      startsAt: heat.first.time,
      endsAt: heat.last.time,
      values: { value: String(Math.round(peak)) },
      metrics: { temperature: peak },
    });
  }

  const wind = firstSustained(next72, (hour) => hour.windGust >= 55);
  if (wind) {
    const peakGust = Math.max(...next72.map((hour) => hour.windGust));
    alerts.push({
      id: "wind",
      severity: peakGust >= 90 ? "severe" : peakGust >= 70 ? "warning" : "watch",
      titleKey: "alertWindTitle",
      detailKey: "alertWindBody",
      icon: "wind",
      startsAt: wind.first.time,
      endsAt: wind.last.time,
      values: { value: String(Math.round(peakGust)) },
      metrics: { wind: peakGust },
    });
  }

  if (rain72 >= 90) {
    const first = next72[0];
    const last = next72[next72.length - 1];
    if (first && last) {
      alerts.push({
        id: "flood",
        severity: rain72 >= 140 ? "warning" : "watch",
        titleKey: "alertFloodTitle",
        detailKey: "alertFloodBody",
        icon: "flood",
        startsAt: first.time,
        endsAt: last.time,
      });
    }
  }

  const fog = firstSustained(
    next48,
    (hour) => hour.visibility !== null && hour.visibility < 2000,
  );
  if (fog) {
    const visibility = fog.first.visibility ?? 1000;
    alerts.push({
      id: "fog",
      severity: visibility < 500 ? "warning" : "advisory",
      titleKey: "alertFogTitle",
      detailKey: "alertFogBody",
      icon: "fog",
      startsAt: fog.first.time,
      endsAt: fog.last.time,
      values: { value: String(Math.max(0.1, Math.round(visibility / 100) / 10)) },
      metrics: { visibility },
    });
  }

  const cold = firstSustained(next72, (hour) => hour.apparentTemperature <= 4, 2);
  if (cold) {
    const low = Math.min(...next72.map((hour) => hour.apparentTemperature));
    alerts.push({
      id: "cold",
      severity: low <= -5 ? "warning" : "advisory",
      titleKey: "alertColdTitle",
      detailKey: "alertColdBody",
      icon: "cold",
      startsAt: cold.first.time,
      endsAt: cold.last.time,
      values: { value: String(Math.round(low)) },
      metrics: { temperature: low },
    });
  }

  return alerts
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .slice(0, 4);
}
