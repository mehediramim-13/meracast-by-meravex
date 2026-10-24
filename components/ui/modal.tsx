"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/icon-button";
import { useSettings } from "@/store/use-settings";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  variant?: "center" | "sheet";
  className?: string;
  hideClose?: boolean;
  closeLabel?: string;
  initialFocusRef?: RefObject<HTMLElement>;
}

const sizeClasses = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
  full: "sm:max-w-[92vw]",
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  variant = "center",
  className,
  hideClose = false,
  closeLabel = "Close",
  initialFocusRef,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const initialFocusTarget = useRef(initialFocusRef);
  const reduceSystem = useReducedMotion();
  const reduceSetting = useSettings((state) => state.reduceMotion);
  const reduce = reduceSystem || reduceSetting;

  onCloseRef.current = onClose;
  initialFocusTarget.current = initialFocusRef;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep the callback stable so opening the dialog does not re-run this effect
  // (and re-focus the close button) on every parent render.
  const handleClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    const originalPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const focusTimer = window.setTimeout(() => {
      const node = panelRef.current;
      if (!node) return;
      const focusable =
        initialFocusTarget.current?.current ??
        node.querySelector<HTMLElement>("[data-autofocus]") ??
        node.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
      if (focusable && node.contains(focusable)) focusable.focus();
    }, 50);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== "Tab") return;
      const node = panelRef.current;
      if (!node) return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPadding;
      previousFocus.current?.focus?.();
    };
  }, [open, handleClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[var(--overlay)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Dialog"}
            aria-describedby={description ? "modal-description" : undefined}
            drag={variant === "sheet" && !reduce ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 130 || info.velocity.y > 700) handleClose();
            }}
            initial={reduce ? { opacity: 0 } : variant === "sheet" ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 14 }}
            animate={reduce ? { opacity: 1 } : variant === "sheet" ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : variant === "sheet" ? { y: "100%" } : { opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
              "relative flex max-h-[92svh] w-full flex-col overflow-hidden border border-line/15 bg-[var(--modal-bg)] text-ink shadow-lift sm:max-h-[88svh]",
              variant === "sheet"
                ? "rounded-t-3xl sm:rounded-3xl"
                : "rounded-t-3xl sm:rounded-3xl",
              sizeClasses[size],
              className,
            )}
          >
            {variant === "sheet" ? (
              <div className="flex w-full justify-center pt-2.5 pb-1">
                <span className="h-1 w-10 rounded-full bg-line/30" />
              </div>
            ) : null}
            {title || !hideClose ? (
              <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
                <div className="min-w-0">
                  {title ? (
                    <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>
                  ) : null}
                  {description ? (
                    <p id="modal-description" className="mt-1 text-sm leading-relaxed text-muted">
                      {description}
                    </p>
                  ) : null}
                </div>
                {!hideClose ? (
                  <IconButton label={closeLabel} size="sm" variant="ghost" onClick={handleClose}>
                    <X className="h-4 w-4" />
                  </IconButton>
                ) : null}
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
              {children}
            </div>
            {footer ? (
              <div className="border-t border-line/10 bg-surface-quiet px-5 py-4 sm:px-6">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
