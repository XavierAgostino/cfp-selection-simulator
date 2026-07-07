import { getRevealedWeeklyData } from "@/lib/data";
import type {
  RevealedWeeklyFit,
  RevealedWeeklyPayload,
  RevealedWeeklySeason,
} from "@/lib/types";

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
  if (typeof season.takeaway !== "string" || season.takeaway.length === 0) {
    return false;
  }
  if (!Array.isArray(season.warning_badges)) return false;
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
    typeof payload.disclaimer_short === "string" &&
    payload.disclaimer_short.length > 0 &&
    typeof payload.badge_explainers === "object" &&
    payload.badge_explainers !== null &&
    isWeights(payload.production_baseline) &&
    Array.isArray(payload.caveats) &&
    Array.isArray(payload.seasons) &&
    payload.seasons.length > 0 &&
    payload.seasons.every(isSeason)
  );
}

/**
 * Fail-closed guard over an already-parsed value: returns the payload only
 * when it matches the contract and is marked research-only, else null. Pure so
 * the guard is unit-testable independent of the fetch.
 */
export function validateRevealedWeekly(
  value: unknown,
): RevealedWeeklyPayload | null {
  return isPayload(value) ? value : null;
}

/**
 * Fail-closed parse from raw JSON text: null on malformed JSON or off-contract
 * shape. Retained for unit tests; the loader validates the parsed object.
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
  return validateRevealedWeekly(parsed);
}

/**
 * Fail-closed loader: reads revealed-preferences-weekly.json through /api/data
 * (the committed fixture path, so it renders on Vercel) and returns null when
 * the artifact is absent, malformed, off-contract, or not marked
 * research-only. Callers must render nothing at all on null: no fallback
 * copy, no partial tracker.
 */
export async function loadRevealedWeekly(): Promise<RevealedWeeklyPayload | null> {
  const raw = await getRevealedWeeklyData();
  if (raw === null) return null;
  return validateRevealedWeekly(raw);
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
