"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/store/use-settings";
import type { WeatherIconKind } from "@/types/weather";

interface WeatherIconProps {
  kind: WeatherIconKind;
  isDay?: boolean;
  className?: string;
  animated?: boolean;
  size?: number;
}

const RAIN_DROPS = [
  { x: 34, delay: 0 },
  { x: 47, delay: 0.25 },
  { x: 60, delay: 0.5 },
  { x: 73, delay: 0.15 },
];

const SNOW_FLAKES = [
  { x: 35, y: 83, delay: 0 },
  { x: 48, y: 91, delay: 0.9 },
  { x: 61, y: 80, delay: 0.4 },
  { x: 73, y: 88, delay: 1.2 },
];

export function WeatherIcon({
  kind,
  isDay = true,
  className,
  animated = true,
  size = 96,
}: WeatherIconProps) {
  const id = useId().replace(/:/g, "");
  const reduceSystem = useReducedMotion();
  const reduceSetting = useSettings((state) => state.reduceMotion);
  const reduce = reduceSystem || reduceSetting || !animated;

  const showSun = kind === "clear" || kind === "partly" || kind === "haze";
  const showCloud =
    kind === "partly" ||
    kind === "cloudy" ||
    kind === "overcast" ||
    kind === "rain" ||
    kind === "heavy-rain" ||
    kind === "drizzle" ||
    kind === "storm" ||
    kind === "snow" ||
    kind === "sleet" ||
    kind === "fog" ||
    kind === "haze";
  const showRain = kind === "rain" || kind === "heavy-rain" || kind === "drizzle" || kind === "storm" || kind === "sleet";
  const showSnow = kind === "snow" || kind === "sleet";
  const showLightning = kind === "storm";
  const heavy = kind === "heavy-rain" || kind === "overcast";

  const sunX = showCloud ? 67 : 48;
  const sunY = showCloud ? 32 : 46;
  const sunR = showCloud ? 13 : 19;

  const cloudGradient = `cloud-${id}`;
  const sunGradient = `sun-${id}`;
  const rainGradient = `rain-${id}`;

  const cloudFill = isDay ? `url(#${cloudGradient})` : `url(#${cloudGradient})`;

  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={cn("select-none overflow-visible", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={cloudGradient} x1="22" y1="34" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDay ? "#FBFFFF" : "#D7E4F7"} />
          <stop offset="0.55" stopColor={isDay ? "#D8E8F8" : "#9EB4D1"} stopOpacity="0.96" />
          <stop offset="1" stopColor={isDay ? "#AFCBE4" : "#7189AC"} stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id={sunGradient} x1="34" y1="18" x2="72" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF3C4" />
          <stop offset="0.55" stopColor="#FFD37A" />
          <stop offset="1" stopColor="#FFAE5D" />
        </linearGradient>
        <linearGradient id={rainGradient} x1="40" y1="68" x2="60" y2="94" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8AB4FF" />
          <stop offset="1" stopColor="#5B8FF0" />
        </linearGradient>
      </defs>

      {showSun ? (
        <motion.g
          style={{ transformOrigin: `${sunX}px ${sunY}px` }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 80, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        >
          {Array.from({ length: 8 }).map((_, index) => {
            const angle = (index / 8) * Math.PI * 2;
            const inner = sunR + 5;
            const outer = sunR + 11;
            return (
              <motion.line
                key={index}
                x1={sunX + Math.cos(angle) * inner}
                y1={sunY + Math.sin(angle) * inner}
                x2={sunX + Math.cos(angle) * outer}
                y2={sunY + Math.sin(angle) * outer}
                stroke="#FFD37A"
                strokeWidth="2.6"
                strokeLinecap="round"
                animate={reduce ? { opacity: 0.85 } : { opacity: [0.45, 0.95, 0.45] }}
                transition={{ duration: 4, delay: index * 0.15, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
            );
          })}
        </motion.g>
      ) : null}

      {showSun ? (
        isDay ? (
          <motion.circle
            cx={sunX}
            cy={sunY}
            r={sunR}
            fill={`url(#${sunGradient})`}
            animate={reduce ? undefined : { scale: [1, 1.025, 1] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            style={{ transformOrigin: `${sunX}px ${sunY}px` }}
          />
        ) : (
          <g>
            <circle cx={sunX} cy={sunY} r={sunR} fill="#E7EEFF" />
            <circle cx={sunX + sunR * 0.55} cy={sunY - sunR * 0.2} r={sunR * 0.92} fill={isDay ? "#D7E4F7" : "#132238"} />
          </g>
        )
      ) : null}

      {showCloud ? (
        <motion.g
          animate={reduce ? undefined : { x: [-1.5, 1.5, -1.5], y: [0, -1.5, 0] }}
          transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          {showSun && isDay ? (
            <circle cx="70" cy="30" r="21" fill="#FFD27A" opacity="0.14" />
          ) : null}
          <g fill={cloudFill}>
            <circle cx="34" cy="58" r="15" />
            <circle cx="49" cy="46" r="21" />
            <circle cx="68" cy="55" r="17" />
            <circle cx="80" cy="64" r="11" />
            <rect x="26" y="58" width="58" height="17" rx="8.5" />
          </g>
          <g fill="#FFFFFF" opacity={isDay ? 0.42 : 0.18}>
            <ellipse cx="50" cy="42" rx="13" ry="8" />
            <ellipse cx="34" cy="52" rx="8" ry="5" />
          </g>
          {heavy ? (
            <g fill="#7E98B8" opacity="0.5">
              <circle cx="42" cy="62" r="10" />
              <circle cx="63" cy="64" r="12" />
              <rect x="34" y="62" width="38" height="12" rx="6" />
            </g>
          ) : null}
        </motion.g>
      ) : null}

      {showRain
        ? RAIN_DROPS.slice(0, heavy ? 4 : 3).map((drop) => (
            <motion.line
              key={drop.x}
              x1={drop.x}
              y1="75"
              x2={drop.x - 2.5}
              y2="89"
              stroke={`url(#${rainGradient})`}
              strokeWidth="3.2"
              strokeLinecap="round"
              animate={reduce ? { opacity: 0.8 } : { y: [0, 7], opacity: [0, 0.95, 0] }}
              transition={{
                duration: heavy ? 0.55 : 0.85,
                delay: drop.delay,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeIn",
              }}
            />
          ))
        : null}

      {showSnow
        ? SNOW_FLAKES.map((flake) => (
            <motion.circle
              key={`${flake.x}-${flake.y}`}
              cx={flake.x}
              cy={flake.y}
              r="2.8"
              fill="#EDF6FF"
              animate={reduce ? { opacity: 0.9 } : { y: [-2, 8], opacity: [0, 1, 0.2] }}
              transition={{
                duration: 2.4,
                delay: flake.delay,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          ))
        : null}

      {showLightning ? (
        <motion.path
          d="M53 68L45 82H54L48 94L64 77H55L61 68H53Z"
          fill="#FFD37A"
          animate={reduce ? { opacity: 0.9 } : { opacity: [0.25, 1, 0.4, 1, 0.25] }}
          transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, times: [0, 0.06, 0.12, 0.18, 1], repeatDelay: 2 }}
        />
      ) : null}

      {kind === "fog" || kind === "haze" || kind === "cloudy" ? (
        <g stroke={isDay ? "#C7D7E8" : "#90A6C2"} strokeWidth="3.4" strokeLinecap="round" opacity="0.8">
          <motion.line x1="28" y1="79" x2="70" y2="79" animate={reduce ? undefined : { x: [-3, 3, -3] }} transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }} />
          <motion.line x1="36" y1="87" x2="62" y2="87" animate={reduce ? undefined : { x: [3, -3, 3] }} transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }} />
        </g>
      ) : null}
    </svg>
  );
}
