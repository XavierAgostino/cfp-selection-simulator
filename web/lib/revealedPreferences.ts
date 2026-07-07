import { promises as fs } from "fs";
import path from "path";

import { REPO_DIR } from "@/lib/paths";
import type {
  RevealedPreferencesEntry,
  RevealedPreferencesPayload,
} from "@/lib/types";

/**
 * Research-only artifact. Read straight from the engine's output directory —
 * deliberately NOT from web/lib/fixtures or the /api/data routes, so it can
 * never ship to production by accident (see docs/api-contracts.md).
 */
const ARTIFACT_PATH = path.join(
  REPO_DIR,
  "data",
  "output",
  "calibration",
  "revealed-preferences.json",
);

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
 * Fail-closed parse: null on malformed JSON, off-contract shape, or a payload
 * not marked research-only. Pure so the guard is unit-testable.
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
  return isPayload(parsed) ? parsed : null;
}

/**
 * Env gate on top of the debug query param: the hidden research UI only
 * renders when NEXT_PUBLIC_ENABLE_REVEALED_PREFS=true. The query param alone
 * is not protection if the app is ever deployed with a readable artifact.
 */
export function revealedPreferencesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_REVEALED_PREFS === "true";
}

/**
 * Fail-closed loader: returns null when the env gate is off or the artifact
 * is missing, unreadable, malformed, off-contract, or not marked
 * research-only. Callers must render nothing at all on null — no fallback
 * copy, no partial card.
 */
export async function loadRevealedPreferences(): Promise<RevealedPreferencesPayload | null> {
  if (!revealedPreferencesEnabled()) return null;
  let raw: string;
  try {
    raw = await fs.readFile(ARTIFACT_PATH, "utf-8");
  } catch {
    return null;
  }
  return parseRevealedPreferences(raw);
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
