"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/use-environment";
import { useI18n } from "@/i18n/provider";
import { springs } from "@/lib/motion";

export function OfflineBanner() {
  const online = useOnline();
  const { t } = useI18n();

  return (
    <AnimatePresence>
      {!online ? (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={springs.snappy}
          className="no-print fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+4.75rem)] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-solar/30 bg-[#1b1408]/90 px-4 py-2 text-xs font-semibold text-solar shadow-lg backdrop-blur-xl"
          role="status"
          aria-live="polite"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>{t("offline")}</span>
          <span className="hidden sm:inline text-solar/70">— {t("offlineBody")}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
