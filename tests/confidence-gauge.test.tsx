import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfidenceGauge } from "@/components/ui/confidence-gauge";

describe("ConfidenceGauge", () => {
  it("scales text from the gauge diameter with inner padding", () => {
    render(
      <ConfidenceGauge
        value={95}
        valueLabel="95%"
        label="Confidence"
        size={124}
        toneClassName="text-aurora"
      />,
    );

    const gauge = screen.getByRole("img", { name: "95% Confidence" });
    const value = screen.getByText("95%");
    const label = screen.getByText("Confidence");

    expect(gauge).toHaveStyle({ width: "124px", height: "124px" });
    expect(parseFloat(value.style.fontSize)).toBeGreaterThanOrEqual(124 * 0.22);
    expect(parseFloat(value.style.fontSize)).toBeLessThanOrEqual(124 * 0.26);
    expect(parseFloat(label.style.fontSize)).toBeGreaterThanOrEqual(124 * 0.11);
    expect(parseFloat(label.style.fontSize)).toBeLessThanOrEqual(124 * 0.12);
    expect(value.style.whiteSpace).toBe("nowrap");
    expect(label.style.whiteSpace).toBe("nowrap");
    expect(parseFloat(value.style.lineHeight)).toBeGreaterThanOrEqual(1.1);
    expect(parseFloat(value.style.lineHeight)).toBeLessThanOrEqual(1.2);
    expect(parseFloat(label.style.marginTop)).toBeGreaterThanOrEqual(2);
    expect(parseFloat(label.style.marginTop)).toBeLessThanOrEqual(4);

    const inset = parseFloat(gauge.querySelector<HTMLElement>("div")?.style.padding ?? "0");
    expect(inset).toBeGreaterThan(124 * 0.06 + 12);
  });

  it("keeps the label at least 11px and uses Bangla line spacing", () => {
    render(
      <ConfidenceGauge
        value={100}
        valueLabel="১০০%"
        label="আস্থা"
        language="bn"
        size={96}
      />,
    );

    const gauge = screen.getByRole("img", { name: "১০০% আস্থা" });
    const value = screen.getByText("১০০%");
    const label = screen.getByText("আস্থা");

    expect(gauge).toHaveStyle({ width: "104px", height: "104px" });
    expect(parseFloat(label.style.fontSize)).toBeGreaterThanOrEqual(11);
    expect(label.style.lineHeight).toBe("1.5");
    expect(label).toHaveClass("font-bengali");
    expect(value).toHaveClass("font-bengali");
  });
});
