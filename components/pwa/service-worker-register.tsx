"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";

const VERSION_URL = "/version.json";
const VERSION_STORAGE_KEY = "meracast:app-version";
const CLEANUP_RELOAD_KEY = "meracast:sw-cleanup-reload";
const APP_CACHE_PREFIX = "meracast-";

function getStorage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readStorage(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | null, key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Private browsing and disabled storage must not block registration.
  }
}

function removeStorage(storage: Storage | null, key: string) {
  try {
    storage?.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

async function readBuildVersion(): Promise<string | null> {
  try {
    const response = await fetch(VERSION_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { version?: unknown };
    return typeof data.version === "string" && data.version.length > 0 ? data.version : null;
  } catch {
    return null;
  }
}

async function unregisterWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
  } catch {
    // Registration may be unavailable in locked-down browser profiles.
  }
}

async function clearCaches(appOnly: boolean) {
  if (!("caches" in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => !appOnly || key.startsWith(APP_CACHE_PREFIX))
        .map((key) => caches.delete(key).catch(() => false)),
    );
  } catch {
    // A blocked Cache API must not prevent a fresh registration.
  }
}

function controllerVersion(): string | null {
  const controller = navigator.serviceWorker.controller;
  if (!controller) return null;
  try {
    return new URL(controller.scriptURL).searchParams.get("v");
  } catch {
    return null;
  }
}

/**
 * Registers the production service worker and surfaces a waiting update
 * without reloading a first-install session. A build version change triggers
 * a one-time unregister/cache cleanup so a stale shell can never keep serving
 * HTML that points at deleted hashed CSS or JS.
 */
export function ServiceWorkerRegister() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [updateReady, setUpdateReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    let reloading = false;

    const clearUpdateTimeout = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const markWaiting = (worker: ServiceWorker | null) => {
      if (cancelled || !worker || !navigator.serviceWorker.controller) return;
      waitingRef.current = worker;
      setUpdateReady(true);
      setApplying(false);
      clearUpdateTimeout();
    };

    const watchWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      if (worker.state === "installed") {
        markWaiting(worker);
        return;
      }
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") markWaiting(worker);
      });
    };

    const checkRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) markWaiting(registration.waiting);
      if (registration.installing) watchWorker(registration.installing);
    };

    const checkForUpdate = () => {
      const registration = registrationRef.current;
      if (!registration || document.visibilityState === "hidden") return;
      void registration
        .update()
        .then(() => checkRegistration(registration))
        .catch(() => undefined);
    };

    const onControllerChange = () => {
      if (cancelled || reloading || !reloadRef.current) return;
      reloading = true;
      window.location.reload();
    };

    const register = async (version: string) => {
      try {
        const registration = await navigator.serviceWorker.register(
          `/sw.js?v=${encodeURIComponent(version)}`,
          { scope: "/", updateViaCache: "none" },
        );
        if (cancelled) return;
        registrationRef.current = registration;
        checkRegistration(registration);
        registration.addEventListener("updatefound", () => {
          watchWorker(registration.installing);
        });
        window.setTimeout(checkForUpdate, 5_000);
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    const cleanupForDevelopment = async () => {
      const registrations = await navigator.serviceWorker
        .getRegistrations()
        .catch(() => [] as ServiceWorkerRegistration[]);
      const hadController = Boolean(navigator.serviceWorker.controller);

      await unregisterWorkers();
      await clearCaches(false);

      if (hadController || registrations.length > 0) {
        const session = getStorage("session");
        if (!readStorage(session, CLEANUP_RELOAD_KEY)) {
          writeStorage(session, CLEANUP_RELOAD_KEY, "1");
          window.location.reload();
          return;
        }
      }
      removeStorage(getStorage("session"), CLEANUP_RELOAD_KEY);
    };

    const bootstrap = async () => {
      if (process.env.NODE_ENV !== "production") {
        await cleanupForDevelopment();
        return;
      }

      const version = await readBuildVersion();
      if (!version || cancelled) return;

      const local = getStorage("local");
      const storedVersion = readStorage(local, VERSION_STORAGE_KEY);
      const activeVersion = controllerVersion();
      const hasController = Boolean(navigator.serviceWorker.controller);
      const activeIsCurrent = hasController && activeVersion === version;
      const activeIsStale = hasController && !activeIsCurrent;

      if ((storedVersion !== version || activeIsStale) && !activeIsCurrent) {
        await unregisterWorkers();
        await clearCaches(true);
        writeStorage(local, VERSION_STORAGE_KEY, version);

        if (hasController) {
          const session = getStorage("session");
          if (!readStorage(session, CLEANUP_RELOAD_KEY)) {
            writeStorage(session, CLEANUP_RELOAD_KEY, "1");
            window.location.reload();
            return;
          }
        }
      } else if (storedVersion !== version) {
        // An update was applied before this load, so its new worker has already
        // deleted the old caches. Record the version without a second reload.
        writeStorage(local, VERSION_STORAGE_KEY, version);
      }

      removeStorage(getStorage("session"), CLEANUP_RELOAD_KEY);
      if (!cancelled) await register(version);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    const onFocus = () => checkForUpdate();
    const onOnline = () => checkForUpdate();

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    void bootstrap();

    return () => {
      cancelled = true;
      clearUpdateTimeout();
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const applyUpdate = () => {
    const worker = waitingRef.current;
    if (!worker || applying) return;
    setApplying(true);
    reloadRef.current = true;
    try {
      worker.postMessage({ type: "SKIP_WAITING" });
    } catch (error) {
      console.error("Service worker update failed", error);
      reloadRef.current = false;
      setApplying(false);
      return;
    }

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      // Activation did not complete in time. Keep the prompt available and do
      // not turn a later controllerchange into an unexpected reload.
      reloadRef.current = false;
      setApplying(false);
      timeoutRef.current = null;
    }, 5_000);
  };

  const dismiss = () => {
    setUpdateReady(false);
    setApplying(false);
  };

  return (
    <AnimatePresence>
      {updateReady ? (
        <motion.div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
          className="no-print fixed bottom-[calc(6.2rem+env(safe-area-inset-bottom,0px))] left-3 z-[56] flex items-center gap-2 rounded-xl border border-line/15 bg-[#07131f]/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-xl lg:bottom-5 lg:left-[19rem]"
        >
          {applying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-aurora" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 text-aurora" />
          )}
          <span>{updateReady && applying ? t("updating") : t("updateAvailable")}</span>
          <button
            type="button"
            onClick={applyUpdate}
            disabled={applying}
            aria-busy={applying}
            className="pressable rounded-md bg-aurora/15 px-2 py-1 text-xs font-bold text-aurora hover:bg-aurora/25 disabled:opacity-60"
          >
            {t("update")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("close")}
            className="focus-ring pressable rounded p-1 text-white/50 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
