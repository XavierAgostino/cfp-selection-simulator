import { promises as fs } from "fs";
import path from "path";

import { REPO_DIR } from "@/lib/paths";
import { revealedPreferencesEnabled } from "@/lib/revealedPreferences";
import type {
  RevealedWeeklyFit,
  RevealedWeeklyPayload,
  RevealedWeeklySeason,
} from "@/lib/types";

/**
 * Research-only weekly volatility artifact. Like revealed-preferences.json it
 * is read straight from the engine's output directory — never from
 * web/lib/fixtures or /api/data — so it cannot ship by accident
 * (see docs/api-contracts.md).
 */
const ARTIFACT_PATH = path.join(
  REPO_DIR,
  "data",
  "output",
  "calibration",
  "revealed-preferences-weekly.json",
);

function isWeights(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const w = value as Record<string, unknown>;
  return ["resume", "predictive", "sor", "sos"].every(
    (key) => typeof w[key] === "number",
  );
}

function isFit(value: unknown): value is RevealedWeeklyFit {
  if (typeof value !== "object" || value === null) return false;
  const fit = value as Record<string, unknown>;
  return (
    fit.research_only === true &&
    (typeof fit.source === "string" || fit.source === null) &&
    typeof fit.games_through_week === "number" &&
    isWeights(fit.fitted_weights) &&
    Array.isArray(fit.warning_badges) &&
    typeof fit.confidence === "string" &&
    typeof fit.fit_quality === "object" &&
    fit.fit_quality !== null
  );
}

function isSeason(value: unknown): value is RevealedWeeklySeason {
  if (typeof value !== "object" || value === null) return false;
  const season = value as Record<string, unknown>;
  if (typeof season.season !== "number") return false;
  if (!Array.isArray(season.weekly_fits) || season.weekly_fits.length < 2) {
    return false;
  }
  if (!season.weekly_fits.every(isFit)) return false;
  const volatility = season.volatility as Record<string, unknown> | null;
  return (
    typeof volatility === "object" &&
    volatility !== null &&
    typeof volatility.releases_compared === "number" &&
    typeof volatility.mean_abs_shift_pp === "object" &&
    typeof volatility.max_abs_shift_pp === "object"
  );
}

function isPayload(value: unknown): value is RevealedWeeklyPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.research_only === true &&
    payload.schema_version === 1 &&
    typeof payload.disclaimer === "string" &&
    payload.disclaimer.length > 0 &&
    isWeights(payload.production_baseline) &&
    Array.isArray(payload.caveats) &&
    Array.isArray(payload.seasons) &&
    payload.seasons.length > 0 &&
    payload.seasons.every(isSeason)
  );
}

/**
 * Fail-closed parse: null on malformed JSON, off-contract shape, or a payload
 * not marked research-only. Pure so the guard is unit-testable.
 */
export function parseRevealedWeekly(
  raw: string | null,
): RevealedWeeklyPayload | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isPayload(parsed) ? parsed : null;
}

/**
 * Fail-closed loader: returns null when the env gate is off
 * (NEXT_PUBLIC_ENABLE_REVEALED_PREFS, shared with the final-fit card) or the
 * artifact is missing, unreadable, malformed, off-contract, or not marked
 * research-only. Callers must render nothing at all on null — no fallback
 * copy, no partial tracker.
 */
export async function loadRevealedWeekly(): Promise<RevealedWeeklyPayload | null> {
  if (!revealedPreferencesEnabled()) return null;
  let raw: string;
  try {
    raw = await fs.readFile(ARTIFACT_PATH, "utf-8");
  } catch {
    return null;
  }
  return parseRevealedWeekly(raw);
}

/** The v1 tracker renders the most recent season with weekly fits. */
export function latestWeeklySeason(
  payload: RevealedWeeklyPayload,
): RevealedWeeklySeason | null {
  if (payload.seasons.length === 0) return null;
  return payload.seasons.reduce((latest, season) =>
    season.season > latest.season ? season : latest,
  );
}
