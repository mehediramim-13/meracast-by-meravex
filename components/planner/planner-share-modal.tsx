"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  ClipboardCopy,
  Download,
  Link2,
  Loader2,
  Share2,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { useFormat } from "@/hooks/use-format";
import { useI18n } from "@/i18n/provider";
import { getCondition } from "@/lib/weather-codes";
import { localizedPlaceDetail, localizedPlaceName } from "@/lib/place-localization";
import {
  canCopyImageToClipboard,
  copyImageToClipboard,
  copyTextToClipboard,
  downloadBlob,
  planImageFilename,
  sharePlanImage,
  SHARE_IMAGE_BACKGROUND,
  SHARE_IMAGE_PIXEL_RATIO,
  waitForShareCardAssets,
} from "@/lib/share-actions";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/en";
import type { WeatherData } from "@/types/weather";
import type { PlannerResult } from "@/types/planner";

interface PlannerShareModalProps {
  open: boolean;
  onClose: () => void;
  weather: WeatherData;
  result: PlannerResult;
  activityLabel: string;
  shareUrl: string;
}

type ShareImageState =
  | { status: "idle"; blob: null }
  | { status: "loading"; blob: null }
  | { status: "ready"; blob: Blob }
  | { status: "error"; blob: null };

type ShareAction = "download" | "share" | "copy-link" | "copy-image" | null;

export function PlannerShareModal({
  open,
  onClose,
  weather,
  result,
  activityLabel,
  shareUrl,
}: PlannerShareModalProps) {
  const { t, language } = useI18n();
  const format = useFormat();
  const id = useId().replace(/:/g, "");
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRequestRef = useRef(0);
  const [image, setImage] = useState<ShareImageState>({ status: "idle", blob: null });
  const [action, setAction] = useState<ShareAction>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [showManualLink, setShowManualLink] = useState(false);
  const [supportsCopyImage, setSupportsCopyImage] = useState(false);

  const isBangla = language === "bn";
  const assessment = result.assessment;
  const placeName = localizedPlaceName(weather.place, language);
  const placeDetail = localizedPlaceDetail(weather.place, language);
  const filename = planImageFilename(weather.place.name, result.date);
  const imageBusy = image.status === "loading";
  const targetSlot =
    result.slots.find((slot) => slot.time.slice(0, 13) === assessment.targetIso.slice(0, 13)) ??
    result.slots[0];
  const condition = targetSlot ? getCondition(targetSlot.weatherCode) : null;
  const bestWindow = result.bestWindows[0];
  const isDayTarget = (() => {
    const hour = Number(assessment.targetIso.slice(11, 13));
    return hour >= 6 && hour < 18;
  })();
  const shareText = t("plannerShareText", {
    activity: activityLabel,
    city: placeName,
    time: `${format.fullDate(result.date)} ${format.time(assessment.targetIso)}`,
    answer: t(assessment.verdictKey as TranslationKey),
  });

  useEffect(() => {
    setSupportsCopyImage(canCopyImageToClipboard());
  }, []);

  const renderImage = useCallback(async (): Promise<Blob> => {
    const node = cardRef.current;
    if (!node) throw new Error("The planner share card is not mounted.");

    await waitForShareCardAssets(node);
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(node, {
      pixelRatio: SHARE_IMAGE_PIXEL_RATIO,
      cacheBust: false,
      backgroundColor: SHARE_IMAGE_BACKGROUND,
    });
    if (!blob || blob.size === 0) {
      throw new Error("Image generation returned an empty Blob.");
    }
    return blob;
  }, []);

  const prepareImage = useCallback(async () => {
    const request = ++imageRequestRef.current;
    setImage({ status: "loading", blob: null });
    setMessage(null);

    try {
      const blob = await renderImage();
      if (request !== imageRequestRef.current) return;
      setImage({ status: "ready", blob });
    } catch (error) {
      if (request !== imageRequestRef.current) return;
      console.error("Failed to prepare the planner share image", error);
      setImage({ status: "error", blob: null });
      setMessage({ tone: "error", text: t("plannerImageFailed") });
    }
  }, [renderImage, t]);

  useEffect(() => {
    if (!open) {
      imageRequestRef.current += 1;
      setImage({ status: "idle", blob: null });
      setAction(null);
      setMessage(null);
      setShowManualLink(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void prepareImage();
    }, 220);

    return () => {
      window.clearTimeout(timer);
      imageRequestRef.current += 1;
    };
  }, [activityLabel, format, language, open, prepareImage, result, weather]);

  const requireImage = (): Blob | null => {
    if (image.status === "ready" && image.blob.size > 0) return image.blob;
    setMessage({
      tone: "error",
      text: t(image.status === "error" ? "plannerImageFailed" : "plannerImageNotReady"),
    });
    return null;
  };

  const handleDownload = () => {
    const blob = requireImage();
    if (!blob || action) return;

    setAction("download");
    setMessage(null);
    setShowManualLink(false);
    try {
      downloadBlob(blob, filename);
      setMessage({ tone: "ok", text: t("plannerDownloadStarted") });
    } catch (error) {
      console.error("Failed to download the planner image", error);
      setMessage({ tone: "error", text: t("plannerDownloadFailed") });
    } finally {
      setAction(null);
    }
  };

  const handleShare = () => {
    const blob = requireImage();
    if (!blob || action) return;

    setAction("share");
    setMessage(null);
    setShowManualLink(false);
    void (async () => {
      try {
        const outcome = await sharePlanImage({
          blob,
          filename,
          title: t("plannerShareTitle"),
          text: shareText,
          url: shareUrl,
        });
        if (outcome === "shared") {
          setMessage({ tone: "ok", text: t("plannerShareSucceeded") });
        } else if (outcome === "downloaded") {
          setMessage({ tone: "ok", text: t("plannerShareFallback") });
        }
        // An AbortError means the user closed the share sheet. Keep quiet.
      } catch (error) {
        console.error("Failed to share the planner image", error);
        setMessage({ tone: "error", text: t("plannerShareFailed") });
      } finally {
        setAction(null);
      }
    })();
  };

  const handleCopyLink = () => {
    if (action) return;
    setAction("copy-link");
    setMessage(null);
    setShowManualLink(false);
    void (async () => {
      try {
        const copied = await copyTextToClipboard(shareUrl);
        if (copied) {
          setMessage({ tone: "ok", text: t("plannerShareCopied") });
        } else {
          console.error("The planner link could not be copied automatically");
          setShowManualLink(true);
          setMessage({ tone: "error", text: t("plannerCopyLinkFailed") });
        }
      } catch (error) {
        console.error("Failed to copy the planner link", error);
        setShowManualLink(true);
        setMessage({ tone: "error", text: t("plannerCopyLinkFailed") });
      } finally {
        setAction(null);
      }
    })();
  };

  const handleCopyImage = () => {
    const blob = requireImage();
    if (!blob || action || !supportsCopyImage) return;

    setAction("copy-image");
    setMessage(null);
    setShowManualLink(false);
    void (async () => {
      try {
        const copied = await copyImageToClipboard(blob);
        if (copied) {
          setMessage({ tone: "ok", text: t("plannerCopyImageSucceeded") });
        } else {
          console.error("The planner image could not be copied to the clipboard");
          setMessage({ tone: "error", text: t("plannerCopyImageFailed") });
        }
      } catch (error) {
        console.error("Failed to copy the planner image", error);
        setMessage({ tone: "error", text: t("plannerCopyImageFailed") });
      } finally {
        setAction(null);
      }
    })();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("plannerShareTitle")}
      description={t("plannerShareCard")}
      size="md"
    >
      <div className="space-y-4">
        <div className="mx-auto w-full max-w-[360px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-3xl border border-line/15 bg-[#071019] shadow-glass"
          >
            <div
              ref={cardRef}
              lang={language}
              className={cn(
                "relative aspect-[4/5] w-full overflow-hidden bg-[#071019] text-white",
                isBangla && "font-bengali",
              )}
              aria-label={t("plannerShareCardAlt", { city: placeName })}
            >
              <div className="relative flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[10px] border border-white/15 bg-white/[0.06]">
                      <svg viewBox="0 0 48 48" className="h-6 w-6" fill="none" aria-hidden="true">
                        <defs>
                          <linearGradient
                            id={`plan-mark-${id}`}
                            x1="12"
                            y1="16"
                            x2="38"
                            y2="34"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop stopColor="#7EB3B8" />
                            <stop offset="1" stopColor="#7EB3B8" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M11.5 31.5V20.4C11.5 17.2 15.3 15.9 17.5 18.4L24 25.6L30.5 18.4C32.7 15.9 36.5 17.2 36.5 20.4V31.5"
                          stroke={`url(#plan-mark-${id})`}
                          strokeWidth="3.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="24" cy="36.2" r="2.3" fill="#7EB3B8" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-heading text-[14px] font-bold leading-none tracking-[-0.02em]">
                        Mera<span className="text-aurora">Cast</span>
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-white/40">
                        by MeraVex
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] font-medium leading-none text-white/60">
                    {t("plannerTitle")}
                  </span>
                </div>

                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase leading-[1.5] tracking-[0.08em] text-aurora">
                    {format.fullDate(result.date)} · {format.time(assessment.targetIso)}
                  </p>
                  <h3 className="mt-1.5 line-clamp-2 break-words text-[1.5rem] font-bold leading-[1.35] tracking-[-0.01em]">
                    {placeName}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-[1.55] text-white/55">
                    {activityLabel}
                    {placeDetail ? ` · ${placeDetail}` : ""}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="max-w-[13rem] text-[1.75rem] font-bold leading-[1.3] tracking-[-0.015em] text-white/95">
                      {t(assessment.verdictKey as TranslationKey)}
                    </p>
                    <p className="mt-1.5 text-[11px] font-semibold uppercase leading-[1.5] tracking-[0.08em] text-white/55">
                      {t("plannerProbability")}{" "}
                      <span className="text-white/90">{format.percent(assessment.probability)}</span>
                    </p>
                  </div>
                  <WeatherIcon
                    kind={condition?.icon ?? "partly"}
                    isDay={isDayTarget}
                    size={100}
                    className="h-[4.5rem] w-[4.5rem] shrink-0"
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <ShareMetric label={t("plannerTemp")} value={format.temp(assessment.temperature)} />
                  <ShareMetric label={t("plannerWind")} value={format.wind(assessment.windSpeed)} />
                  <ShareMetric
                    label={t("plannerConfidence")}
                    value={format.percent(assessment.confidence)}
                  />
                </div>

                <div className="mt-auto">
                  <div className="rounded-lg border border-aurora/25 bg-aurora/[0.08] px-2.5 py-2">
                    <p className="text-[11px] font-bold uppercase leading-[1.4] tracking-[0.1em] text-aurora/85">
                      {t("plannerBestWindow")}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[13px] font-bold leading-[1.5] text-white/90">
                      {bestWindow
                        ? `${format.hour(bestWindow.startIso)}–${format.hour(bestWindow.endIso)} · ${format.percent(bestWindow.maxProbability)}`
                        : t("plannerNoBestWindow")}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                    <p className="text-[10px] font-medium leading-[1.5] text-white/40">
                      {t("shareFooter")}
                    </p>
                    <Sparkles className="h-3.5 w-3.5 text-solar/70" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div
          className={cn(
            "grid gap-2",
            supportsCopyImage ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-3",
          )}
        >
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={!image.blob || action !== null}
            aria-busy={imageBusy || action === "download"}
          >
            {imageBusy || action === "download" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {imageBusy ? t("generatingImage") : t("downloadImage")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            disabled={!image.blob || action !== null}
            aria-busy={imageBusy || action === "share"}
          >
            {imageBusy || action === "share" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            {imageBusy ? t("generatingImage") : t("shareNative")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            disabled={action !== null}
            aria-busy={action === "copy-link"}
          >
            {action === "copy-link" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {t("plannerCopyLink")}
          </Button>
          {supportsCopyImage ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyImage}
              disabled={!image.blob || action !== null}
              aria-busy={action === "copy-image"}
            >
              {action === "copy-image" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" />
              )}
              {t("plannerCopyImage")}
            </Button>
          ) : null}
        </div>

        {image.status === "error" ? (
          <div className="text-center">
            <button
              type="button"
              onClick={() => void prepareImage()}
              className="focus-ring rounded-lg px-2 py-1 text-[11px] font-semibold text-aurora transition-colors hover:text-ink"
            >
              {t("plannerRetryImage")}
            </button>
          </div>
        ) : null}

        {message ? (
          <p
            role="status"
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-center text-[11px] font-medium",
              message.tone === "ok"
                ? "border-aurora/20 bg-aurora/[0.06] text-aurora"
                : "border-danger/20 bg-danger/[0.06] text-danger",
            )}
          >
            {message.tone === "ok" ? (
              <Check className="h-3 w-3 shrink-0" />
            ) : (
              <AlertCircle className="h-3 w-3 shrink-0" />
            )}
            {message.text}
          </p>
        ) : null}

        {showManualLink ? (
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-muted">
              {t("plannerLinkLabel")}
            </span>
            <input
              readOnly
              value={shareUrl}
              onClick={(event) => event.currentTarget.select()}
              onFocus={(event) => event.currentTarget.select()}
              className="h-10 w-full rounded-xl border border-line/15 bg-surface-quiet px-3 text-xs text-ink outline-none focus:border-aurora/45"
            />
          </label>
        ) : null}

        <p className="text-center text-[10px] text-faint">
          {t("poweredBy")} · Open-Meteo
        </p>
      </div>
    </Modal>
  );
}

function ShareMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.055] px-2.5 py-2">
      <p className="line-clamp-2 text-[11px] font-semibold uppercase leading-[1.4] tracking-[0.06em] text-white/50">
        {label}
      </p>
      <p className="mt-1 truncate text-[14px] font-bold leading-[1.4] text-white/90">{value}</p>
    </div>
  );
}
