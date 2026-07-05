import {
  createAndStartHostedRun,
  getActiveJob,
  type DataSource,
  type RunJobRecord,
  type RunJobRequest,
} from "@/lib/runJob";

/**
 * Official weekly run — the automated launch that keeps the hosted catalog's
 * default field current without anyone kicking it off by hand.
 *
 * It fires Tuesday night ET (see `web/trigger/weekly-official-run.ts`), right
 * after the CFP selection committee releases its weekly rankings, and analyzes
 * the *latest committee week* — auto-detected from CFBD's rankings feed so the
 * run mirrors what the committee just published. Everything here is env-gated
 * and dormant by default: nothing launches unless
 * `SELECTION_ROOM_OFFICIAL_RUN_ENABLED` is set, so the schedule can ship now and
 * stay quiet (and spend zero CFBD quota) until the season is live.
 *
 * The helpers are split so the decision logic is pure and unit-testable; only
 * `detectLatestCommitteeWeek` / `createOfficialRun` / `runWeeklyOfficialRun`
 * touch the network or the database.
 */

const CFBD_RANKINGS_URL = "https://api.collegefootballdata.com/rankings";

/** CFBD labels the committee poll exactly this; match loosely to be safe. */
const COMMITTEE_POLL_MATCH = "playoff committee";

type Env = Record<string, string | undefined>;
type FetchImpl = typeof fetch;

export interface OfficialRunTarget {
  season: number;
  week: number;
  source: DataSource;
}

export interface OfficialRunResolution {
  /** The resolved target, or null when nothing should run this cycle. */
  target: OfficialRunTarget | null;
  /** Human-readable reason when `target` is null (for dashboard logs). */
  reason: string | null;
}

export interface WeeklyOfficialRunResult {
  status: "launched" | "skipped";
  reason?: string;
  job_id?: string;
  season?: number;
  week?: number;
  source?: DataSource;
}

function truthy(value: string | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Master switch — the schedule is inert until this is explicitly enabled. */
export function officialRunEnabled(env: Env = process.env): boolean {
  return truthy(env.SELECTION_ROOM_OFFICIAL_RUN_ENABLED);
}

/** Official runs use live CFBD data by default; `sample` is for off-season testing. */
export function resolveOfficialSource(env: Env = process.env): DataSource {
  return env.SELECTION_ROOM_OFFICIAL_RUN_SOURCE?.trim().toLowerCase() === "sample"
    ? "sample"
    : "cfbd";
}

/**
 * The CFP season year for an instant. Games run Aug–Dec and the playoff spills
 * into Jan, so Jan–Jul belongs to the *previous* fall's season. Override with
 * `SELECTION_ROOM_OFFICIAL_RUN_SEASON` (a year, or `auto`).
 */
export function resolveOfficialSeason(env: Env = process.env, now: Date = new Date()): number {
  const override = env.SELECTION_ROOM_OFFICIAL_RUN_SEASON?.trim();
  if (override && override.toLowerCase() !== "auto") {
    const parsed = Number.parseInt(override, 10);
    if (Number.isInteger(parsed)) return parsed;
  }
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1–12
  return month >= 8 ? year : year - 1;
}

/**
 * Given CFBD's `/rankings` payload, return the highest week that carries a
 * "Playoff Committee Rankings" poll, or null if the committee hasn't published
 * yet (true for roughly the first two months of the season).
 */
export function latestCommitteeWeek(rankings: unknown): number | null {
  if (!Array.isArray(rankings)) return null;
  let latest: number | null = null;
  for (const entry of rankings) {
    if (!entry || typeof entry !== "object") continue;
    const week = (entry as { week?: unknown }).week;
    if (typeof week !== "number") continue;
    const polls = (entry as { polls?: unknown }).polls;
    const hasCommittee =
      Array.isArray(polls) &&
      polls.some((poll) => {
        const name = poll && typeof poll === "object" ? (poll as { poll?: unknown }).poll : null;
        return typeof name === "string" && name.toLowerCase().includes(COMMITTEE_POLL_MATCH);
      });
    if (hasCommittee && (latest === null || week > latest)) latest = week;
  }
  return latest;
}

/** Query CFBD for the newest committee-ranking week of a season. */
export async function detectLatestCommitteeWeek(
  season: number,
  apiKey: string,
  fetchImpl: FetchImpl = fetch,
): Promise<number | null> {
  const url = `${CFBD_RANKINGS_URL}?year=${season}&seasonType=regular`;
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`CFBD rankings request failed (${response.status})`);
  }
  return latestCommitteeWeek(await response.json());
}

/**
 * Resolve what this cycle should analyze. Returns a null target (with a reason)
 * rather than throwing whenever there's nothing sensible to run — off-season,
 * no committee poll yet, missing key, or a bad override — so the scheduled task
 * can log and move on without failing the run.
 */
export async function resolveOfficialRunTarget(
  opts: { env?: Env; now?: Date; fetchImpl?: FetchImpl } = {},
): Promise<OfficialRunResolution> {
  const env = opts.env ?? process.env;
  const now = opts.now ?? new Date();
  const fetchImpl = opts.fetchImpl ?? fetch;

  const source = resolveOfficialSource(env);
  const season = resolveOfficialSeason(env, now);

  const rawWeek = env.SELECTION_ROOM_OFFICIAL_RUN_WEEK?.trim();
  const explicitWeek = rawWeek && rawWeek.toLowerCase() !== "auto";

  if (explicitWeek) {
    const parsed = Number.parseInt(rawWeek, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 16) {
      return {
        target: null,
        reason: `Invalid SELECTION_ROOM_OFFICIAL_RUN_WEEK: "${rawWeek}" (expected 1–16).`,
      };
    }
    return { target: { season, week: parsed, source }, reason: null };
  }

  // Auto week detection reads the committee poll from CFBD, so it needs a key.
  if (source === "sample") {
    return {
      target: null,
      reason:
        "Sample source needs an explicit SELECTION_ROOM_OFFICIAL_RUN_WEEK — auto week detection requires CFBD.",
    };
  }

  const apiKey = env.CFBD_API_KEY?.trim();
  if (!apiKey) {
    return { target: null, reason: "CFBD_API_KEY is not set; cannot auto-detect the committee week." };
  }

  let week: number | null;
  try {
    week = await detectLatestCommitteeWeek(season, apiKey, fetchImpl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return { target: null, reason: `Committee week lookup failed: ${message}` };
  }
  if (week === null) {
    return { target: null, reason: `No committee rankings published yet for ${season}.` };
  }
  return { target: { season, week, source }, reason: null };
}

/**
 * Launch an official run for a resolved target. Reuses the same job-creation +
 * `run-hosted-job` enqueue path as user runs, but with a null `user_id` so it
 * doesn't count against anyone's per-user quota.
 */
export async function createOfficialRun(target: OfficialRunTarget): Promise<RunJobRecord> {
  const request: RunJobRequest = {
    season: target.season,
    week: target.week,
    data_source: target.source,
  };
  return createAndStartHostedRun(request, null);
}

/**
 * The scheduled task's body. Guards on the master switch, avoids stacking on top
 * of an in-flight run, resolves the target, and launches. Every early return is
 * a benign "skipped" with a reason — the task never throws on an off-season or
 * quiet-week cycle.
 */
export async function runWeeklyOfficialRun(
  opts: { env?: Env; now?: Date; fetchImpl?: FetchImpl } = {},
): Promise<WeeklyOfficialRunResult> {
  const env = opts.env ?? process.env;

  if (!officialRunEnabled(env)) {
    return { status: "skipped", reason: "disabled (set SELECTION_ROOM_OFFICIAL_RUN_ENABLED=1 to activate)" };
  }

  const active = await getActiveJob();
  if (active && (active.status === "queued" || active.status === "running")) {
    return { status: "skipped", reason: `a run is already active (${active.job_id})` };
  }

  const { target, reason } = await resolveOfficialRunTarget(opts);
  if (!target) {
    return { status: "skipped", reason: reason ?? "no target resolved" };
  }

  const job = await createOfficialRun(target);
  return {
    status: "launched",
    job_id: job.job_id,
    season: target.season,
    week: target.week,
    source: target.source,
  };
}
