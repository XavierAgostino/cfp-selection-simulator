import { describe, expect, it } from "vitest";

import { runFreshness } from "@/lib/runDisplay";
import type { DataSource, RunSummary } from "@/lib/types";

function makeRun(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    stem: "2025-w15",
    run_id: "2025-w15",
    scenario_id: "base",
    season: 2025,
    week: 15,
    ruleset: "2025_plus",
    data_source: "cfbd",
    champion_source: "projected",
    generated_at: "2025-12-07T20:04:00.000Z",
    has_bracket: true,
    has_sensitivity: true,
    simulator_version: "1.0.0",
    config_hash: "abc123def456",
    weights: { resume: 0.4, predictive: 0.3, sor: 0.2, sos: 0.1 },
    label: "2025 Week 15 · Base",
    ...overrides,
  };
}

/** now = generated_at + `days` (plus a few hours so partial days floor cleanly). */
function daysAfter(generatedAt: string, days: number): Date {
  return new Date(new Date(generatedAt).getTime() + days * 86_400_000 + 3_600_000);
}

describe("runFreshness — live runs", () => {
  const generated = "2025-12-07T20:04:00.000Z";

  it("same day reads as fresh and 'today'", () => {
    const f = runFreshness(makeRun({ generated_at: generated }), daysAfter(generated, 0));
    expect(f).toMatchObject({ tone: "fresh", label: "Updated today", live: true });
  });

  it("one day ago reads as 'yesterday'", () => {
    const f = runFreshness(makeRun({ generated_at: generated }), daysAfter(generated, 1));
    expect(f).toMatchObject({ tone: "fresh", label: "Updated yesterday" });
  });

  it("mid-week reads as fresh with a day count", () => {
    const f = runFreshness(makeRun({ generated_at: generated }), daysAfter(generated, 5));
    expect(f).toMatchObject({ tone: "fresh", label: "Updated 5 days ago" });
  });

  it("eight days is the fresh boundary", () => {
    expect(runFreshness(makeRun({ generated_at: generated }), daysAfter(generated, 8)).tone).toBe("fresh");
  });

  it("a cycle behind reads as aging", () => {
    const f = runFreshness(makeRun({ generated_at: generated }), daysAfter(generated, 12));
    expect(f).toMatchObject({ tone: "aging", label: "Updated 12 days ago" });
  });

  it("weeks behind reads as stale and switches to weeks", () => {
    const f = runFreshness(makeRun({ generated_at: generated }), daysAfter(generated, 20));
    expect(f).toMatchObject({ tone: "stale", label: "Updated 3 weeks ago" });
  });

  it("carries the absolute timestamp in detail", () => {
    const f = runFreshness(makeRun({ generated_at: generated }), daysAfter(generated, 3));
    expect(f.detail).toContain("2025");
  });
});

describe("runFreshness — sample runs", () => {
  it("never goes stale; uses a neutral generated-on framing", () => {
    const old = "2023-01-01T12:00:00.000Z";
    const f = runFreshness(
      makeRun({ data_source: "sample", generated_at: old }),
      new Date("2026-07-05T12:00:00.000Z"),
    );
    expect(f.tone).toBe("static");
    expect(f.live).toBe(false);
    expect(f.label).toMatch(/^Generated /);
  });
});

describe("runFreshness — bad input", () => {
  it("falls back to static when the timestamp is unparseable", () => {
    const f = runFreshness(
      makeRun({ data_source: "cfbd" as DataSource, generated_at: "not-a-date" }),
      new Date("2026-07-05T12:00:00.000Z"),
    );
    expect(f.tone).toBe("static");
  });
});
