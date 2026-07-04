import { randomBytes } from "crypto";

import {
  getJobStore,
  getRunExecutor,
} from "@/lib/runtime";
import { engineAvailable } from "@/lib/runtime/run-executor/local";
import { loadRepoEnv } from "@/lib/repoEnv";
import {
  BASE_SCENARIO_ID,
  parseScenarioWeights,
  weightsScenarioId,
  type ScenarioWeights,
} from "@/lib/scenarioWeights";

loadRepoEnv();

export type DataSource = "sample" | "cfbd";

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface RunJobRequest {
  season: number;
  week: number;
  data_source: DataSource;
  /** Scenario Lab weight overrides. Absent ⇒ a base run with engine defaults. */
  weights?: ScenarioWeights;
}

export interface RunJobRecord {
  job_id: string;
  status: JobStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  request: RunJobRequest;
  stem: string | null;
  error: string | null;
  pid: number | null;
  exit_code: number | null;
}

export interface RunCapabilities {
  run_generation_enabled: boolean;
  engine_available: boolean;
  storage_writable: boolean;
  live_cfbd_enabled: boolean;
  active_job_id: string | null;
  runtime: "persistent_node";
  supports_background_jobs: boolean;
}

export function runJobsEnvEnabled(): boolean {
  const value = process.env.SELECTION_ROOM_ENABLE_RUN_JOBS;
  return value === "1" || value === "true";
}

export function liveCfbdEnabled(): boolean {
  return Boolean(process.env.CFBD_API_KEY?.trim());
}

export function liveRunThrottleMinutes(): number {
  const raw = process.env.SELECTION_ROOM_LIVE_RUN_THROTTLE_MINUTES ?? "5";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 5;
  return parsed;
}

export { engineAvailable };

function newJobId(): string {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    "_",
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
  ].join("");
  const suffix = randomBytes(3).toString("hex");
  return `run_${stamp}_${suffix}`;
}

export async function storageWritable(): Promise<boolean> {
  return getJobStore().isStorageWritable();
}

export async function getJob(jobId: string): Promise<RunJobRecord | null> {
  return getJobStore().getJob(jobId);
}

export async function listRecentJobs(limit = 20): Promise<RunJobRecord[]> {
  return getJobStore().listRecentJobs(limit);
}

export async function getActiveJob(): Promise<RunJobRecord | null> {
  return getJobStore().getActiveJob();
}

export async function readLogTail(
  jobId: string,
  maxLines = 200,
): Promise<string[]> {
  return getJobStore().readLogTail(jobId, maxLines);
}

export async function getCapabilities(): Promise<RunCapabilities> {
  const engine = engineAvailable();
  const storage = await storageWritable();
  const envEnabled = runJobsEnvEnabled();
  const active = await getActiveJob();

  return {
    run_generation_enabled: envEnabled && engine && storage,
    engine_available: engine,
    storage_writable: storage,
    live_cfbd_enabled: liveCfbdEnabled(),
    active_job_id:
      active && (active.status === "running" || active.status === "queued")
        ? active.job_id
        : null,
    runtime: "persistent_node",
    supports_background_jobs: envEnabled,
  };
}

export async function createAndStartRun(
  request: RunJobRequest,
): Promise<RunJobRecord> {
  const jobStore = getJobStore();
  const caps = await getCapabilities();
  if (!caps.run_generation_enabled) {
    throw new Error("run_generation_disabled");
  }

  if (request.data_source === "cfbd" && !caps.live_cfbd_enabled) {
    throw new Error("cfbd_unavailable");
  }

  if (request.data_source === "cfbd") {
    await jobStore.assertLiveThrottleAllowed();
  }

  await jobStore.assertNoActiveJob();

  const job: RunJobRecord = {
    job_id: newJobId(),
    status: "queued",
    created_at: new Date().toISOString(),
    started_at: null,
    finished_at: null,
    request,
    stem: null,
    error: null,
    pid: null,
    exit_code: null,
  };

  await jobStore.createJob(job);
  await jobStore.setActivePointer(job.job_id, null);

  if (request.data_source === "cfbd") {
    await jobStore.recordLiveRunStarted();
  }

  await getRunExecutor().enqueueJob(job.job_id);

  return job;
}

/** Parse POST body into a normalized run request. */
export function parseRunRequest(body: unknown): RunJobRequest | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;

  const seasonRaw = record.season ?? record.year;
  const weekRaw = record.week;

  let dataSource: DataSource | null = null;
  if (record.data_source === "sample" || record.data_source === "cfbd") {
    dataSource = record.data_source;
  } else if (typeof record.sample === "boolean") {
    dataSource = record.sample ? "sample" : "cfbd";
  }

  if (
    typeof seasonRaw !== "number" ||
    !Number.isInteger(seasonRaw) ||
    seasonRaw < 2014 ||
    seasonRaw > 2035 ||
    typeof weekRaw !== "number" ||
    !Number.isInteger(weekRaw) ||
    weekRaw < 1 ||
    weekRaw > 16 ||
    dataSource === null
  ) {
    return null;
  }

  const request: RunJobRequest = {
    season: seasonRaw,
    week: weekRaw,
    data_source: dataSource,
  };

  if (record.weights !== undefined) {
    const weights = parseScenarioWeights(record.weights);
    if (weights === null) return null;
    if (weightsScenarioId(weights) !== BASE_SCENARIO_ID) {
      request.weights = weights;
    }
  }

  return request;
}
