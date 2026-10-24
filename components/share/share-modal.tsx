"use client";

import { motion } from "framer-motion";
import { Download, ImageDown, Loader2, Share2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { useFormat } from "@/hooks/use-format";
import { useWeatherQuery } from "@/hooks/use-weather";
import { useI18n } from "@/i18n/provider";
import { useLocations } from "@/store/use-locations";
import { useUI } from "@/store/use-ui";
import { getCondition } from "@/lib/weather-codes";
import { getTodayDaily } from "@/lib/weather";
import { cn } from "@/lib/utils";

export function ShareModal() {
  const open = useUI((state) => state.shareOpen);
  const close = useUI((state) => state.closeShare);
  const place = useLocations((state) => state.activePlace);
  const weatherQuery = useWeatherQuery(place, { enabled: open });
  const weather = weatherQuery.data;
  const { t, language } = useI18n();
  const format = useFormat();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const condition = weather ? getCondition(weather.current.conditionCode) : null;
  const today = weather ? getTodayDaily(weather) : null;

  const renderImage = async (): Promise<Blob | null> => {
    const node = cardRef.current;
    if (!node) return null;
    const { toBlob } = await import("html-to-image");
    return toBlob(node, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "#071019",
    });
  };

  const download = async () => {
    if (!weather) return;
    setBusy(true);
    setMessage(null);
    try {
      const blob = await renderImage();
      if (!blob) throw new Error("empty");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `meracast-${weather.place.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage({ tone: "ok", text: t("imageDownloaded") });
    } catch {
      setMessage({ tone: "error", text: t("shareFailed") });
    } finally {
      setBusy(false);
    }
  };

  const nativeShare = async () => {
    if (!weather) return;
    setBusy(true);
    setMessage(null);
    try {
      const blob = await renderImage();
      if (!blob) throw new Error("empty");
      const file = new File([blob], "meracast.png", { type: "image/png" });
      const shareData: ShareData = {
        title: t("shareTitle", { city: weather.place.name }),
        text: `${weather.place.name} · ${format.temp(weather.current.temperature)} · ${
          condition ? t(condition.labelKey) : ""
        }`,
        files: [file],
      };
      if (navigator.canShare?.(shareData) && navigator.share) {
        await navigator.share(shareData);
      } else {
        await download();
      }
    } catch (error) {
      if ((error as { name?: string }).name !== "AbortError") {
        setMessage({ tone: "error", text: t("shareFailed") });
      }
    } finally {
      setBusy(false);
    }
  };

  const copyText = async () => {
    if (!weather) return;
    const text = `${weather.place.name} · ${format.temp(weather.current.temperature)} · ${
      condition ? t(condition.labelKey) : ""
    }\n${window.location.href}\n${t("shareFooter")}`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ tone: "ok", text: t("shareCopied") });
    } catch {
      setMessage({ tone: "error", text: t("shareFailed") });
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("shareWeather")}
      description={t("shareIncludes")}
      size="md"
    >
      {!weather ? (
        <div className="flex min-h-[18rem] items-center justify-center">
          {weatherQuery.isError ? (
            <div className="text-center">
              <p className="text-sm font-semibold text-ink">{t("errorTitle")}</p>
              <p className="mt-1 text-xs text-muted">{t("errorBody")}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => void weatherQuery.refetch()}>
                {t("errorRetry")}
              </Button>
            </div>
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-aurora" />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mx-auto w-full max-w-[360px]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-3xl border border-line/15 bg-[#0b141d] shadow-glass"
            >
              <div
                ref={cardRef}
                className="relative aspect-[4/5] w-full overflow-hidden bg-[#0b141d] text-white"
                aria-label={t("shareCardAlt", { city: weather.place.name })}
              >
                <div className="relative flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[10px] border border-white/15 bg-white/[0.06]">
                        <svg viewBox="0 0 48 48" className="h-6 w-6" fill="none" aria-hidden="true">
                          <defs>
                            <linearGradient id="share-mark" x1="12" y1="16" x2="38" y2="34" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#7EB3B8" />
                              <stop offset="1" stopColor="#7EB3B8" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M11.5 31.5V20.4C11.5 17.2 15.3 15.9 17.5 18.4L24 25.6L30.5 18.4C32.7 15.9 36.5 17.2 36.5 20.4V31.5"
                            stroke="url(#share-mark)"
                            strokeWidth="3.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="24" cy="36.2" r="2.3" fill="#7EB3B8" />
                        </svg>
                      </span>
                      <div>
                        <p className="font-heading text-[13px] font-bold leading-none tracking-[-0.02em]">
                          Mera<span className="text-aurora">Cast</span>
                        </p>
                        <p className="mt-0.5 text-[6px] font-semibold uppercase tracking-[0.24em] text-white/40">
                          by MeraVex
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-white/60">
                      {t("shareSubtitle")}
                    </span>
                  </div>

                  <div className="mt-7">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-aurora">
                      {format.fullDate(weather.current.time.slice(0, 10))}
                    </p>
                    <h3 className="mt-1.5 truncate text-[1.5rem] font-bold leading-none tracking-[-0.02em]">
                      {weather.place.name}
                    </h3>
                    <p className="mt-1 text-[9px] text-white/45">
                      {[weather.place.admin1, weather.place.country].filter(Boolean).join(", ")}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-start">
                        <span className="tabular text-[4.5rem] font-semibold leading-[0.8] tracking-[-0.05em]">
                          {format.tempValue(weather.current.temperature)}
                        </span>
                        <span className="mt-1 text-xl font-normal text-white/60">°</span>
                      </div>
                      <p className="mt-2 font-heading text-lg font-semibold text-white/90">
                        {condition ? t(condition.labelKey) : ""}
                      </p>
                      <p className="mt-1 text-[9px] text-white/45">
                        {t("feelsLike")} {format.temp(weather.current.apparentTemperature)}
                        {today ? ` · ${t("high")} ${format.temp(today.temperatureMax)} / ${t("low")} ${format.temp(today.temperatureMin)}` : ""}
                      </p>
                    </div>
                    <WeatherIcon
                      kind={condition?.icon ?? "partly"}
                      isDay={weather.current.isDay}
                      size={150}
                      className="h-[6.5rem] w-[6.5rem] shrink-0"
                    />
                  </div>

                  <div className="mt-auto">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: t("humidity"), value: format.percent(weather.current.humidity) },
                        { label: t("windSpeed"), value: format.wind(weather.current.windSpeed) },
                        {
                          label: t("chanceOfRain"),
                          value: format.percent(weather.hourly[0]?.precipitationProbability ?? 0),
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-lg border border-white/10 bg-white/[0.055] px-2 py-2"
                        >
                          <p className="text-[7px] font-semibold uppercase tracking-[0.12em] text-white/40">
                            {item.label}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-bold text-white/90">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <p className="text-[8px] font-medium text-white/40">{t("shareFooter")}</p>
                      <Sparkles className="h-3 w-3 text-solar/70" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="primary" size="sm" onClick={() => void download()} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {t("downloadImage")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void nativeShare()} disabled={busy}>
              <Share2 className="h-3.5 w-3.5" />
              {t("shareNative")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void copyText()} disabled={busy}>
              <ImageDown className="h-3.5 w-3.5" />
              {t("copyText")}
            </Button>
          </div>

          {message ? (
            <p
              role="status"
              className={cn(
                "rounded-lg border px-3 py-2 text-center text-xs font-medium",
                message.tone === "ok"
                  ? "border-aurora/20 bg-aurora/[0.06] text-aurora"
                  : "border-danger/20 bg-danger/[0.06] text-danger",
              )}
            >
              {message.text}
            </p>
          ) : null}
          <p className="text-center text-[10px] text-faint">
            {t("poweredBy")} · Open-Meteo · {language === "bn" ? "মেরাভেক্স" : "MeraVex"}
          </p>
        </div>
      )}
    </Modal>
  );
}
