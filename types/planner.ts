export type PlannerVerdict = "yes" | "likely" | "unlikely" | "no";

export type PlannerMode = "single" | "range";

export type PlannerSuitability = "go" | "caution" | "avoid";

export type ActivityId =
  | "general"
  | "cricket"
  | "picnic"
  | "wedding"
  | "commute"
  | "travel"
  | "hiking"
  | "photography"
  | "outdoor-shoot"
  | "fishing"
  | "kite-flying";

export interface ActivityProfile {
  id: ActivityId;
  labelKey: string;
  descKey: string;
  maxPrecipProbability: number;
  maxPrecipAmount: number;
  maxWindSpeed: number;
  idealTempMin: number;
  idealTempMax: number;
  minUv?: number;
  maxUv?: number;
  needsDryGround?: boolean;
  notesKey: string;
}

export interface PlannerReason {
  key: string;
  vars?: Record<string, string | number>;
  tone: "good" | "info" | "caution";
}

export interface PlannerAssessment {
  verdict: PlannerVerdict;
  verdictKey: string;
  headlineKey: string;
  probability: number;
  precipitation: number;
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  windGust: number;
  uvIndex: number | null;
  cloudCover: number;
  confidence: number;
  confidenceLabelKey: string;
  reasons: PlannerReason[];
  adviceKey: string;
  suitability: PlannerSuitability;
  activityId: ActivityId;
  targetIso: string;
  daysAhead: number;
}

export interface PlannerWindow {
  startIndex: number;
  endIndex: number;
  startIso: string;
  endIso: string;
  label: string;
  maxProbability: number;
  totalPrecipitation: number;
  dryHours: number;
  totalHours: number;
  verdict: PlannerVerdict;
  score: number;
}

export interface PlannerSlot {
  time: string;
  temperature: number;
  precipitationProbability: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  score: number;
}

export interface PlannerResult {
  assessment: PlannerAssessment;
  slots: PlannerSlot[];
  timestamps: number[];
  bestWindows: PlannerWindow[];
  range: PlannerWindow | null;
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  mode: PlannerMode;
}

export interface PlannerInput {
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  mode: PlannerMode;
  activity: ActivityId;
}

export interface PlannerUrlState {
  date?: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  mode?: PlannerMode;
  activity?: ActivityId;
}

export interface PlannerLocation {
  place: import("./geo").Place;
}

export interface CompareEntry {
  place: import("./geo").Place;
}
