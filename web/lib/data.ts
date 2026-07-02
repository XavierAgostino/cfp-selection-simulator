import { headers } from "next/headers";
import type {
  AuditPayload,
  BracketPayload,
  FieldPayload,
  LatestPayload,
  RankingsPayload,
  RunsPayload,
  TeamAssetsPayload,
  TeamResumesPayload,
} from "@/lib/types";

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
  | "team-resumes";

interface RunFilePayloadMap {
  rankings: RankingsPayload;
  field: FieldPayload;
  bracket: BracketPayload;
  audit: AuditPayload;
  "team-resumes": TeamResumesPayload;
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
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
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
