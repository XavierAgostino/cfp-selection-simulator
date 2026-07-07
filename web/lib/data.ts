import { headers } from "next/headers";
import type {
  AuditPayload,
  BracketPayload,
  CommitteeComparisonPayload,
  FieldPayload,
  LatestPayload,
  RankingsPayload,
  RunsPayload,
  SensitivityPayload,
  TeamAssetsPayload,
  TeamResumesPayload,
  ValidationPayload,
} from "@/lib/types";
import { getSiteUrl } from "@/lib/site";

/** Thrown when a requested data file does not exist yet (HTTP 404). */
export class NotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`Data file not found: ${path}`);
    this.name = "NotFoundError";
  }
}

export type RunFileKind =
  | "rankings"
  | "field"
  | "bracket"
  | "audit"
  | "team-resumes"
  | "sensitivity"
  | "committee";

interface RunFilePayloadMap {
  rankings: RankingsPayload;
  field: FieldPayload;
  bracket: BracketPayload;
  audit: AuditPayload;
  "team-resumes": TeamResumesPayload;
  sensitivity: SensitivityPayload;
  committee: CommitteeComparisonPayload;
}

const DATA_BASE_PATH = "/api/data";

/**
 * Server Components can't use relative fetch() URLs, so we derive an
 * absolute origin from the incoming request headers. In the browser, a
 * relative path is used directly.
 */
async function resolveUrl(path: string): Promise<string> {
  if (typeof window !== "undefined") {
    return `${DATA_BASE_PATH}/${path}`;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const origin = host
    ? `${protocol}://${host}`
    : getSiteUrl();
  return `${origin}${DATA_BASE_PATH}/${path}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = await resolveUrl(path);
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) {
    throw new NotFoundError(path);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Index of every run the exporter has produced, driving the season/week switcher. */
export function getRuns(): Promise<RunsPayload> {
  return fetchJson<RunsPayload>("runs.json");
}

/** Metadata for the most recently generated run. */
export function getLatest(): Promise<LatestPayload> {
  return fetchJson<LatestPayload>("latest.json");
}

/**
 * Fetch one of the per-run payloads. Pass `stem: null` for the latest run
 * (served from the flat copies at the root of data/output/api), or a run
 * stem like "2025_week15" to read from runs/{stem}/{kind}.json.
 */
export function getRunFile<K extends RunFileKind>(
  stem: string | null,
  kind: K,
): Promise<RunFilePayloadMap[K]> {
  const path = stem ? `runs/${stem}/${kind}.json` : `${kind}.json`;
  return fetchJson<RunFilePayloadMap[K]>(path);
}

/** Team logo/color/id passthrough, keyed by team name. */
export function getTeamAssets(): Promise<TeamAssetsPayload> {
  return fetchJson<TeamAssetsPayload>("team-assets.json");
}

/**
 * Repo-level historical validation of the model against the real CFP committee.
 * Optional artifact — only present after `sroom validate` runs over historical
 * seasons. Returns null when absent so the page can show an honest empty state.
 */
export async function getValidationData(): Promise<ValidationPayload | null> {
  try {
    return await fetchJson<ValidationPayload>("validation.json");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

/**
 * Research-only Committee Tendencies artifacts. Served through the same
 * /api/data path as every other repo-level file (seeded from
 * web/lib/fixtures on both local and hosted), so the caller can render the
 * public cards without depending on a gitignored calibration directory.
 * Returned unvalidated: revealedPreferences/revealedWeekly run the fail-closed
 * contract guard before anything renders. Null when the artifact is absent.
 */
export async function getRevealedPreferencesData(): Promise<unknown | null> {
  try {
    return await fetchJson<unknown>("revealed-preferences.json");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export async function getRevealedWeeklyData(): Promise<unknown | null> {
  try {
    return await fetchJson<unknown>("revealed-preferences-weekly.json");
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}
