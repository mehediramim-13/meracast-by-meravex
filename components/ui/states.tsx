"use client";

import { motion } from "framer-motion";
import { CloudOff, RefreshCcw, SearchX, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IllustrationKind = "cloud" | "search" | "offline" | "error" | "empty";

function Illustration({ kind }: { kind: IllustrationKind }) {
  const reduce = useReducedMotion();
  const Icon = kind === "search" ? SearchX : kind === "offline" ? WifiOff : kind === "empty" ? CloudOff : CloudOff;
  return (
    <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
      <motion.div
        className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-line/15 bg-surface-quiet"
        animate={reduce ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      >
        <Icon className="h-8 w-8 text-muted" strokeWidth={1.4} />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-solar" />
      </motion.div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  illustration = "cloud",
  className,
  children,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: IllustrationKind;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-10 text-center", className)}>
      <Illustration kind={illustration} />
      <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">{title}</h3>
      {body ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{body}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onAction}>
          <RefreshCcw className="h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      ) : null}
      {children}
    </div>
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <EmptyState
      title={title}
      body={body}
      actionLabel={onRetry ? retryLabel : undefined}
      onAction={onRetry}
      illustration="error"
      className={className}
    />
  );
}
