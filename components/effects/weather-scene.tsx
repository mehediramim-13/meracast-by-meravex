"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/use-theme";
import { useDocumentVisibility } from "@/hooks/use-environment";
import { useSettings } from "@/store/use-settings";
import type { SceneKind } from "@/types/weather";
import { cn } from "@/lib/utils";

interface SceneProps {
  kind: SceneKind;
  intensity?: number;
  className?: string;
}

const isNight = (kind: SceneKind) => kind === "clear-night" || kind === "partly-night";
const isRainy = (kind: SceneKind) => kind === "rain" || kind === "heavy-rain" || kind === "storm";
const isSnowy = (kind: SceneKind) => kind === "snow";
const isCloudy = (kind: SceneKind) =>
  kind === "partly-day" || kind === "partly-night" || kind === "overcast" || isRainy(kind) || isSnowy(kind);

const STAR_POSITIONS = [
  [8, 16], [18, 9], [27, 23], [36, 7], [44, 18], [53, 11], [61, 26], [69, 6], [77, 19], [86, 12],
  [93, 27], [12, 34], [22, 42], [31, 31], [39, 47], [48, 36], [57, 45], [65, 33], [73, 44], [81, 36],
  [89, 48], [6, 53], [16, 61], [26, 52], [35, 66], [43, 58], [52, 69], [60, 55], [70, 63], [78, 58],
  [88, 68], [97, 55], [10, 76], [21, 72], [30, 82], [40, 78], [50, 84], [59, 76], [68, 82], [76, 74],
  [85, 86], [94, 79], [14, 24], [33, 15], [55, 20], [72, 29], [91, 39], [7, 43],
] as const;

function Stars({ reduced }: { reduced: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {STAR_POSITIONS.map(([left, top], index) => (
        <span
          key={`${left}-${top}`}
          className="star"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: index % 7 === 0 ? 3 : index % 3 === 0 ? 2.5 : 2,
            height: index % 7 === 0 ? 3 : index % 3 === 0 ? 2.5 : 2,
            opacity: 0.4,
            animationDelay: reduced ? undefined : `${(index % 11) * 0.45}s`,
            ["--star-duration" as string]: `${4 + (index % 5)}s`,
            animationPlayState: reduced ? "paused" : undefined,
          }}
        />
      ))}
      {!reduced ? (
        <>
          <span className="shooting-star shooting-star-a" />
          <span className="shooting-star shooting-star-b" />
        </>
      ) : null}
    </div>
  );
}

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
  opacity: number;
  drift: number;
}

interface SnowFlake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  opacity: number;
}

interface Splash {
  x: number;
  y: number;
  radius: number;
  life: number;
}

function PrecipitationCanvas({ kind }: { kind: SceneKind }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceSystem = useReducedMotion();
  const reduceSetting = useSettings((state) => state.reduceMotion);
  const performanceMode = useSettings((state) => state.performanceMode);
  const visible = useDocumentVisibility();
  const { resolved } = useTheme();
  const reduce = reduceSystem || reduceSetting || performanceMode;

  useEffect(() => {
    if (reduce || !visible || (!isRainy(kind) && !isSnowy(kind))) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let frame = 0;
    let lastTime = performance.now();
    let raf = 0;
    let running = true;

    const light = resolved === "light";
    const rainColor = light ? "37, 82, 120" : "186, 219, 255";
    const snowColor = light ? "255, 255, 255" : "240, 249, 255";

    const lowTier = window.innerWidth < 700 || (navigator.hardwareConcurrency ?? 8) <= 4;
    const count = isSnowy(kind) ? (lowTier ? 40 : 72) : kind === "heavy-rain" || kind === "storm" ? (lowTier ? 70 : 130) : (lowTier ? 45 : 85);

    let drops: RainDrop[] = [];
    let flakes: SnowFlake[] = [];
    let splashes: Splash[] = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      if (isSnowy(kind)) {
        flakes = Array.from({ length: count }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.8 + Math.random() * 2.4,
          speed: 14 + Math.random() * 32,
          drift: 8 + Math.random() * 26,
          phase: Math.random() * Math.PI * 2,
          opacity: 0.35 + Math.random() * 0.55,
        }));
      } else {
        drops = Array.from({ length: count }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          len: 9 + Math.random() * 22,
          speed: 520 + Math.random() * 680,
          opacity: 0.16 + Math.random() * 0.36,
          drift: 40 + Math.random() * 90,
        }));
        splashes = [];
      }
    };

    resize();
    seed();

    const onResize = () => {
      resize();
      seed();
    };

    window.addEventListener("resize", onResize, { passive: true });

    const draw = (time: number) => {
      if (!running) return;
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      context.clearRect(0, 0, width, height);

      if (isSnowy(kind)) {
        for (const flake of flakes) {
          flake.phase += delta * 1.6;
          flake.y += flake.speed * delta;
          flake.x += Math.sin(flake.phase) * flake.drift * delta;
          if (flake.y > height + 6) {
            flake.y = -8;
            flake.x = Math.random() * width;
          }
          if (flake.x > width + 8) flake.x = -8;
          if (flake.x < -8) flake.x = width + 8;
          context.beginPath();
          context.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
          context.fillStyle = `rgba(${snowColor}, ${flake.opacity})`;
          context.fill();
        }
      } else {
        const heavy = kind === "heavy-rain" || kind === "storm";
        for (const drop of drops) {
          drop.y += drop.speed * delta;
          drop.x += drop.drift * delta;
          if (drop.y > height + drop.len || drop.x > width + 20) {
            drop.y = -drop.len - Math.random() * 60;
            drop.x = Math.random() * (width + 100) - 100;
          }
          context.beginPath();
          context.strokeStyle = `rgba(${rainColor}, ${drop.opacity})`;
          context.lineWidth = heavy ? 1.5 : 1.1;
          context.moveTo(drop.x, drop.y);
          context.lineTo(drop.x - drop.drift * 0.012, drop.y - drop.len);
          context.stroke();
        }

        if (!light && Math.random() < 0.16 && splashes.length < 16) {
          splashes.push({
            x: Math.random() * width,
            y: height * (0.55 + Math.random() * 0.4),
            radius: 1,
            life: 1,
          });
        }

        contextual: {
          for (const splash of splashes) {
            splash.life -= delta * 1.8;
            splash.radius += delta * 18;
            if (splash.life <= 0) continue;
            context.beginPath();
            context.strokeStyle = `rgba(${rainColor}, ${splash.life * 0.16})`;
            context.lineWidth = 0.8;
            context.ellipse(splash.x, splash.y, splash.radius, splash.radius * 0.32, 0, 0, Math.PI * 2);
            context.stroke();
          }
          splashes = splashes.filter((splash) => splash.life > 0);
        }
      }

      frame += 1;
      if (frame % 300 === 0) {
        seed();
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [kind, reduce, visible, resolved]);

  if (reduce || (!isRainy(kind) && !isSnowy(kind))) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="scene-particle-canvas pointer-events-none absolute inset-0 z-[3] h-full w-full opacity-55"
    />
  );
}

function Clouds({ kind }: { kind: SceneKind }) {
  if (!isCloudy(kind)) return null;
  const heavy = kind === "overcast" || isRainy(kind) || isSnowy(kind);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      <div
        className="scene-cloud scene-cloud-a"
        style={{
          width: "62vw",
          height: "40vh",
          left: "-14%",
          top: "4%",
          opacity: heavy ? 0.24 : 0.14,
          background:
            "radial-gradient(45% 55% at 40% 45%, rgba(238, 247, 255, 0.5), transparent 70%), radial-gradient(40% 45% at 66% 55%, rgba(205, 226, 245, 0.34), transparent 72%)",
          filter: "blur(26px)",
          ["--cloud-opacity" as string]: heavy ? 0.24 : 0.14,
        }}
      />
      <div
        className="scene-cloud scene-cloud-b hidden sm:block"
        style={{
          width: "72vw",
          height: "44vh",
          right: "-18%",
          top: "18%",
          opacity: heavy ? 0.18 : 0.1,
          background:
            "radial-gradient(45% 50% at 55% 45%, rgba(228, 240, 252, 0.4), transparent 72%), radial-gradient(35% 40% at 30% 60%, rgba(195, 218, 238, 0.28), transparent 74%)",
          filter: "blur(34px)",
          ["--cloud-opacity" as string]: heavy ? 0.18 : 0.1,
        }}
      />
      <div
        className="scene-cloud scene-cloud-c"
        style={{
          width: "80vw",
          height: "34vh",
          left: "8%",
          bottom: "-6%",
          opacity: heavy ? 0.16 : 0.08,
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(220, 236, 250, 0.36), transparent 72%)",
          filter: "blur(40px)",
          ["--cloud-opacity" as string]: heavy ? 0.16 : 0.08,
        }}
      />
    </div>
  );
}

function SceneContent({ kind, reduced }: { kind: SceneKind; reduced: boolean }) {
  return (
    <>
      <div className="scene-gradient absolute inset-0" />
      <Clouds kind={kind} />
      {isNight(kind) ? <Stars reduced={reduced} /> : null}
      {isRainy(kind) || isSnowy(kind) ? <PrecipitationCanvas kind={kind} /> : null}
      {kind === "snow" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[30vh] bg-gradient-to-t from-white/25 to-transparent" />
      ) : null}
      {kind === "fog" ? (
        <>
          <div className="fog-layer z-[2]" />
          <div className="fog-layer fog-layer-b z-[2]" />
        </>
      ) : null}
      <div className="scene-veil absolute inset-0 z-[5]" />
      <div className="grain absolute inset-0 z-[6]" />
    </>
  );
}

export function WeatherScene({ kind, intensity = 0, className }: SceneProps) {
  const reduceSystem = useReducedMotion();
  const reduceSetting = useSettings((state) => state.reduceMotion);
  const reduced = Boolean(reduceSystem || reduceSetting);
  const key = `${kind}-${reduced ? "still" : "live"}`;

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={key}
        className={cn("scene fixed inset-0 z-0 overflow-hidden", className)}
        data-kind={kind}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        aria-hidden="true"
        data-intensity={intensity}
      >
        <SceneContent kind={kind} reduced={reduced} />
      </motion.div>
    </AnimatePresence>
  );
}

export function Backdrop({ kind, intensity }: { kind: SceneKind; intensity?: number }) {
  return <WeatherScene kind={kind} intensity={intensity} />;
}
