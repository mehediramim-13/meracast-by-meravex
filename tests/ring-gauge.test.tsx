import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RingGauge } from "@/components/ui/ring-gauge";

describe("RingGauge", () => {
  it("keeps a long AQI category inside the ring and wraps it", () => {
    render(
      <RingGauge
        value={180}
        max={300}
        valueLabel="180"
        label="Very Unhealthy"
        ariaLabel="180 Very Unhealthy"
        size={128}
        wrapLabel
        labelTransform="uppercase"
        labelLetterSpacing={0.02}
      />,
    );

    const gauge = screen.getByRole("img", { name: "180 Very Unhealthy" });
    const value = screen.getByText("180");
    const label = screen.getByText("Very Unhealthy");
    const inset = parseFloat(gauge.querySelector<HTMLElement>("div")?.style.padding ?? "0");

    expect(gauge).toHaveAttribute("data-value", "60");
    expect(gauge).toHaveStyle({ width: "128px", height: "128px" });
    expect(inset).toBeGreaterThan(128 * 0.06 + 12);
    expect(parseFloat(value.style.fontSize)).toBeGreaterThanOrEqual(128 * 0.22);
    expect(parseFloat(label.style.fontSize)).toBeGreaterThanOrEqual(11);
    expect(label.style.whiteSpace).toBe("normal");
    expect(label.style.overflowWrap).toBe("break-word");
    expect(label.style.textTransform).toBe("uppercase");
    expect(label.style.maxWidth).toBe("100%");
  });

  it("uses Bengali typography and readable line spacing for a long label", () => {
    render(
      <RingGauge
        value={42}
        valueLabel="৪২"
        label="সংবেদনশীল"
        language="bn"
        size={104}
        wrapLabel
      />,
    );

    const value = screen.getByText("৪২");
    const label = screen.getByText("সংবেদনশীল");

    expect(value).toHaveClass("font-bengali");
    expect(label).toHaveClass("font-bengali");
    expect(parseFloat(label.style.fontSize)).toBeGreaterThanOrEqual(11);
    expect(label.style.lineHeight).toBe("1.3");
    expect(label.style.whiteSpace).toBe("normal");
  });
});
