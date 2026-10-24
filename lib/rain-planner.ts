import type { TranslationKey } from "@/i18n/en";
import { addDaysToIsoDate, diffIsoDates, localIsoToEpoch, nowLocalIso } from "@/lib/format";
import type { HourlyPoint, WeatherData } from "@/types/weather";
import type {
  ActivityId,
  ActivityProfile,
  PlannerAssessment,
  PlannerInput,
  PlannerMode,
  PlannerReason,
  PlannerResult,
  PlannerSlot,
  PlannerSuitability,
  PlannerUrlState,
  PlannerVerdict,
  PlannerWindow,
} from "@/types/planner";

export const PLANNER_ACTIVITIES: ActivityProfile[] = [
  {
    id: "general",
    labelKey: "plannerActivityGeneral",
    descKey: "plannerActivityGeneralDesc",
    maxPrecipProbability: 45,
    maxPrecipAmount: 0.6,
    maxWindSpeed: 35,
    idealTempMin: 10,
    idealTempMax: 33,
    notesKey: "",
  },
  {
    id: "cricket",
    labelKey: "plannerActivityCricket",
    descKey: "plannerActivityCricketDesc",
    maxPrecipProbability: 30,
    maxPrecipAmount: 0.3,
    maxWindSpeed: 24,
    idealTempMin: 16,
    idealTempMax: 32,
    needsDryGround: true,
    notesKey: "planReasonActivityCricket",
  },
  {
    id: "picnic",
    labelKey: "plannerActivityPicnic",
    descKey: "plannerActivityPicnicDesc",
    maxPrecipProbability: 35,
    maxPrecipAmount: 0.4,
    maxWindSpeed: 22,
    idealTempMin: 17,
    idealTempMax: 31,
    needsDryGround: true,
    notesKey: "planReasonActivityPicnic",
  },
  {
    id: "wedding",
    labelKey: "plannerActivityWedding",
    descKey: "plannerActivityWeddingDesc",
    maxPrecipProbability: 30,
    maxPrecipAmount: 0.3,
    maxWindSpeed: 25,
    idealTempMin: 16,
    idealTempMax: 32,
    needsDryGround: true,
    notesKey: "planReasonActivityWedding",
  },
  {
    id: "commute",
    labelKey: "plannerActivityCommute",
    descKey: "plannerActivityCommuteDesc",
    maxPrecipProbability: 50,
    maxPrecipAmount: 0.7,
    maxWindSpeed: 38,
    idealTempMin: 5,
    idealTempMax: 34,
    notesKey: "planReasonActivityCommute",
  },
  {
    id: "travel",
    labelKey: "plannerActivityTravel",
    descKey: "plannerActivityTravelDesc",
    maxPrecipProbability: 55,
    maxPrecipAmount: 1,
    maxWindSpeed: 42,
    idealTempMin: 4,
    idealTempMax: 34,
    notesKey: "planReasonActivityTravel",
  },
  {
    id: "hiking",
    labelKey: "plannerActivityHiking",
    descKey: "plannerActivityHikingDesc",
    maxPrecipProbability: 35,
    maxPrecipAmount: 0.4,
    maxWindSpeed: 30,
    idealTempMin: 8,
    idealTempMax: 28,
    needsDryGround: true,
    notesKey: "planReasonActivityHiking",
  },
  {
    id: "photography",
    labelKey: "plannerActivityPhotography",
    descKey: "plannerActivityPhotographyDesc",
    maxPrecipProbability: 40,
    maxPrecipAmount: 0.5,
    maxWindSpeed: 32,
    idealTempMin: 4,
    idealTempMax: 32,
    notesKey: "planReasonActivityPhotography",
  },
  {
    id: "outdoor-shoot",
    labelKey: "plannerActivityOutdoorShoot",
    descKey: "plannerActivityOutdoorShootDesc",
    maxPrecipProbability: 30,
    maxPrecipAmount: 0.3,
    maxWindSpeed: 26,
    idealTempMin: 12,
    idealTempMax: 32,
    needsDryGround: true,
    notesKey: "planReasonActivityOutdoorShoot",
  },
  {
    id: "fishing",
    labelKey: "plannerActivityFishing",
    descKey: "plannerActivityFishingDesc",
    maxPrecipProbability: 55,
    maxPrecipAmount: 0.8,
    maxWindSpeed: 28,
    idealTempMin: 12,
    idealTempMax: 31,
    notesKey: "planReasonActivityFishing",
  },
  {
    id: "kite-flying",
    labelKey: "plannerActivityKiteFlying",
    descKey: "plannerActivityKiteFlyingDesc",
    maxPrecipProbability: 30,
    maxPrecipAmount: 0.3,
    maxWindSpeed: 26,
    idealTempMin: 14,
    idealTempMax: 33,
    notesKey: "planReasonActivityKiteFlying",
  },
];

export function activityProfile(id: ActivityId): ActivityProfile {
  return PLANNER_ACTIVITIES.find((activity) => activity.id === id) ?? PLANNER_ACTIVITIES[0]!;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parsePlannerUrlState(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): PlannerUrlState {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const date = get("date");
  const time = get("time");
  const endDate = get("endDate");
  const endTime = get("endTime");
  const mode = get("mode");
  const activity = get("activity");
  const state: PlannerUrlState = {};
  if (date && ISO_DATE_RE.test(date)) state.date = date;
  if (time && HOUR_RE.test(time.slice(0, 5))) state.time = time.slice(0, 5);
  if (endDate && ISO_DATE_RE.test(endDate)) state.endDate = endDate;
  if (endTime && HOUR_RE.test(endTime.slice(0, 5))) state.endTime = endTime.slice(0, 5);
  if (mode === "single" || mode === "range") state.mode = mode;
  if (activity && PLANNER_ACTIVITIES.some((profile) => profile.id === activity)) {
    state.activity = activity as ActivityId;
  }
  return state;
}

export function plannerBounds(weather: WeatherData): { minDate: string; maxDate: string; today: string } {
  const today = weather.current.time.slice(0, 10);
  const last = weather.hourly[weather.hourly.length - 1]?.time.slice(0, 10) ?? today;
  return { minDate: today, maxDate: last, today };
}

export function defaultPlannerMoment(weather: WeatherData): {
  date: string;
  time: string;
  endDate: string;
  endTime: string;
} {
  const now = nowLocalIso(weather.meta.utcOffsetSeconds);
  const date = now.slice(0, 10);
  const hour = Math.min(23, Number(now.slice(11, 13)) + 1);
  const time = `${String(hour).padStart(2, "0")}:00`;
  const end = addHours(date, time, 3);
  return { date, time, endDate: end.date, endTime: end.time };
}

export function addHours(date: string, time: string, hours: number): { date: string; time: string } {
  const epoch = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(epoch)) return { date, time };
  const next = new Date(epoch + hours * 3_600_000);
  return { date: next.toISOString().slice(0, 10), time: next.toISOString().slice(11, 16) };
}

function findHourIndex(weather: WeatherData, targetIso: string): number {
  const hour = targetIso.slice(0, 13);
  const exact = weather.hourly.findIndex((point) => point.time.slice(0, 13) === hour);
  if (exact >= 0) return exact;
  const next = weather.hourly.findIndex((point) => point.time.slice(0, 13) > hour);
  return next >= 0 ? next : weather.hourly.length - 1;
}

function hourScore(hour: HourlyPoint, activity: ActivityProfile): number {
  let score = 100;
  score -= hour.precipitationProbability * 0.55;
  score -= Math.min(38, hour.precipitation * 16);
  if (hour.windSpeed > activity.maxWindSpeed) {
    score -= Math.min(28, (hour.windSpeed - activity.maxWindSpeed) * 1.4);
  }
  if (hour.windGust > activity.maxWindSpeed + 15) {
    score -= Math.min(18, (hour.windGust - activity.maxWindSpeed - 15) * 0.8);
  }
  if (hour.apparentTemperature < activity.idealTempMin) {
    score -= Math.min(22, (activity.idealTempMin - hour.apparentTemperature) * 2.2);
  }
  if (hour.apparentTemperature > activity.idealTempMax) {
    score -= Math.min(24, (hour.apparentTemperature - activity.idealTempMax) * 2.4);
  }
  if (hour.uvIndex !== null && hour.uvIndex >= 8) {
    score -= (hour.uvIndex - 7) * 3;
  }
  if (activity.needsDryGround && hour.precipitation > 0.1) score -= 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildWindow(
  weather: WeatherData,
  startIndex: number,
  endIndex: number,
  activity: ActivityProfile,
): PlannerWindow | null {
  const start = weather.hourly[startIndex];
  const end = weather.hourly[endIndex];
  if (!start || !end) return null;
  const hours = weather.hourly.slice(startIndex, endIndex + 1);
  const wetHours = hours.filter(
    (hour) =>
      hour.precipitationProbability >= activity.maxPrecipProbability ||
      hour.precipitation >= Math.max(0.1, activity.maxPrecipAmount * 0.5),
  ).length;
  const maxProbability = Math.max(...hours.map((hour) => hour.precipitationProbability), 0);
  const totalPrecipitation = hours.reduce((total, hour) => total + hour.precipitation, 0);
  const score = Math.round(
    hours.reduce((total, hour) => total + hourScore(hour, activity), 0) / hours.length,
  );
  const verdict: PlannerVerdict =
    maxProbability >= 70
      ? "yes"
      : maxProbability >= activity.maxPrecipProbability
        ? "likely"
        : maxProbability >= activity.maxPrecipProbability * 0.5
          ? "unlikely"
          : "no";
  return {
    startIndex,
    endIndex,
    startIso: start.time,
    endIso: end.time,
    label: `${start.time.slice(11, 16)}–${end.time.slice(11, 16)}`,
    maxProbability,
    totalPrecipitation,
    dryHours: hours.length - wetHours,
    totalHours: hours.length,
    verdict,
    score,
  };
}

function bestWindows(
  weather: WeatherData,
  targetIndex: number,
  activity: ActivityProfile,
): PlannerWindow[] {
  const candidates: PlannerWindow[] = [];
  const first = Math.max(0, targetIndex - 6);
  const last = Math.min(weather.hourly.length - 3, targetIndex + 18);
  for (let start = first; start <= last; start += 1) {
    const window = buildWindow(weather, start, start + 2, activity);
    if (!window) continue;
    if (window.dryHours < window.totalHours) continue;
    if (window.score < 52) continue;
    candidates.push(window);
  }
  candidates.sort((a, b) => b.score - a.score || Math.abs(a.startIndex - targetIndex) - Math.abs(b.startIndex - targetIndex));

  const chosen: PlannerWindow[] = [];
  for (const window of candidates) {
    if (chosen.some((picked) => Math.abs(picked.startIndex - window.startIndex) < 3)) continue;
    chosen.push(window);
    if (chosen.length === 3) break;
  }
  return chosen.sort((a, b) => a.startIndex - b.startIndex);
}

function confidenceFor(daysAhead: number, mode: PlannerMode): number {
  let value: number;
  if (daysAhead <= 1) value = 95;
  else if (daysAhead <= 3) value = 90 - (daysAhead - 1) * 4;
  else if (daysAhead <= 7) value = 80 - (daysAhead - 3) * 5;
  else if (daysAhead <= 10) value = 55 - (daysAhead - 7) * 4;
  else value = 38 - Math.max(0, daysAhead - 10) * 2;
  if (mode === "range") value -= 4;
  return Math.max(25, Math.min(96, Math.round(value)));
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 75) return "plannerConfidenceHigh";
  if (confidence >= 50) return "plannerConfidenceMedium";
  return "plannerConfidenceLow";
}

function verdictKey(verdict: PlannerVerdict): TranslationKey {
  switch (verdict) {
    case "yes":
      return "plannerAnswerYes";
    case "likely":
      return "plannerAnswerLikely";
    case "unlikely":
      return "plannerAnswerUnlikely";
    default:
      return "plannerAnswerNo";
  }
}

function bodyKey(verdict: PlannerVerdict): TranslationKey {
  switch (verdict) {
    case "yes":
      return "plannerYesBody";
    case "likely":
      return "plannerLikelyBody";
    case "unlikely":
      return "plannerUnlikelyBody";
    default:
      return "plannerNoBody";
  }
}

function adviceFor(suitability: PlannerSuitability): TranslationKey {
  if (suitability === "go") return "plannerGo";
  if (suitability === "caution") return "plannerCaution";
  return "plannerAvoid";
}

export function evaluatePlanner(weather: WeatherData, input: PlannerInput): PlannerResult | null {
  if (!weather.hourly.length) return null;
  const bounds = plannerBounds(weather);
  if (input.date < bounds.minDate || input.date > bounds.maxDate) return null;

  const targetIso = `${input.date}T${input.time.slice(0, 5)}:00`;
  const targetIndex = findHourIndex(weather, targetIso);
  const hour = weather.hourly[targetIndex];
  if (!hour) return null;

  const activity = activityProfile(input.activity);
  const daysAhead = Math.max(0, diffIsoDates(input.date, bounds.today));
  const confidence = confidenceFor(daysAhead, input.mode);
  const probability = hour.precipitationProbability;
  const amount = hour.precipitation;

  const verdict: PlannerVerdict =
    probability >= Math.max(65, activity.maxPrecipProbability + 20) ||
    amount >= activity.maxPrecipAmount * 1.5
      ? "yes"
      : probability >= activity.maxPrecipProbability ||
          amount >= activity.maxPrecipAmount * 0.7
        ? "likely"
        : probability >= activity.maxPrecipProbability * 0.5 || amount > 0.05
          ? "unlikely"
          : "no";

  const reasons: PlannerReason[] = [];
  const rainKey: TranslationKey =
    probability >= 70 || amount >= 1.2
      ? "planReasonHeavy"
      : probability >= activity.maxPrecipProbability || amount >= 0.2
        ? "planReasonRain"
        : probability >= activity.maxPrecipProbability * 0.5
          ? "planReasonChance"
          : "planReasonDry";
  reasons.push({
    key: rainKey,
    tone: rainKey === "planReasonDry" ? "good" : rainKey === "planReasonChance" ? "info" : "caution",
  });

  if (hour.windGust >= activity.maxWindSpeed + 18) {
    reasons.push({
      key: "planReasonGusty",
      vars: { value: Math.round(hour.windGust) },
      tone: "caution",
    });
  } else if (hour.windSpeed >= activity.maxWindSpeed) {
    reasons.push({
      key: "planReasonWindy",
      vars: { value: Math.round(hour.windSpeed) },
      tone: "caution",
    });
  }

  if (hour.apparentTemperature > activity.idealTempMax + 3) {
    reasons.push({
      key: "planReasonHot",
      vars: { temp: Math.round(hour.apparentTemperature) },
      tone: "caution",
    });
  } else if (hour.apparentTemperature < activity.idealTempMin - 3) {
    reasons.push({
      key: "planReasonCold",
      vars: { temp: Math.round(hour.apparentTemperature) },
      tone: "caution",
    });
  }

  if (hour.uvIndex !== null && hour.uvIndex >= 7 && activity.id !== "commute") {
    reasons.push({ key: "planReasonUv", tone: "caution" });
  }

  if (activity.needsDryGround) {
    const prior = weather.hourly.slice(Math.max(0, targetIndex - 6), targetIndex);
    const priorRain = prior.reduce((sum, point) => sum + point.precipitation, 0);
    if (priorRain >= 0.8) {
      reasons.push({ key: "planReasonDryGround", tone: "info" });
    }
  }

  if (confidence < 50) {
    reasons.push({ key: "planReasonConfidence", tone: "info" });
  }

  const windows = bestWindows(weather, targetIndex, activity);
  const nearestWindow = windows[0];
  if (nearestWindow && Math.abs(nearestWindow.startIndex - targetIndex) >= 2) {
    reasons.push({
      key: "planReasonClearWindow",
      vars: { time: nearestWindow.startIso },
      tone: "good",
    });
  } else if (!nearestWindow) {
    reasons.push({ key: "planReasonNoWindow", tone: "info" });
  }

  if (activity.notesKey) {
    reasons.push({ key: activity.notesKey, tone: "info" });
  }

  const suitability: PlannerSuitability =
    verdict === "yes"
      ? "avoid"
      : reasons.some((reason) => reason.tone === "caution")
        ? "caution"
        : verdict === "likely"
          ? "caution"
          : "go";

  const start = Math.max(0, targetIndex - 3);
  const endTarget = input.mode === "range"
    ? findHourIndex(weather, `${input.endDate}T${input.endTime.slice(0, 5)}:00`)
    : targetIndex;
  // A range from 12:00 to 15:00 covers the 12:00, 13:00 and 14:00 forecast
  // hours, so the selected end hour is exclusive whenever it is later than the
  // start. A same-hour range still describes one hour.
  const rangeEndIndex =
    endTarget > targetIndex ? endTarget - 1 : Math.max(targetIndex, endTarget);
  const end = Math.min(weather.hourly.length - 1, Math.max(endTarget, targetIndex) + 6);
  const slots: PlannerSlot[] = weather.hourly.slice(start, end + 1).map((point) => ({
    time: point.time,
    temperature: point.temperature,
    precipitationProbability: point.precipitationProbability,
    precipitation: point.precipitation,
    windSpeed: point.windSpeed,
    weatherCode: point.conditionCode,
    score: hourScore(point, activity),
  }));

  const range =
    input.mode === "range"
      ? buildWindow(weather, targetIndex, rangeEndIndex, activity)
      : null;

  const assessment: PlannerAssessment = {
    verdict,
    verdictKey: verdictKey(verdict),
    headlineKey: bodyKey(verdict),
    probability,
    precipitation: amount,
    temperature: hour.temperature,
    feelsLike: hour.apparentTemperature,
    windSpeed: hour.windSpeed,
    windGust: hour.windGust,
    uvIndex: hour.uvIndex,
    cloudCover: hour.cloudCover,
    confidence,
    confidenceLabelKey: confidenceLabel(confidence),
    reasons: reasons.slice(0, 5),
    adviceKey: adviceFor(suitability),
    suitability,
    activityId: activity.id,
    targetIso: hour.time,
    daysAhead,
  };

  return {
    assessment,
    slots,
    timestamps: slots.map((slot) => localIsoToEpoch(slot.time, weather.meta.utcOffsetSeconds)),
    bestWindows: windows,
    range,
    date: input.date,
    time: input.time,
    endDate: input.endDate,
    endTime: input.endTime,
    mode: input.mode,
  };
}

export function plannerWindowIsWet(window: PlannerWindow): boolean {
  return window.dryHours < window.totalHours;
}

export function plannerDatesForShare(date: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDaysToIsoDate(date, index));
}
