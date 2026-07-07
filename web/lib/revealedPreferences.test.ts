import { afterEach, describe, expect, it, vi } from "vitest";

import {
  finalFit2025,
  loadRevealedPreferences,
  parseRevealedPreferences,
  revealedPreferencesEnabled,
} from "@/lib/revealedPreferences";
import type { RevealedPreferencesPayload } from "@/lib/types";

const WEIGHTS = { resume: 0.65, predictive: 0.2, sor: 0.15, sos: 0.0 };

function validPayload(): Record<string, unknown> {
  return {
    schema_version: 1,
    research_only: true,
    generated_at: "2026-07-07T00:00:00+00:00",
    requested_years: [2025],
    production_baseline: { resume: 0.4, predictive: 0.3, sor: 0.2, sos: 0.1 },
    disclaimer:
      "Under Selection Room's four-factor model, the committee's published top 25 looks more résumé-heavy and less predictive-driven than Selection Room's baseline.",
    disclaimer_short:
      "These weights are descriptive approximations, not the committee's actual weights.",
    badge_explainers: {
      "Edge-weight fit": "One or more factors landed near 0% or very high.",
    },
    warning_badges: ["Research-only", "Directional, not exact"],
    entries: [
      {
        research_only: true,
        objective: "rank_error_top25",
        search_step: 0.05,
        committee_rank_source: "historical_fixture",
        year: 2025,
        week: 15,
        fitted_weights: WEIGHTS,
        near_optimal_count: 9,
        near_optimal_spread_pp: { resume: 15 },
        near_optimal_region: [],
        baseline_delta_pp: {
          production: { resume: 25, predictive: -10, sor: -5, sos: -10 },
        },
        fit_quality: {
          rank_error: 2.12,
          spearman_top12: 0.94,
          baseline_rank_error: 3.76,
          top12_overlap: 0.92,
          field_overlap: 0.92,
          brier: 0.17,
        },
        fit_warning: null,
        warning_badges: ["Research-only", "Directional, not exact"],
        interpretation: {
          headline: "More résumé-heavy",
          confidence: "directional",
          warning: null,
        },
        teams_helped: [],
        teams_hurt: [],
        focus_team_shifts: {},
        explanation_scope: { explains: [], does_not_explain: [] },
      },
    ],
    public_case_2025: null,
    caveats: ["Research mode only."],
  };
}

describe("parseRevealedPreferences (fail closed)", () => {
  it("accepts a payload matching the frozen contract", () => {
    const payload = parseRevealedPreferences(JSON.stringify(validPayload()));
    expect(payload).not.toBeNull();
    expect(payload?.disclaimer).toContain("published top 25");
  });

  it("returns null when the file is missing", () => {
    expect(parseRevealedPreferences(null)).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    expect(parseRevealedPreferences("{not json")).toBeNull();
  });

  it("returns null when research_only is not true", () => {
    const tampered = { ...validPayload(), research_only: false };
    expect(parseRevealedPreferences(JSON.stringify(tampered))).toBeNull();
  });

  it("returns null on schema_version mismatch", () => {
    const tampered = { ...validPayload(), schema_version: 2 };
    expect(parseRevealedPreferences(JSON.stringify(tampered))).toBeNull();
  });

  it("returns null when the disclaimer is missing or empty", () => {
    const noDisclaimer = { ...validPayload() };
    delete (noDisclaimer as Record<string, unknown>).disclaimer;
    expect(parseRevealedPreferences(JSON.stringify(noDisclaimer))).toBeNull();

    const empty = { ...validPayload(), disclaimer: "" };
    expect(parseRevealedPreferences(JSON.stringify(empty))).toBeNull();
  });

  it("returns null when disclaimer_short is missing", () => {
    const tampered = { ...validPayload() };
    delete (tampered as Record<string, unknown>).disclaimer_short;
    expect(parseRevealedPreferences(JSON.stringify(tampered))).toBeNull();
  });

  it("returns null when an entry is off-contract", () => {
    const base = validPayload();
    const entries = base.entries as Record<string, unknown>[];
    delete entries[0].warning_badges;
    expect(parseRevealedPreferences(JSON.stringify(base))).toBeNull();
  });

  it("returns null when an entry is not marked research-only", () => {
    const base = validPayload();
    const entries = base.entries as Record<string, unknown>[];
    entries[0].research_only = false;
    expect(parseRevealedPreferences(JSON.stringify(base))).toBeNull();
  });
});

describe("env gate (NEXT_PUBLIC_ENABLE_REVEALED_PREFS)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled unless the flag is exactly 'true'", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REVEALED_PREFS", "");
    expect(revealedPreferencesEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REVEALED_PREFS", "1");
    expect(revealedPreferencesEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REVEALED_PREFS", "true");
    expect(revealedPreferencesEnabled()).toBe(true);
  });

  it("loader returns null when the gate is off, even if an artifact exists", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REVEALED_PREFS", "");
    expect(await loadRevealedPreferences()).toBeNull();
  });
});

describe("finalFit2025", () => {
  it("selects the 2025 week-15 entry", () => {
    const payload = parseRevealedPreferences(
      JSON.stringify(validPayload()),
    ) as RevealedPreferencesPayload;
    expect(finalFit2025(payload)?.year).toBe(2025);
  });

  it("returns null when no 2025 final entry exists", () => {
    const base = validPayload();
    const entries = base.entries as { year: number }[];
    entries[0].year = 2024;
    const payload = parseRevealedPreferences(
      JSON.stringify(base),
    ) as RevealedPreferencesPayload;
    expect(finalFit2025(payload)).toBeNull();
  });
});
