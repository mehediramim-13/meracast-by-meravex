"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { useToast } from "@/store/use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { t } = useI18n();
  const toasts = useToast((state) => state.toasts);
  const dismiss = useToast((state) => state.dismiss);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm shadow-lift backdrop-blur-md",
              item.tone === "danger"
                ? "border-danger/25 bg-danger/10 text-ink"
                : item.tone === "success"
                  ? "border-aurora/25 bg-aurora/10 text-ink"
                  : "border-line/15 bg-surface/95 text-ink",
            )}
          >
            <span className="min-w-0 flex-1 leading-snug">{item.message}</span>
            {item.action ? (
              <button
                type="button"
                onClick={() => {
                  item.action?.onClick();
                  dismiss(item.id);
                }}
                className="focus-ring shrink-0 rounded-md px-1.5 py-1 text-xs font-bold text-aurora hover:bg-aurora/10"
              >
                {item.action.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label={t("close")}
              className="focus-ring shrink-0 rounded-md p-1 text-faint hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
