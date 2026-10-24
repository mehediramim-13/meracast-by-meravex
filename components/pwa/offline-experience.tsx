"use client";

import Link from "next/link";
import { CloudRainWind, Radar, WifiOff } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { useOnline } from "@/hooks/use-environment";
import { Logo } from "@/components/brand/logo";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/ui/states";
import { buttonClasses } from "@/components/ui/button";

export function OfflineExperience() {
  const { t } = useI18n();
  const online = useOnline();

  return (
    <div className="mx-auto flex min-h-[62svh] max-w-2xl flex-col justify-center py-8">
      <GlassCard padding="lg" className="text-center">
        <Logo size="lg" className="justify-center" />
        <div className="mt-5">
          <EmptyState
            illustration="offline"
            title={online ? t("online") : t("offline")}
            body={t("offlineBody")}
            actionLabel={t("errorRetry")}
            onAction={() => window.location.reload()}
          >
            <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
              <Link href="/" className={buttonClasses("secondary", "sm", "w-full")}>
                <CloudRainWind className="h-3.5 w-3.5" />
                {t("navWeather")}
              </Link>
              <Link href="/radar" className={buttonClasses("outline", "sm", "w-full")}>
                <Radar className="h-3.5 w-3.5" />
                {t("navRadar")}
              </Link>
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-faint">
              <WifiOff className="h-3 w-3" />
              {t("cachedDataBody")}
            </p>
          </EmptyState>
        </div>
      </GlassCard>
    </div>
  );
}
