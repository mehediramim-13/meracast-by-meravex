"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Bug,
  Car,
  ChevronDown,
  Dumbbell,
  Fish,
  Flower2,
  Shirt,
  Sparkles,
  Sun,
  Telescope,
  Umbrella,
  Wind,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { GlassCard, WidgetHeader } from "@/components/ui/glass-card";
import { buildLifestyleIndices, type IndexTone, type LifestyleId, type LifestyleIndex } from "@/lib/indices";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { AirQualityData, WeatherData } from "@/types/weather";

const ICONS: Record<LifestyleId, typeof Sun> = {
  umbrella: Umbrella,
  sunscreen: Sun,
  jacket: Shirt,
  workout: Dumbbell,
  driving: Car,
  laundry: Shirt,
  carWash: Sparkles,
  allergy: Flower2,
  kite: Wind,
  fishing: Fish,
  stargazing: Telescope,
  mosquito: Bug,
};

const TONE_STYLES: Record<IndexTone, string> = {
  good: "border-aurora/20 bg-aurora/[0.045]",
  fair: "border-solar/20 bg-solar/[0.045]",
  poor: "border-danger/20 bg-danger/[0.045]",
};

const TONE_DOT: Record<IndexTone, string> = {
  good: "bg-aurora",
  fair: "bg-solar",
  poor: "bg-danger",
};

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  show: (order: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.36, delay: order * 0.04, ease: [0.22, 1, 0.36, 1] },
  }),
};

function PlaybookCard({ index, order }: { index: LifestyleIndex; order: number }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const Icon = ICONS[index.id];

  return (
    <motion.article
      custom={order}
      variants={reduceMotion ? undefined : CARD_VARIANTS}
      initial={reduceMotion ? false : undefined}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      transition={springs.snappy}
      className={cn(
        "flex h-full min-h-[6.75rem] min-w-0 flex-col rounded-xl border p-3",
        TONE_STYLES[index.tone],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line/10 bg-surface/45 text-muted">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span
          className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[index.tone])}
          aria-hidden="true"
        />
      </div>
      <p className="mt-2.5 line-clamp-2 min-h-[2.5em] text-[0.6875rem] font-semibold uppercase leading-[1.25] tracking-[0.08em] text-faint">
        {t(index.labelKey)}
      </p>
      <p className="mt-1 line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-snug text-ink">
        {t(index.verdictKey)}
      </p>
      <span className="sr-only">{t(index.adviceKey)}</span>
    </motion.article>
  );
}

function PlaybookGrid({
  items,
  animate,
  reduceMotion,
  visible = true,
}: {
  items: LifestyleIndex[];
  animate: "view" | "expand";
  reduceMotion: boolean;
  visible?: boolean;
}) {
  const motionProps = reduceMotion
    ? { initial: false, animate: "show" as const }
    : animate === "view"
      ? { initial: "hidden" as const, whileInView: "show" as const, viewport: { once: true, amount: 0.15 } }
      : { initial: "hidden" as const, animate: visible ? ("show" as const) : ("hidden" as const) };

  return (
    <motion.div
      className="grid auto-rows-fr grid-cols-2 gap-2 lg:grid-cols-3"
      {...motionProps}
    >
      {items.map((index, order) => (
        <PlaybookCard key={index.id} index={index} order={order} />
      ))}
    </motion.div>
  );
}

export function SuggestionsCard({
  weather,
  air,
}: {
  weather: WeatherData;
  air: AirQualityData | null | undefined;
}) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() ?? false;
  const [showMore, setShowMore] = useState(false);
  const indices = useMemo(() => buildLifestyleIndices(weather, air ?? null), [weather, air]);
  const primary = indices.slice(0, 6);
  const secondary = indices.slice(6);

  return (
    <GlassCard className="relative overflow-hidden">
      <WidgetHeader
        title={t("suggestions")}
        subtitle={t("suggestionsSubtitle")}
        icon={<Sparkles className="h-4 w-4" />}
        action={<Activity className="hidden h-4 w-4 text-faint sm:block" />}
      />

      <div className="mt-5">
        <PlaybookGrid items={primary} animate="view" reduceMotion={reduceMotion} />
      </div>

      {secondary.length ? (
        <>
          <button
            type="button"
            onClick={() => setShowMore((value) => !value)}
            aria-expanded={showMore}
            aria-controls="playbook-more"
            className="focus-ring mt-4 flex w-full items-center gap-2.5 rounded-lg py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-faint transition-colors hover:text-muted"
          >
            <span className="h-px flex-1 bg-line/10" aria-hidden="true" />
            <span>{showMore ? t("less") : t("more")}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                showMore && "rotate-180",
              )}
              aria-hidden="true"
            />
            <span className="h-px flex-1 bg-line/10" aria-hidden="true" />
          </button>

          <div
            id="playbook-more"
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
              showMore ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="pt-3">
                <PlaybookGrid
                  items={secondary}
                  animate="expand"
                  reduceMotion={reduceMotion}
                  visible={showMore}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </GlassCard>
  );
}
