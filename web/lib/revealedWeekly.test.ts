import { afterEach, describe, expect, it, vi } from "vitest";

import {
  latestWeeklySeason,
  loadRevealedWeekly,
  parseRevealedWeekly,
} from "@/lib/revealedWeekly";
import type { RevealedWeeklyPayload } from "@/lib/types";

const WEIGHTS = { resume: 0.65, predictive: 0.2, sor: 0.15, sos: 0.0 };

function fit(gamesThroughWeek: number, release: number | null) {
  return {
    research_only: true,
    ranking_release: release,
    release_date: release ? `2024-11-0${release}` : null,
    source: release
      ? "College Football Playoff selection committee ranking; retrieved from CFBD /rankings"
      : null,
    games_through_week: gamesThroughWeek,
    fitted_weights: WEIGHTS,
    baseline_delta_pp: {
      production: { resume: 25, predictive: -10, sor: -5, sos: -10 },
    },
    prior_release_delta_pp: null,
    fit_quality: {
      rank_error: 2.4,
      spearman_top12: 0.91,
      baseline_rank_error: 3.1,
    },
    confidence: "directional",
    warning_badges: ["Research-only", "Weekly fit (noisier)"],
  };
}

function validPayload(): Record<string, unknown> {
  return {
    schema_version: 1,
    research_only: true,
    generated_at: "2026-07-07T00:00:00+00:00",
    production_baseline: { resume: 0.4, predictive: 0.3, sor: 0.2, sos: 0.1 },
    disclaimer:
      "Under Selection Room's four-factor model, the committee's published top 25 is best approximated by a more résumé-heavy and less predictive-driven blend than baseline.",
    seasons: [
      {
        season: 2024,
        weekly_fits: [fit(10, 1), fit(15, 6)],
        volatility: {
          releases_compared: 1,
          mean_abs_shift_pp: { resume: 5, predictive: 5, sor: 0, sos: 0 },
          max_abs_shift_pp: { resume: 5, predictive: 5, sor: 0, sos: 0 },
          volatility_note: null,
        },
      },
    ],
    caveats: ["Research mode only."],
  };
}

describe("parseRevealedWeekly (fail closed)", () => {
  it("accepts a payload matching the contract", () => {
    const payload = parseRevealedWeekly(JSON.stringify(validPayload()));
    expect(payload).not.toBeNull();
    expect(payload?.seasons[0]?.season).toBe(2024);
  });

  it("returns null when the file is missing", () => {
    expect(parseRevealedWeekly(null)).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    expect(parseRevealedWeekly("{oops")).toBeNull();
  });

  it("returns null when research_only is not true", () => {
    const tampered = { ...validPayload(), research_only: false };
    expect(parseRevealedWeekly(JSON.stringify(tampered))).toBeNull();
  });

  it("returns null on schema_version mismatch", () => {
    const tampered = { ...validPayload(), schema_version: 2 };
    expect(parseRevealedWeekly(JSON.stringify(tampered))).toBeNull();
  });

  it("returns null when the disclaimer is missing", () => {
    const tampered = validPayload();
    delete (tampered as Record<string, unknown>).disclaimer;
    expect(parseRevealedWeekly(JSON.stringify(tampered))).toBeNull();
  });

  it("returns null when production_baseline is absent", () => {
    const tampered = validPayload();
    delete (tampered as Record<string, unknown>).production_baseline;
    expect(parseRevealedWeekly(JSON.stringify(tampered))).toBeNull();
  });

  it("returns null when a season has fewer than two fits", () => {
    const tampered = validPayload();
    const seasons = tampered.seasons as { weekly_fits: unknown[] }[];
    seasons[0].weekly_fits = seasons[0].weekly_fits.slice(0, 1);
    expect(parseRevealedWeekly(JSON.stringify(tampered))).toBeNull();
  });

  it("returns null when a fit is missing its source field", () => {
    const tampered = validPayload();
    const seasons = tampered.seasons as {
      weekly_fits: Record<string, unknown>[];
    }[];
    delete seasons[0].weekly_fits[0].source;
    expect(parseRevealedWeekly(JSON.stringify(tampered))).toBeNull();
  });

  it("returns null when a fit is not marked research-only", () => {
    const tampered = validPayload();
    const seasons = tampered.seasons as {
      weekly_fits: Record<string, unknown>[];
    }[];
    seasons[0].weekly_fits[0].research_only = false;
    expect(parseRevealedWeekly(JSON.stringify(tampered))).toBeNull();
  });

  it("returns null when there are no seasons", () => {
    const tampered = { ...validPayload(), seasons: [] };
    expect(parseRevealedWeekly(JSON.stringify(tampered))).toBeNull();
  });
});

describe("env gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loader returns null when NEXT_PUBLIC_ENABLE_REVEALED_PREFS is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REVEALED_PREFS", "");
    expect(await loadRevealedWeekly()).toBeNull();
  });
});

describe("latestWeeklySeason", () => {
  it("selects the most recent season", () => {
    const base = validPayload();
    const seasons = base.seasons as Record<string, unknown>[];
    seasons.push({ ...seasons[0], season: 2023 });
    const payload = parseRevealedWeekly(
      JSON.stringify(base),
    ) as RevealedWeeklyPayload;
    expect(latestWeeklySeason(payload)?.season).toBe(2024);
  });
});
