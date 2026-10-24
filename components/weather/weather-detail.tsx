import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface WeatherDetailItem {
  icon?: ReactNode;
  label: string;
  value: string;
  hint?: string;
}

export function WeatherDetailsGrid({
  items,
  className,
  columns = 3,
}: {
  items: WeatherDetailItem[];
  className?: string;
  columns?: 2 | 3 | 4;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-4 gap-y-3",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="min-w-0">
          <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-faint">
            {item.icon ? <span className="text-faint/90">{item.icon}</span> : null}
            <span className="truncate">{item.label}</span>
          </dt>
          <dd className="mt-1 truncate text-sm font-semibold tabular text-ink">{item.value}</dd>
          {item.hint ? <dd className="mt-0.5 truncate text-xs text-faint">{item.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
