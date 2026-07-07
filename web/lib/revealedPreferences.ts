import { getRevealedPreferencesData } from "@/lib/data";
import type {
  RevealedPreferencesEntry,
  RevealedPreferencesPayload,
} from "@/lib/types";

const ENTRY_REQUIRED_KEYS = [
  "research_only",
  "year",
  "week",
  "fitted_weights",
  "fit_quality",
  "interpretation",
  "warning_badges",
  "explanation_scope",
] as const;

function isWeights(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const w = value as Record<string, unknown>;
  return ["resume", "predictive", "sor", "sos"].every(
    (key) => typeof w[key] === "number",
  );
}

function isEntry(value: unknown): value is RevealedPreferencesEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  if (ENTRY_REQUIRED_KEYS.some((key) => !(key in entry))) return false;
  return (
    entry.research_only === true &&
    typeof entry.year === "number" &&
    typeof entry.week === "number" &&
    isWeights(entry.fitted_weights) &&
    Array.isArray(entry.warning_badges) &&
    typeof entry.interpretation === "object" &&
    entry.interpretation !== null
  );
}

function isPayload(value: unknown): value is RevealedPreferencesPayload {
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
    Array.isArray(payload.warning_badges) &&
    Array.isArray(payload.caveats) &&
    isWeights(payload.production_baseline) &&
    Array.isArray(payload.entries) &&
    payload.entries.every(isEntry)
  );
}

/**
 * Fail-closed guard over an already-parsed value: returns the payload only
 * when it matches the frozen contract and is marked research-only, else null.
 * Pure, so the guard is unit-testable independent of the fetch.
 */
export function validateRevealedPreferences(
  value: unknown,
): RevealedPreferencesPayload | null {
  return isPayload(value) ? value : null;
}

/**
 * Fail-closed parse from raw JSON text: null on malformed JSON or off-contract
 * shape. Retained for unit tests; the loader validates the parsed object.
 */
export function parseRevealedPreferences(
  raw: string | null,
): RevealedPreferencesPayload | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return validateRevealedPreferences(parsed);
}

/**
 * Fail-closed loader: reads revealed-preferences.json through /api/data (the
 * committed fixture path, so it renders on Vercel) and returns null when the
 * artifact is absent, malformed, off-contract, or not marked research-only.
 * Callers must render nothing at all on null: no fallback copy, no partial
 * card.
 */
export async function loadRevealedPreferences(): Promise<RevealedPreferencesPayload | null> {
  const raw = await getRevealedPreferencesData();
  if (raw === null) return null;
  return validateRevealedPreferences(raw);
}

/** The v1 card renders the 2025 final fit only. */
export function finalFit2025(
  payload: RevealedPreferencesPayload,
): RevealedPreferencesEntry | null {
  return (
    payload.entries.find((entry) => entry.year === 2025 && entry.week === 15) ??
    null
  );
}
