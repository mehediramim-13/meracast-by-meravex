import { placeToSearchParams } from "@/lib/place";
import { slugify } from "@/lib/utils";
import type { Place } from "@/types/geo";
import type { PlannerInput } from "@/types/planner";

export type SharePlanResult = "shared" | "downloaded" | "cancelled";

interface DownloadDeps {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
  setTimeout?: (handler: () => void, timeout: number) => number;
}

interface ShareDeps {
  download?: (blob: Blob, filename: string) => void | Promise<void>;
}

/**
 * The card is 360 CSS pixels wide in the modal. A 3x render gives a
 * 1080px-wide PNG, which keeps Bengali glyphs crisp in the saved file.
 */
export const SHARE_IMAGE_PIXEL_RATIO = 3;
export const SHARE_IMAGE_BACKGROUND = "#071019";

export function planImageFilename(placeName: string, date: string): string {
  const slug = slugify(placeName).slice(0, 64) || "location";
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : new Date().toISOString().slice(0, 10);
  return `meracast-plan-${slug}-${safeDate}.png`;
}

export function buildPlannerShareUrl(
  origin: string,
  place: Place,
  plan: PlannerInput,
): string {
  const params = placeToSearchParams(place);
  params.set("date", plan.date);
  params.set("time", plan.time);
  params.set("mode", plan.mode);
  params.set("activity", plan.activity);
  if (plan.mode === "range") {
    params.set("endDate", plan.endDate);
    params.set("endTime", plan.endTime);
  }
  return new URL(`/rain-planner?${params.toString()}`, origin).toString();
}

export function isShareAbort(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/**
 * Appending the anchor matters in Chromium/Brave: a detached anchor can have
 * its click ignored. Revoking the object URL immediately can also cancel the
 * download before the browser has read the blob.
 */
export function downloadBlob(
  blob: Blob,
  filename: string,
  doc: Document = document,
  deps: DownloadDeps = {},
): void {
  if (!blob.size) throw new Error("Cannot download an empty image.");
  if (!doc.body) throw new Error("Cannot download without a document body.");

  const createObjectURL = deps.createObjectURL ?? URL.createObjectURL.bind(URL);
  const revokeObjectURL = deps.revokeObjectURL ?? URL.revokeObjectURL.bind(URL);
  const schedule = deps.setTimeout ?? ((handler, timeout) => window.setTimeout(handler, timeout));
  const url = createObjectURL(blob);
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  doc.body.appendChild(anchor);

  try {
    anchor.click();
  } catch (error) {
    revokeObjectURL(url);
    throw error;
  } finally {
    anchor.remove();
  }

  schedule(() => revokeObjectURL(url), 1_500);
}

export async function sharePlanImage(
  options: {
    blob: Blob;
    filename: string;
    title: string;
    text: string;
    url: string;
  },
  deps: ShareDeps = {},
): Promise<SharePlanResult> {
  if (!options.blob.size) throw new Error("Cannot share an empty image.");
  const file = new File([options.blob], options.filename, { type: "image/png" });
  const data: ShareData = {
    title: options.title,
    text: options.text,
    url: options.url,
    files: [file],
  };

  let canShareFiles = false;
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    try {
      canShareFiles = navigator.canShare(data);
    } catch (error) {
      console.error("navigator.canShare rejected the planner image payload", error);
    }
  }

  if (!canShareFiles) {
    const download = deps.download ?? downloadBlob;
    await download(options.blob, options.filename);
    return "downloaded";
  }

  try {
    await navigator.share(data);
    return "shared";
  } catch (error) {
    if (isShareAbort(error)) return "cancelled";
    throw error;
  }
}

function copyWithTextarea(text: string, doc: Document): boolean {
  const textarea = doc.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  doc.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return doc.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export async function copyTextToClipboard(
  text: string,
  doc: Document = document,
): Promise<boolean> {
  if (!text) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.error("Clipboard API copy failed; trying the textarea fallback", error);
  }

  try {
    if (typeof doc.execCommand !== "function") return false;
    return copyWithTextarea(text, doc);
  } catch (error) {
    console.error("Textarea clipboard fallback failed", error);
    return false;
  }
}

export function canCopyImageToClipboard(): boolean {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    return false;
  }

  const supports = (ClipboardItem as typeof ClipboardItem & {
    supports?: (type: string) => boolean;
  }).supports;
  if (typeof supports === "function") {
    try {
      return supports("image/png");
    } catch {
      return false;
    }
  }

  try {
    new ClipboardItem({
      "image/png": new Blob([new Uint8Array([0])], { type: "image/png" }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (!blob.size || !canCopyImageToClipboard()) return false;

  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch (error) {
    console.error("Clipboard image copy failed", error);
    return false;
  }
}

/**
 * html-to-image reads computed font faces and image URLs from the rendered
 * card. Wait for both before serializing so exported Bengali text is never
 * captured with a fallback font and no asset is half-loaded.
 */
export async function waitForShareCardAssets(node: HTMLElement): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}
