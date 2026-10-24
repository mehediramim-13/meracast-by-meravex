"use client";

import { create } from "zustand";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  message: string;
  tone?: "neutral" | "success" | "danger";
  action?: ToastAction;
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
let sequence = 0;

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (options) => {
    const id = `toast-${Date.now()}-${sequence++}`;
    const item: ToastItem = { ...options, id };
    set((state) => ({ toasts: [...state.toasts, item].slice(-3) }));
    const duration = options.duration ?? 4200;
    if (duration > 0) {
      const timer = setTimeout(() => get().dismiss(id), duration);
      timers.set(id, timer);
    }
    return id;
  },
  dismiss: (id) => {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

export function toast(options: ToastOptions): string {
  return useToast.getState().push(options);
}
