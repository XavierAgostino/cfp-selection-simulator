import { describe, expect, it } from "vitest";

import {
  pointsToPolyline,
  seriesToPoints,
  toCompareRows,
  toTrendSeries,
  type TrendInput,
} from "@/lib/committeeWeightCharts";
import type { FittedWeights } from "@/lib/types";

const BASELINE: FittedWeights = {
  resume: 0.4,
  predictive: 0.3,
  sor: 0.2,
  sos: 0.1,
};

const FIT_2025: FittedWeights = {
  resume: 0.65,
  predictive: 0.2,
  sor: 0.15,
  sos: 0,
};

describe("toCompareRows", () => {
  it("keeps factors in the canonical order", () => {
    const rows = toCompareRows(BASELINE, FIT_2025);
    expect(rows.map((r) => r.key)).toEqual([
      "resume",
      "predictive",
      "sor",
      "sos",
    ]);
    expect(rows.map((r) => r.label)).toEqual([
      "Resume",
      "Predictive",
      "SOR",
      "SOS",
    ]);
  });

  it("rounds weights to whole percentages", () => {
    const rows = toCompareRows(BASELINE, FIT_2025);
    const resume = rows[0];
    expect(resume.baselinePct).toBe(40);
    expect(resume.fittedPct).toBe(65);
  });

  it("derives the delta from the displayed percentages so it reconciles", () => {
    const rows = toCompareRows(BASELINE, FIT_2025);
    expect(rows[0].deltaPp).toBe(25); // resume 40 -> 65
    expect(rows[1].deltaPp).toBe(-10); // predictive 30 -> 20
    expect(rows[3].deltaPp).toBe(-10); // sos 10 -> 0
  });

  it("writes a cautious aria label using 'fit approximation'", () => {
    const rows = toCompareRows(BASELINE, FIT_2025);
    expect(rows[0].ariaLabel).toBe(
      "Resume: baseline 40%, fit approximation 65%",
    );
    expect(rows[0].ariaLabel).not.toMatch(/best.?fit/i);
  });
});

function fit(label: string, weights: FittedWeights): TrendInput {
  return { label, weights };
}

const SEASON: TrendInput[] = [
  fit("R1", { resume: 0.4, predictive: 0.05, sor: 0.55, sos: 0 }),
  fit("R2", { resume: 0.55, predictive: 0.05, sor: 0.4, sos: 0 }),
  fit("Final", { resume: 0.9, predictive: 0.05, sor: 0.05, sos: 0 }),
];

describe("toTrendSeries", () => {
  it("produces one series per factor with a point per release", () => {
    const series = toTrendSeries(SEASON);
    expect(series).toHaveLength(4);
    for (const s of series) {
      expect(s.points).toHaveLength(SEASON.length);
      expect(s.points.map((p) => p.releaseLabel)).toEqual([
        "R1",
        "R2",
        "Final",
      ]);
    }
  });

  it("exposes start and end percentages at the row ends", () => {
    const [resume] = toTrendSeries(SEASON);
    expect(resume.startPct).toBe(40);
    expect(resume.endPct).toBe(90);
    expect(resume.direction).toBe("up");
  });

  it("marks a falling factor as down and a steady factor as flat", () => {
    const series = toTrendSeries(SEASON);
    const sor = series.find((s) => s.key === "sor")!;
    const predictive = series.find((s) => s.key === "predictive")!;
    expect(sor.direction).toBe("down"); // 55 -> 5
    expect(predictive.direction).toBe("flat"); // 5 -> 5
  });

  it("names both endpoints in the aria label", () => {
    const [resume] = toTrendSeries(SEASON);
    expect(resume.ariaLabel).toBe(
      "Resume: 40% at R1, moving to 90% at Final",
    );
  });

  it("does not throw on an empty release list", () => {
    const series = toTrendSeries([]);
    expect(series).toHaveLength(4);
    expect(series[0].points).toHaveLength(0);
    expect(series[0].startPct).toBe(0);
    expect(series[0].endPct).toBe(0);
    expect(series[0].direction).toBe("flat");
  });
});

const GEO = { width: 200, height: 40, padX: 10, padY: 6 };

describe("seriesToPoints", () => {
  it("spreads points evenly across the inner width", () => {
    const [resume] = toTrendSeries(SEASON);
    const pts = seriesToPoints(resume, GEO);
    expect(pts).toHaveLength(3);
    expect(pts[0].x).toBeCloseTo(10); // padX
    expect(pts[2].x).toBeCloseTo(190); // width - padX
    expect(pts[1].x).toBeCloseTo(100); // midpoint
  });

  it("maps the fixed [0,1] domain with y growing downward", () => {
    // A synthetic series: 0% sits at the bottom, 100% at the top.
    const series = toTrendSeries([
      fit("lo", { resume: 0, predictive: 0, sor: 0, sos: 0 }),
      fit("hi", { resume: 1, predictive: 0, sor: 0, sos: 0 }),
    ]);
    const pts = seriesToPoints(series[0], GEO);
    expect(pts[0].y).toBeCloseTo(34); // 0% -> bottom (height - padY)
    expect(pts[1].y).toBeCloseTo(6); // 100% -> top (padY)
  });

  it("centers a single point horizontally", () => {
    const series = toTrendSeries([fit("only", BASELINE)]);
    const pts = seriesToPoints(series[0], GEO);
    expect(pts).toHaveLength(1);
    expect(pts[0].x).toBeCloseTo(100); // (width) / 2
  });
});

describe("pointsToPolyline", () => {
  it("formats rounded x,y pairs separated by spaces", () => {
    expect(
      pointsToPolyline([
        { x: 10, y: 6 },
        { x: 100.126, y: 20.5 },
      ]),
    ).toBe("10,6 100.13,20.5");
  });
});
