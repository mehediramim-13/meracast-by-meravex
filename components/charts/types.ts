export type ChartMode = "temperature" | "precipitation" | "wind";

export interface HourlyChartPoint {
  time: string;
  label: string;
  axisLabel: string;
  temp: number;
  rain: number;
  wind: number;
  conditionLabel: string;
}
