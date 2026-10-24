"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CloudFog,
  Droplets,
  ShieldCheck,
  Snowflake,
  Thermometer,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useFormat } from "@/hooks/use-format";
import { Badge } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/en";
import type { WeatherAlert } from "@/types/weather";

const ICONS: Record<WeatherAlert["icon"], typeof Droplets> = {
  rain: Droplets,
  storm: Zap,
  heat: Thermometer,
  wind: Wind,
  flood: Waves,
  fog: CloudFog,
  cold: Snowflake,
};

const SEVERITY_STYLES: Record<WeatherAlert["severity"], string> = {
  advisory: "border-ice/20 bg-ice/[0.06]",
  watch: "border-solar/25 bg-solar/[0.07]",
  warning: "border-danger/25 bg-danger/[0.07]",
  severe: "border-danger/40 bg-danger/[0.11]",
};

const SEVERITY_TONE: Record<WeatherAlert["severity"], "ice" | "solar" | "danger"> = {
  advisory: "ice",
  watch: "solar",
  warning: "danger",
  severe: "danger",
};

const SEVERITY_LABEL: Record<WeatherAlert["severity"], TranslationKey> = {
  advisory: "alertAdvisory",
  watch: "alertWatch",
  warning: "alertWarning",
  severe: "alertSevere",
};

export function AlertsBanner({ alerts }: { alerts: WeatherAlert[] }) {
  const { t } = useI18n();
  const format = useFormat();
  const [open, setOpen] = useState(true);

  if (!alerts.length) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-aurora/15 bg-aurora/[0.05] px-4 py-2.5 text-xs text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-aurora" />
        <span className="font-semibold text-ink">{t("alertNone")}</span>
        <span className="hidden text-faint sm:inline">— {t("alertNoneBody")}</span>
      </div>
    );
  }

  return (
    <section aria-labelledby="alerts-heading" className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-solar" />
          <h2 id="alerts-heading" className="text-sm font-bold tracking-[-0.02em] text-ink">
            {t("alerts")}
          </h2>
          <Badge tone="solar">{format.num(alerts.length)}</Badge>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="pressable focus-ring rounded-lg px-2 py-1 text-xs font-semibold text-muted transition-colors hover:text-ink"
        >
          {open ? t("less") : t("more")}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-4">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
            <p className="mt-1 px-1 text-xs leading-relaxed text-faint">{t("alertSource")}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function AlertCard({ alert }: { alert: WeatherAlert }) {
  const { t } = useI18n();
  const format = useFormat();
  const Icon = ICONS[alert.icon];
  const vars: Record<string, string> = { ...alert.values };
  if (alert.metrics?.amount !== undefined) vars.amount = format.precip(alert.metrics.amount);
  if (alert.metrics?.wind !== undefined) vars.value = format.wind(alert.metrics.wind);
  if (alert.metrics?.temperature !== undefined) vars.value = format.temp(alert.metrics.temperature);
  if (alert.metrics?.visibility !== undefined) vars.value = format.visibility(alert.metrics.visibility / 1000);

  return (
    <article
      className={cn(
        "relative w-[min(88vw,22rem)] shrink-0 overflow-hidden rounded-2xl border p-3.5 backdrop-blur-md sm:w-auto",
        SEVERITY_STYLES[alert.severity],
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line/15 bg-surface-lift">
          <Icon className="h-4 w-4 text-solar" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13px] font-bold leading-snug text-ink">
              {t(alert.titleKey as TranslationKey)}
            </h3>
            <Badge tone={SEVERITY_TONE[alert.severity]} className="shrink-0">
              {t(SEVERITY_LABEL[alert.severity])}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t(alert.detailKey as TranslationKey, vars)}
          </p>
          <p className="mt-2 text-xs font-medium text-faint">
            {format.shortDateTime(alert.startsAt)} · {format.time(alert.startsAt)}–{format.time(alert.endsAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
