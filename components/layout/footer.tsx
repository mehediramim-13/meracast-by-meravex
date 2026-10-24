"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/i18n/provider";
import { Logo } from "@/components/brand/logo";
import { SITE } from "@/lib/constants";
import { useSettings } from "@/store/use-settings";

const RAMIM_URL = "https://mehedi-hasan-ramim.vercel.app/";

const creditVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const creditLineVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut" as const },
  },
};

export function Footer() {
  const { t } = useI18n();
  const systemReduceMotion = useReducedMotion();
  const appReduceMotion = useSettings((state) => state.reduceMotion);
  const reduceMotion = systemReduceMotion || appReduceMotion;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-14 border-t border-line/10 pb-6 pt-8 lg:pb-10">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xs">
          <Logo size="md" showBrand />
          <p className="mt-3 font-heading text-lg font-semibold leading-snug tracking-[-0.01em] text-ink/85">
            {t("tagline")}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            {t("footerRights", { year })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-xs sm:grid-cols-3">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-faint">
              {t("navWeather")}
            </p>
            <ul className="space-y-2 text-muted">
              <li><Link href="/" className="transition-colors hover:text-ink">{t("navWeather")}</Link></li>
              <li><Link href="/rain-planner" className="transition-colors hover:text-ink">{t("navPlanner")}</Link></li>
              <li><Link href="/radar" className="transition-colors hover:text-ink">{t("navRadar")}</Link></li>
              <li><Link href="/settings" className="transition-colors hover:text-ink">{t("navSettings")}</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-faint">
              {t("dataSources")}
            </p>
            <ul className="space-y-2 text-muted">
              <li>
                <a href="https://open-meteo.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
                  {t("sourceOpenMeteo")}
                </a>
              </li>
              <li>
                <a href="https://www.rainviewer.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
                  {t("sourceRainViewer")}
                </a>
              </li>
              <li>
                <a href="https://openfreemap.org" target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
                  {t("sourceOpenFreeMap")}
                </a>
              </li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-faint">
              {t("brandStory")}
            </p>
            <p className="max-w-[13rem] leading-relaxed text-faint">{t("supportBody")}</p>
            <motion.div
              key={reduceMotion ? "credits-static" : "credits-motion"}
              className="mt-3 space-y-1.5 text-xs"
              variants={creditVariants}
              initial={reduceMotion ? "visible" : "hidden"}
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
            >
              <motion.p variants={creditLineVariants} className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted">{t("developedBy")}</span>
                <a
                  href={RAMIM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring rounded-sm font-semibold text-aurora transition-opacity hover:opacity-75"
                >
                  Ramim ↗
                </a>
              </motion.p>
              <motion.p variants={creditLineVariants} className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted">{t("poweredByName")}</span>
                <a
                  href={SITE.url}
                  className="focus-ring rounded-sm font-semibold text-aurora transition-opacity hover:opacity-75"
                >
                  MeraVex ↗
                </a>
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-2 border-t border-line/10 pt-4 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
        <span>{t("footerSources")}</span>
        <span className="flex items-center gap-3">
          <span>{t("poweredBy")}</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-muted">MeraCast by MeraVex</span>
        </span>
      </div>
    </footer>
  );
}
