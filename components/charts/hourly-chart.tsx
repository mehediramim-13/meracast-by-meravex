"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useId } from "react";
import type { ChartMode, HourlyChartPoint } from "@/components/charts/types";

interface HourlyChartProps {
  data: HourlyChartPoint[];
  mode: ChartMode;
  unitLabel: string;
  selectedTime: string;
  onSelect: (time: string) => void;
  emptyLabel: string;
  ariaLabel: string;
}

function modeValue(point: HourlyChartPoint, mode: ChartMode): number {
  if (mode === "precipitation") return point.rain;
  if (mode === "wind") return point.wind;
  return point.temp;
}

interface TooltipPayloadEntry {
  payload?: HourlyChartPoint;
}

function ChartTooltip({
  active,
  payload,
  mode,
  unitLabel,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  mode: ChartMode;
  unitLabel: string;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const value = modeValue(point, mode);
  return (
    <div className="rounded-xl border border-white/10 bg-[#08121e]/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-xl">
      <p className="font-semibold text-white/60">{point.label}</p>
      <p className="mt-1 text-sm font-bold tabular">
        {value}
        {mode === "precipitation" ? "%" : mode === "wind" ? ` ${unitLabel}` : `°`}
      </p>
      <p className="mt-0.5 text-xs text-white/40">{point.conditionLabel}</p>
    </div>
  );
}

export function HourlyChart({
  data,
  mode,
  unitLabel,
  selectedTime,
  onSelect,
  emptyLabel,
  ariaLabel,
}: HourlyChartProps) {
  const gradientId = useId().replace(/:/g, "");

  if (!data.length) {
    return (
      <div className="flex h-[13.5rem] items-center justify-center rounded-2xl border border-dashed border-line/15 text-xs text-muted">
        {emptyLabel}
      </div>
    );
  }

  const color = mode === "precipitation" ? "rgb(var(--c-rain))" : mode === "wind" ? "rgb(var(--c-aurora))" : "rgb(var(--c-solar))";
  const label = data.find((point) => point.time === selectedTime)?.label ?? "";

  return (
    <div className="h-[13.5rem] w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 10, left: -18, bottom: 0 }}
          onClick={(state) => {
            const time = state?.activeLabel;
            if (typeof time === "string") onSelect(time);
          }}
        >
          <defs>
            <linearGradient id={`hourly-area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 8"
            vertical={false}
            stroke="rgb(var(--c-line) / 0.12)"
          />
          <XAxis
            dataKey="time"
            tickFormatter={(value: string) => data.find((point) => point.time === value)?.axisLabel ?? ""}
            tick={{ fill: "rgb(var(--c-faint))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
            interval="preserveStartEnd"
          />
          <YAxis
            width={40}
            domain={
              mode === "precipitation"
                ? [0, 100]
                : mode === "temperature"
                  ? ["dataMin - 2", "dataMax + 2"]
                  : [0, "dataMax + 5"]
            }
            tick={{ fill: "rgb(var(--c-faint))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${Math.round(value)}`}
          />
          <Tooltip
            cursor={{ stroke: "rgb(var(--c-line) / 0.35)", strokeWidth: 1 }}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={props.payload as TooltipPayloadEntry[] | undefined}
                mode={mode}
                unitLabel={unitLabel}
              />
            )}
          />
          {label ? (
            <ReferenceLine
              x={selectedTime}
              stroke={color}
              strokeOpacity={0.4}
              strokeDasharray="4 4"
            />
          ) : null}
          <Area
            type="monotone"
            dataKey={mode === "precipitation" ? "rain" : mode === "wind" ? "wind" : "temp"}
            stroke={color}
            strokeWidth={2.4}
            fill={`url(#hourly-area-${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--c-surface))", fill: color }}
            isAnimationActive
            animationDuration={650}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
