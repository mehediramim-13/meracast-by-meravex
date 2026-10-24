"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, MonitorSmartphone, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import { STORAGE_KEYS } from "@/lib/constants";
import { useUI } from "@/store/use-ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.installDismissed);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < 1000 * 60 * 60 * 24 * 7;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const { t } = useI18n();
  const open = useUI((state) => state.installOpen);
  const setOpen = useUI((state) => state.setInstallOpen);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [footerNear, setFooterNear] = useState(false);

  useEffect(() => {
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setInstalled(isStandalone());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      if (!recentlyDismissed() && !isStandalone()) {
        window.setTimeout(() => setShowBanner(true), 5_000);
      }
    };
    const onInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
      setPromptEvent(null);
      setOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [setOpen]);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const latest = entries[entries.length - 1];
        if (latest) setFooterNear(latest.isIntersecting);
      },
      { threshold: 0.01 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const dismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem(STORAGE_KEYS.installDismissed, String(Date.now()));
    } catch {
      // Private mode can reject writes; dismissal still works for this session.
    }
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setShowBanner(false);
      setOpen(false);
    } else {
      dismiss();
    }
    setPromptEvent(null);
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && !installed && !footerNear ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="no-print fixed inset-x-3 bottom-[calc(6.2rem+env(safe-area-inset-bottom,0px))] z-[55] mx-auto max-w-md lg:bottom-5 lg:left-auto lg:right-6 lg:mx-0"
          >
            <div className="glass-strong relative overflow-hidden rounded-2xl border border-line/15 p-3.5">
              <div className="relative flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-aurora/20 bg-aurora/10 text-aurora">
                  <MonitorSmartphone className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{t("installTitle")}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{t("installBody")}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={() => void install()}>
                      <Download className="h-3.5 w-3.5" />
                      {t("install")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={dismiss}>
                      {t("installLater")}
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label={t("close")}
                  className="pressable flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-faint hover:bg-surface-quiet hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("installTitle")}
        description={t("installBody")}
        size="sm"
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t("installLater")}
            </Button>
            {promptEvent ? (
              <Button variant="primary" size="sm" onClick={() => void install()}>
                <Download className="h-3.5 w-3.5" />
                {t("install")}
              </Button>
            ) : (
              <span className="text-xs font-medium text-faint">{t("installed")}</span>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-line/15 bg-surface-quiet p-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-line/15 bg-surface-lift text-aurora">
              <MonitorSmartphone className="h-8 w-8" />
            </div>
            <p className="mt-3 font-heading text-xl font-semibold text-ink">{t("tagline")}</p>
            <p className="mt-1 text-xs text-muted">MeraCast by MeraVex</p>
          </div>
          <ul className="space-y-2 text-xs leading-relaxed text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora" />
              {t("offlineBody")}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-solar" />
              {t("installBody")}
            </li>
          </ul>
          {!promptEvent && !installed ? (
            <div className="rounded-xl border border-line/15 bg-surface-quiet px-3.5 py-3 text-xs leading-relaxed text-muted">
              <p className="flex items-center gap-1.5 font-semibold text-ink">
                <Share className="h-3.5 w-3.5 text-aurora" />
                {ios ? "Safari" : t("install")}
              </p>
              <p className="mt-1">{t("installInstructions")}</p>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
