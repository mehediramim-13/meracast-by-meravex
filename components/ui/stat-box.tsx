import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatBoxProps {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
  compact?: boolean;
}

/**
 * Shared quiet metric tile used inside cards. Keeping this primitive in one
 * place prevents the padding, radius, label tracking and value weight from
 * drifting between nowcast, sun, air quality, planner and hero metrics.
 */
export function StatBox({
  label,
  value,
  detail,
  icon,
  className,
  valueClassName,
  labelClassName,
  compact = false,
}: StatBoxProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-line/10 bg-surface-quiet",
        compact ? "p-2.5" : "p-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p
          className={cn(
            "min-w-0 text-[0.6875rem] font-semibold uppercase leading-snug tracking-[0.1em] text-faint",
            compact && "text-[0.625rem] tracking-[0.08em]",
            labelClassName,
          )}
        >
          {label}
        </p>
        {icon ? <span className="mt-0.5 shrink-0 text-faint">{icon}</span> : null}
      </div>
      <p
        className={cn(
          "mt-1 truncate font-bold tabular leading-tight text-ink",
          compact ? "text-sm" : "text-lg",
          valueClassName,
        )}
      >
        {value}
      </p>
      {detail ? <p className="mt-0.5 truncate text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
