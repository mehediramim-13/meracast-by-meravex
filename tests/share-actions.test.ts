import { afterEach, describe, expect, it, vi } from "vitest";
import { placeFromSearchParams } from "@/lib/place";
import { parsePlannerUrlState } from "@/lib/rain-planner";
import {
  buildPlannerShareUrl,
  copyTextToClipboard,
  downloadBlob,
  planImageFilename,
  sharePlanImage,
} from "@/lib/share-actions";
import type { Place } from "@/types/geo";

const dhaka: Place = {
  id: "dhaka-bd",
  name: "Dhaka",
  country: "Bangladesh",
  countryCode: "BD",
  admin1: "Dhaka Division",
  latitude: 23.8103,
  longitude: 90.4125,
  timezone: "Asia/Dhaka",
};

const navigatorDescriptors = {
  share: Object.getOwnPropertyDescriptor(navigator, "share"),
  canShare: Object.getOwnPropertyDescriptor(navigator, "canShare"),
  clipboard: Object.getOwnPropertyDescriptor(navigator, "clipboard"),
};
const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, "execCommand");

function setNavigatorValue(name: "share" | "canShare" | "clipboard", value: unknown) {
  Object.defineProperty(navigator, name, { configurable: true, value });
}

function restoreNavigatorValue(
  name: "share" | "canShare" | "clipboard",
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(navigator, name, descriptor);
  } else {
    delete (navigator as unknown as Record<string, unknown>)[name];
  }
}

afterEach(() => {
  restoreNavigatorValue("share", navigatorDescriptors.share);
  restoreNavigatorValue("canShare", navigatorDescriptors.canShare);
  restoreNavigatorValue("clipboard", navigatorDescriptors.clipboard);
  if (execCommandDescriptor) {
    Object.defineProperty(document, "execCommand", execCommandDescriptor);
  } else {
    delete (document as unknown as Record<string, unknown>).execCommand;
  }
  vi.restoreAllMocks();
});

describe("planImageFilename", () => {
  it("creates a safe, descriptive filename", () => {
    expect(planImageFilename("Dhaka", "2026-10-23")).toBe(
      "meracast-plan-dhaka-2026-10-23.png",
    );
    expect(planImageFilename("Cox's Bazar", "2026-01-02")).toBe(
      "meracast-plan-cox-s-bazar-2026-01-02.png",
    );
  });

  it("falls back to a neutral slug when the place name has no Latin characters", () => {
    expect(planImageFilename("ঢাকা", "2026-10-23")).toBe(
      "meracast-plan-location-2026-10-23.png",
    );
  });
});

describe("buildPlannerShareUrl", () => {
  it("round-trips the place and the full single-plan state", () => {
    const url = buildPlannerShareUrl("https://meracast.example", dhaka, {
      date: "2026-10-23",
      time: "18:00",
      endDate: "2026-10-24",
      endTime: "19:00",
      mode: "single",
      activity: "cricket",
    });
    const parsed = new URL(url);
    const place = placeFromSearchParams(parsed.searchParams);
    const state = parsePlannerUrlState(parsed.searchParams);

    expect(parsed.origin).toBe("https://meracast.example");
    expect(parsed.pathname).toBe("/rain-planner");
    expect(place).toMatchObject({
      name: "Dhaka",
      country: "Bangladesh",
      admin1: "Dhaka Division",
      timezone: "Asia/Dhaka",
    });
    expect(state).toEqual({
      date: "2026-10-23",
      time: "18:00",
      mode: "single",
      activity: "cricket",
    });
  });

  it("keeps the range end when the plan uses a window", () => {
    const url = buildPlannerShareUrl("https://meracast.example", dhaka, {
      date: "2026-10-23",
      time: "18:00",
      endDate: "2026-10-23",
      endTime: "21:00",
      mode: "range",
      activity: "picnic",
    });
    const state = parsePlannerUrlState(new URL(url).searchParams);

    expect(state.mode).toBe("range");
    expect(state.endDate).toBe("2026-10-23");
    expect(state.endTime).toBe("21:00");
    expect(state.activity).toBe("picnic");
  });
});

describe("downloadBlob", () => {
  it("appends the anchor, clicks it, removes it, then revokes the URL later", () => {
    const createObjectURL = vi.fn(() => "blob:planner-image");
    const revokeObjectURL = vi.fn();
    let scheduledRevoke: (() => void) | undefined;
    let clickedAnchor: HTMLAnchorElement | null = null;

    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedAnchor = this;
      expect(this.isConnected).toBe(true);
      expect(this.download).toBe("meracast-plan-dhaka-2026-10-23.png");
      expect(this.href).toBe("blob:planner-image");
    });

    const blob = new Blob(["png"], { type: "image/png" });
    downloadBlob(blob, "meracast-plan-dhaka-2026-10-23.png", document, {
      createObjectURL,
      revokeObjectURL,
      setTimeout: (handler) => {
        scheduledRevoke = handler;
        return 1;
      },
    });

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickedAnchor).not.toBeNull();
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    scheduledRevoke?.();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:planner-image");
  });

  it("rejects an empty blob before creating an object URL", () => {
    const createObjectURL = vi.fn(() => "blob:empty");

    expect(() =>
      downloadBlob(new Blob([]), "empty.png", document, {
        createObjectURL,
        revokeObjectURL: vi.fn(),
      }),
    ).toThrow(/empty/i);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("revokes and removes the anchor when the click is blocked", () => {
    const revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("download blocked");
    });

    expect(() =>
      downloadBlob(new Blob(["png"]), "blocked.png", document, {
        createObjectURL: () => "blob:blocked",
        revokeObjectURL,
      }),
    ).toThrow("download blocked");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:blocked");
    expect(document.querySelector("a[download]")).toBeNull();
  });
});

describe("sharePlanImage", () => {
  const options = {
    blob: new Blob(["png"], { type: "image/png" }),
    filename: "meracast-plan-dhaka-2026-10-23.png",
    title: "Share your plan",
    text: "Cricket in Dhaka at 6:00 PM",
    url: "https://meracast.example/rain-planner?lat=23.81",
  };

  it("uses native file sharing when canShare accepts files", async () => {
    const share = vi.fn(async () => undefined);
    const canShare = vi.fn(() => true);
    const download = vi.fn();
    setNavigatorValue("share", share);
    setNavigatorValue("canShare", canShare);

    const result = await sharePlanImage(options, { download });

    expect(result).toBe("shared");
    expect(canShare).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(1);
    expect(download).not.toHaveBeenCalled();
  });

  it("downloads honestly when file sharing is unsupported", async () => {
    const share = vi.fn(async () => undefined);
    const canShare = vi.fn(() => false);
    const download = vi.fn(async () => undefined);
    setNavigatorValue("share", share);
    setNavigatorValue("canShare", canShare);

    const result = await sharePlanImage(options, { download });

    expect(result).toBe("downloaded");
    expect(download).toHaveBeenCalledWith(options.blob, options.filename);
    expect(share).not.toHaveBeenCalled();
  });

  it("downloads when the browser has no Web Share API at all", async () => {
    setNavigatorValue("share", undefined);
    setNavigatorValue("canShare", undefined);
    const download = vi.fn(async () => undefined);

    await expect(sharePlanImage(options, { download })).resolves.toBe("downloaded");
    expect(download).toHaveBeenCalledTimes(1);
  });

  it("treats AbortError as a silent cancel", async () => {
    const share = vi.fn(async () => {
      throw new DOMException("The user aborted the share.", "AbortError");
    });
    setNavigatorValue("share", share);
    setNavigatorValue("canShare", () => true);

    await expect(
      sharePlanImage(options, { download: vi.fn() }),
    ).resolves.toBe("cancelled");
  });

  it("rethrows a real share failure", async () => {
    setNavigatorValue("share", vi.fn(async () => {
      throw new Error("share sheet unavailable");
    }));
    setNavigatorValue("canShare", () => true);

    await expect(sharePlanImage(options, { download: vi.fn() })).rejects.toThrow(
      "share sheet unavailable",
    );
  });

  it("refuses to share a zero-byte image", async () => {
    await expect(
      sharePlanImage({ ...options, blob: new Blob([]) }, { download: vi.fn() }),
    ).rejects.toThrow(/empty/i);
  });
});

describe("copyTextToClipboard", () => {
  it("uses the Clipboard API when it succeeds", async () => {
    const writeText = vi.fn(async () => undefined);
    setNavigatorValue("clipboard", { writeText });

    await expect(copyTextToClipboard("https://meracast.example/plan")).resolves.toBe(
      true,
    );
    expect(writeText).toHaveBeenCalledWith("https://meracast.example/plan");
  });

  it("falls back to a textarea when the Clipboard API rejects", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("clipboard permission denied");
    });
    setNavigatorValue("clipboard", { writeText });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    let selectedText = "";
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => {
        selectedText = document.querySelector("textarea")?.value ?? "";
        return true;
      }),
    });

    await expect(copyTextToClipboard("https://meracast.example/plan")).resolves.toBe(
      true,
    );
    expect(selectedText).toBe("https://meracast.example/plan");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("falls back when navigator.clipboard is unavailable", async () => {
    setNavigatorValue("clipboard", undefined);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => true),
    });

    await expect(copyTextToClipboard("fallback text")).resolves.toBe(true);
  });

  it("returns false when both copy paths fail", async () => {
    setNavigatorValue("clipboard", {
      writeText: vi.fn(async () => {
        throw new Error("denied");
      }),
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => false),
    });

    await expect(copyTextToClipboard("cannot copy")).resolves.toBe(false);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("returns false for empty text without touching the clipboard", async () => {
    const writeText = vi.fn();
    setNavigatorValue("clipboard", { writeText });

    await expect(copyTextToClipboard("")).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });
});
