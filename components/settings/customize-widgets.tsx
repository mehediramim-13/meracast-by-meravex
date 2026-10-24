"use client";

import { Reorder, useDragControls } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  RotateCcw,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useHaptics } from "@/hooks/use-haptics";
import { useI18n } from "@/i18n/provider";
import { useSettings } from "@/store/use-settings";
import { useUI } from "@/store/use-ui";
import { cn } from "@/lib/utils";
import { WIDGET_LABELS } from "@/lib/widgets";
import type { WidgetLayoutItem } from "@/types/settings";

export function CustomizeWidgets() {
  const open = useUI((state) => state.customizeOpen);
  const setOpen = useUI((state) => state.setCustomizeOpen);
  const widgets = useSettings((state) => state.widgets);
  const setWidgets = useSettings((state) => state.setWidgets);
  const resetWidgets = useSettings((state) => state.resetWidgets);
  const toggleWidget = useSettings((state) => state.toggleWidget);
  const { t } = useI18n();
  const vibrate = useHaptics();

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= widgets.length) return;
    const next = [...widgets];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    vibrate(5);
    setWidgets(next);
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={t("widgetsTitle")}
      description={t("widgetsDesc")}
      size="md"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              vibrate(6);
              resetWidgets();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("resetLayout")}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setOpen(false)}>
            <Check className="h-3.5 w-3.5" />
            {t("done")}
          </Button>
        </div>
      }
    >
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-aurora/15 bg-aurora/[0.05] px-3 py-2 text-xs text-muted">
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-aurora" />
        {t("dragToReorder")}
      </div>
      <Reorder.Group axis="y" values={widgets} onReorder={setWidgets} className="space-y-1.5">
        {widgets.map((widget, index) => (
          <WidgetRow
            key={widget.id}
            widget={widget}
            index={index}
            count={widgets.length}
            label={t(WIDGET_LABELS[widget.id])}
            hiddenLabel={t("hideWidget", { widget: t(WIDGET_LABELS[widget.id]) })}
            visibleLabel={t("showWidget", { widget: t(WIDGET_LABELS[widget.id]) })}
            onMove={move}
            onToggle={() => {
              vibrate(6);
              toggleWidget(widget.id);
            }}
          />
        ))}
      </Reorder.Group>
    </Modal>
  );
}

function WidgetRow({
  widget,
  index,
  count,
  label,
  hiddenLabel,
  visibleLabel,
  onMove,
  onToggle,
}: {
  widget: WidgetLayoutItem;
  index: number;
  count: number;
  label: string;
  hiddenLabel: string;
  visibleLabel: string;
  onMove: (index: number, direction: -1 | 1) => void;
  onToggle: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={widget}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "group flex min-h-12 list-none items-center gap-2 rounded-xl border border-line/10 bg-surface-quiet px-2.5 py-1.5",
        !widget.visible && "opacity-60",
      )}
    >
      <button
        type="button"
        aria-label={`${label}: drag to reorder`}
        onPointerDown={(event) => controls.start(event)}
        className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-faint transition-colors hover:bg-white/5 hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line/10",
          widget.visible ? "bg-aurora/[0.08] text-aurora" : "bg-surface-quiet text-faint",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-[13px] font-semibold", widget.visible ? "text-ink" : "text-muted")}>
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          aria-label={`${label}: move up`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-white/5 hover:text-ink disabled:opacity-25"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={index === count - 1}
          aria-label={`${label}: move down`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-white/5 hover:text-ink disabled:opacity-25"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={widget.visible}
          aria-label={widget.visible ? hiddenLabel : visibleLabel}
          onClick={onToggle}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
            widget.visible
              ? "border-aurora/25 bg-aurora/10 text-aurora"
              : "border-line/10 bg-surface-quiet text-faint hover:text-ink",
          )}
        >
          {widget.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </span>
    </Reorder.Item>
  );
}
