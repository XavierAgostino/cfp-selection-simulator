import { randomBytes } from "crypto";

import {
  getJobStore,
  getRunExecutor,
  getRuntimeSummary,
} from "@/lib/runtime";
import {
  isBetaAccessConfigured,
  validateBetaAccessCode,
} from "@/lib/runtime/beta-access";
import {
  isHostedRuntimeConfigured,
  isRunExecutorConfigured,
  liveRunThrottleMinutes as readLiveRunThrottleMinutes,
} from "@/lib/runtime/config";
import { HostedRunError } from "@/lib/runtime/errors";
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

export interface LocalRunCapabilities {
  run_generation_enabled: boolean;
  engine_available: boolean;
  storage_writable: boolean;
  live_cfbd_enabled: boolean;
  active_job_id: string | null;
  runtime: "persistent_node";
  supports_background_jobs: boolean;
}

export interface HostedRunCapabilities {
  run_generation_enabled: boolean;
  engine_available: boolean;
  storage_writable: boolean;
  live_cfbd_enabled: boolean;
  active_job_id: string | null;
  runtime: "hosted";
  supports_background_jobs: boolean;
  hosted_run_generation_available: boolean;
  requires_beta_code: boolean;
  daily_jobs_remaining: number | null;
  artifact_store: "filesystem" | "supabase";
  job_store: "postgres";
  executor_configured: boolean;
  disabled_reason: string | null;
}

export type RunCapabilities = LocalRunCapabilities | HostedRunCapabilities;

export function runJobsEnvEnabled(): boolean {
  const value = process.env.SELECTION_ROOM_ENABLE_RUN_JOBS;
  return value === "1" || value === "true";
}

export function liveCfbdEnabled(): boolean {
  return Boolean(process.env.CFBD_API_KEY?.trim());
}

export function liveRunThrottleMinutes(): number {
  return readLiveRunThrottleMinutes();
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

function hostedInfrastructureReady(
  summary: ReturnType<typeof getRuntimeSummary>,
): boolean {
  if (!summary.database_configured) return false;
  if (!isBetaAccessConfigured()) return false;
  if (summary.artifact_store === "supabase" && !summary.storage_configured) {
    return false;
  }
  return true;
}

function hostedDisabledReason(
  summary: ReturnType<typeof getRuntimeSummary>,
  executorConfigured: boolean,
): string | null {
  if (!summary.database_configured) {
    return "Postgres metadata store is not configured (SELECTION_ROOM_DATABASE_URL).";
  }
  if (summary.artifact_store === "supabase" && !summary.storage_configured) {
    return "Supabase Storage artifact store is not configured.";
  }
  if (!isBetaAccessConfigured()) {
    return "Beta access codes are not configured.";
  }
  if (!executorConfigured) {
    return "Trigger.dev worker is not configured (TRIGGER_SECRET_KEY and SELECTION_ROOM_HOSTED_EXECUTOR=trigger).";
  }
  return null;
}

async function getLocalCapabilities(): Promise<LocalRunCapabilities> {
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

async function getHostedCapabilities(): Promise<HostedRunCapabilities> {
  const summary = getRuntimeSummary();
  const executorConfigured = isRunExecutorConfigured();
  const hostedAvailable = hostedInfrastructureReady(summary);

  let storageWritableFlag = false;
  let activeJobId: string | null = null;
  let dailyRemaining: number | null = null;

  if (summary.database_configured) {
    try {
      const jobStore = getJobStore();
      storageWritableFlag = await jobStore.isStorageWritable();
      const active = await jobStore.getActiveJob();
      activeJobId =
        active && (active.status === "running" || active.status === "queued")
          ? active.job_id
          : null;
      dailyRemaining = await jobStore.getDailyJobsRemaining();
    } catch {
      storageWritableFlag = false;
    }
  }

  const disabledReason = hostedDisabledReason(summary, executorConfigured);
  const runGenerationEnabled = hostedAvailable && executorConfigured;

  return {
    run_generation_enabled: runGenerationEnabled,
    engine_available: false,
    storage_writable: storageWritableFlag,
    live_cfbd_enabled: liveCfbdEnabled(),
    active_job_id: activeJobId,
    runtime: "hosted",
    supports_background_jobs: executorConfigured,
    hosted_run_generation_available: hostedAvailable,
    requires_beta_code: true,
    daily_jobs_remaining: dailyRemaining,
    artifact_store: summary.artifact_store,
    job_store: "postgres",
    executor_configured: executorConfigured,
    disabled_reason: runGenerationEnabled ? null : disabledReason,
  };
}

export async function getCapabilities(): Promise<RunCapabilities> {
  if (isHostedRuntimeConfigured()) {
    return getHostedCapabilities();
  }
  return getLocalCapabilities();
}

export function mapHostedRunError(err: HostedRunError): {
  status: number;
  body: { error: string; disabled_reason?: string };
} {
  switch (err.code) {
    case "invalid_beta_code":
      return { status: 401, body: { error: "invalid_beta_code" } };
    case "run_in_progress":
      return { status: 409, body: { error: "run_in_progress" } };
    case "daily_job_cap_exceeded":
    case "live_run_throttled":
      return { status: 429, body: { error: err.code } };
    case "executor_not_configured":
      return {
        status: 503,
        body: {
          error: "executor_not_configured",
          ...(err.disabledReason ? { disabled_reason: err.disabledReason } : {}),
        },
      };
    case "cfbd_unavailable":
      return { status: 400, body: { error: "cfbd_unavailable" } };
    case "run_generation_disabled":
      return {
        status: 501,
        body: {
          error: "run_generation_disabled",
          ...(err.disabledReason ? { disabled_reason: err.disabledReason } : {}),
        },
      };
    default: {
      const _exhaustive: never = err.code;
      return _exhaustive;
    }
  }
}

/**
 * Validates hosted run gates (beta, caps, CFBD). Does not create jobs until H5.
 * Throws HostedRunError with API-mappable codes.
 */
export async function validateHostedRun(
  request: RunJobRequest,
  betaCode: string | null,
): Promise<void> {
  if (!validateBetaAccessCode(betaCode)) {
    throw new HostedRunError(
      "Beta access code is invalid or missing.",
      "invalid_beta_code",
    );
  }

  const caps = await getHostedCapabilities();
  if (!caps.hosted_run_generation_available) {
    throw new HostedRunError(
      caps.disabled_reason ?? "Hosted run generation is unavailable.",
      "run_generation_disabled",
      caps.disabled_reason,
    );
  }

  if (request.data_source === "cfbd" && !caps.live_cfbd_enabled) {
    throw new HostedRunError("CFBD live data is unavailable.", "cfbd_unavailable");
  }

  const jobStore = getJobStore();

  if (request.data_source === "cfbd") {
    try {
      await jobStore.assertLiveThrottleAllowed();
    } catch (err) {
      if (err instanceof Error && err.message === "live_run_throttled") {
        throw new HostedRunError("Live CFBD run throttled.", "live_run_throttled");
      }
      throw err;
    }
  }

  try {
    await jobStore.assertCanStartJob();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "run_in_progress") {
        throw new HostedRunError("A hosted run is already active.", "run_in_progress");
      }
      if (err.message === "daily_job_cap_exceeded") {
        throw new HostedRunError("Daily hosted job cap reached.", "daily_job_cap_exceeded");
      }
    }
    throw err;
  }

  if (!caps.executor_configured) {
    throw new HostedRunError(
      caps.disabled_reason ?? "Trigger.dev worker is not configured yet (H5).",
      "executor_not_configured",
      caps.disabled_reason,
    );
  }
}

export async function createAndStartHostedRun(
  request: RunJobRequest,
): Promise<RunJobRecord> {
  const jobStore = getJobStore();

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

  if (request.data_source === "cfbd") {
    await jobStore.recordLiveRunStarted();
  }

  try {
    await getRunExecutor().enqueueJob(job.job_id);
  } catch (err) {
    const current = await jobStore.getJob(job.job_id);
    if (current && current.status === "queued") {
      current.status = "failed";
      current.error = "Failed to enqueue hosted worker";
      current.finished_at = new Date().toISOString();
      await jobStore.updateJob(current);
    }
    throw err;
  }

  return job;
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

  await jobStore.assertCanStartJob();

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
