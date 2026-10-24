"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/motion";
import { useHaptics } from "@/hooks/use-haptics";
import { isNavActive, NAV_ITEMS } from "@/components/layout/sidebar";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const vibrate = useHaptics();

  return (
    <nav
      aria-label="Primary"
      className="no-print fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.65rem)] lg:hidden"
    >
      <div className="glass-strong grid w-full max-w-md grid-cols-4 gap-1 rounded-3xl border border-line/15 p-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => vibrate(6)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "pressable relative flex min-h-[3.2rem] flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium",
                active ? "text-ink" : "text-muted",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl border border-line/15 bg-surface-quiet"
                  transition={springs.layout}
                />
              ) : null}
              <span className="relative flex h-6 items-center justify-center">
                <Icon className={cn("h-[1.15rem] w-[1.15rem]", active && "text-aurora")} strokeWidth={2} />
              </span>
              <span className="relative max-w-full truncate px-1">
                {item.href === "/rain-planner" ? t("navPlannerShort") : t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
