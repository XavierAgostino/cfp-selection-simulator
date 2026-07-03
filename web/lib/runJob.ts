import { spawn, type ChildProcess } from "child_process";
import { randomBytes } from "crypto";
import { existsSync } from "fs";
import { appendFile, mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

import {
  ACTIVE_JOB_PATH,
  JOBS_DIR,
  jobLogPath,
  jobMetaPath,
  LIVE_THROTTLE_PATH,
  REPO_DIR,
  RUNS_JSON_PATH,
} from "@/lib/paths";
import { loadRepoEnv } from "@/lib/repoEnv";
import {
  BASE_SCENARIO_ID,
  formatWeightSpec,
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

interface ActiveJobPointer {
  job_id: string;
  pid: number | null;
}

interface RunsIndexWire {
  latest?: { stem: string } | null;
  runs: Array<{
    stem: string;
    run_id: string;
    scenario_id: string;
    data_source: DataSource;
    generated_at: string;
  }>;
}

interface LiveThrottleState {
  last_run_at: string;
}

const LOG_TAIL_LINES = 200;

const REDACTION_PATTERNS: RegExp[] = [
  /CFBD_API_KEY=\S+/gi,
  /Authorization:\s*Bearer\s+\S+/gi,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
];

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

function pythonBin(): string | null {
  const venv = path.join(REPO_DIR, ".venv", "bin", "python");
  if (existsSync(venv)) return venv;
  return existsSync(path.join(REPO_DIR, "src", "cli", "main.py"))
    ? "python3"
    : null;
}

export function engineAvailable(): boolean {
  return pythonBin() !== null;
}

function redactLogLine(line: string): string {
  let out = line;
  for (const pattern of REDACTION_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

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

async function ensureJobsDir(): Promise<void> {
  await mkdir(JOBS_DIR, { recursive: true });
}

export async function storageWritable(): Promise<boolean> {
  try {
    await ensureJobsDir();
    const probe = path.join(JOBS_DIR, ".write_probe");
    await writeFile(probe, "ok", "utf-8");
    await unlink(probe);
    return true;
  } catch {
    return false;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJob(job: RunJobRecord): Promise<void> {
  await ensureJobsDir();
  await writeFile(jobMetaPath(job.job_id), JSON.stringify(job, null, 2), "utf-8");
}

export async function getJob(jobId: string): Promise<RunJobRecord | null> {
  return readJsonFile<RunJobRecord>(jobMetaPath(jobId));
}

export async function listRecentJobs(limit = 20): Promise<RunJobRecord[]> {
  try {
    await ensureJobsDir();
  } catch {
    return [];
  }

  let files: string[];
  try {
    files = await readdir(JOBS_DIR);
  } catch {
    return [];
  }

  const jobs: RunJobRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".json") || file === "active.json") continue;
    const job = await readJsonFile<RunJobRecord>(path.join(JOBS_DIR, file));
    if (job?.job_id) jobs.push(job);
  }

  jobs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return jobs.slice(0, limit);
}

async function readActivePointer(): Promise<ActiveJobPointer | null> {
  return readJsonFile<ActiveJobPointer>(ACTIVE_JOB_PATH);
}

async function clearActivePointer(): Promise<void> {
  try {
    await unlink(ACTIVE_JOB_PATH);
  } catch {
    // already cleared
  }
}

async function setActivePointer(jobId: string, pid: number | null): Promise<void> {
  await ensureJobsDir();
  const payload: ActiveJobPointer = { job_id: jobId, pid };
  await writeFile(ACTIVE_JOB_PATH, JSON.stringify(payload, null, 2), "utf-8");
}

export async function getActiveJob(): Promise<RunJobRecord | null> {
  const pointer = await readActivePointer();
  if (!pointer) return null;

  const job = await getJob(pointer.job_id);
  if (!job) {
    await clearActivePointer();
    return null;
  }

  if (job.status === "running" && job.pid !== null && !isProcessAlive(job.pid)) {
    job.status = "failed";
    job.finished_at = new Date().toISOString();
    job.error = job.error ?? "Process exited unexpectedly";
    await writeJob(job);
    await clearActivePointer();
    return job;
  }

  if (job.finished_at !== null) {
    await clearActivePointer();
  }

  return job;
}

export async function readLogTail(
  jobId: string,
  maxLines = LOG_TAIL_LINES,
): Promise<string[]> {
  try {
    const raw = await readFile(jobLogPath(jobId), "utf-8");
    const lines = raw.split("\n").filter((line) => line.length > 0);
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}

async function appendLog(jobId: string, line: string): Promise<void> {
  await ensureJobsDir();
  const safe = redactLogLine(line);
  if (!safe.trim()) return;
  await appendFile(jobLogPath(jobId), `${safe}\n`, "utf-8");
}

async function assertNoActiveJob(): Promise<void> {
  const active = await getActiveJob();
  if (active?.status === "running" || active?.status === "queued") {
    throw new Error("run_in_progress");
  }
}

async function assertLiveThrottleAllowed(): Promise<void> {
  const minutes = liveRunThrottleMinutes();
  if (minutes === 0) return;

  const state = await readJsonFile<LiveThrottleState>(LIVE_THROTTLE_PATH);
  if (!state?.last_run_at) return;

  const elapsedMs = Date.now() - Date.parse(state.last_run_at);
  const requiredMs = minutes * 60 * 1000;
  if (elapsedMs < requiredMs) {
    throw new Error("live_run_throttled");
  }
}

async function recordLiveRunStarted(): Promise<void> {
  await ensureJobsDir();
  const payload: LiveThrottleState = { last_run_at: new Date().toISOString() };
  await writeFile(LIVE_THROTTLE_PATH, JSON.stringify(payload, null, 2), "utf-8");
}

async function resolveStemFromJobLog(jobId: string): Promise<string | null> {
  const logPath = jobLogPath(jobId);
  if (!existsSync(logPath)) return null;

  const content = await readFile(logPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    const prefix = "SELECTION_ROOM_EXPORT stem=";
    if (trimmed.startsWith(prefix)) {
      const stem = trimmed.slice(prefix.length).trim();
      if (stem) return stem;
    }
  }
  return null;
}

async function resolveStemFromRunsJson(job: RunJobRecord): Promise<string | null> {
  const index = await readJsonFile<RunsIndexWire>(RUNS_JSON_PATH);
  if (!index) return null;

  const runId = `${job.request.season}_week${job.request.week}`;
  const startedAt = job.started_at ?? job.created_at;
  const expectedScenarioId = job.request.weights
    ? weightsScenarioId(job.request.weights)
    : BASE_SCENARIO_ID;

  const matches = index.runs.filter(
    (entry) =>
      entry.run_id === runId &&
      entry.scenario_id === expectedScenarioId &&
      entry.data_source === job.request.data_source &&
      entry.generated_at >= startedAt,
  );

  matches.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
  if (matches[0]) return matches[0].stem;

  if (index.latest?.stem) {
    await appendLog(
      job.job_id,
      `Warning: no exact runs.json match for ${runId}; falling back to latest stem ${index.latest.stem}`,
    );
    return index.latest.stem;
  }

  return null;
}

async function finishJob(
  jobId: string,
  update: Partial<Pick<RunJobRecord, "status" | "stem" | "error" | "exit_code">>,
): Promise<RunJobRecord | null> {
  const job = await getJob(jobId);
  if (!job) return null;

  Object.assign(job, update);
  job.finished_at = new Date().toISOString();
  await writeJob(job);
  await clearActivePointer();
  return job;
}

function spawnEngine(job: RunJobRecord): ChildProcess {
  const python = pythonBin();
  if (!python) {
    throw new Error("engine_unavailable");
  }

  const args = [
    "-m",
    "src.cli.main",
    "run",
    "--year",
    String(job.request.season),
    "--week",
    String(job.request.week),
  ];
  if (job.request.data_source === "sample") args.push("--sample");
  if (job.request.weights) {
    args.push("--weights", formatWeightSpec(job.request.weights));
  }

  return spawn(python, args, {
    cwd: REPO_DIR,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function runJobAsync(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  let child: ChildProcess;
  try {
    child = spawnEngine(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to launch engine";
    await appendLog(jobId, message);
    await finishJob(jobId, { status: "failed", error: message, exit_code: null });
    return;
  }

  job.status = "running";
  job.started_at = new Date().toISOString();
  job.pid = child.pid ?? null;
  await writeJob(job);
  await setActivePointer(jobId, job.pid);

  const onData = (chunk: Buffer) => {
    const lines = chunk.toString("utf-8").split("\n");
    for (const line of lines) {
      if (line.trim()) void appendLog(jobId, line);
    }
  };

  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);

  child.on("error", async (err) => {
    await appendLog(jobId, `Failed to launch engine: ${err.message}`);
    await finishJob(jobId, {
      status: "failed",
      error: err.message,
      exit_code: null,
    });
  });

  child.on("close", async (code) => {
    const current = await getJob(jobId);
    if (!current) return;

    if (code === 0) {
      const stemFromLog = await resolveStemFromJobLog(jobId);
      const stem = stemFromLog ?? (await resolveStemFromRunsJson(current));
      if (!stem) {
        await finishJob(jobId, {
          status: "failed",
          error: "Engine finished but no matching run found in runs.json",
          exit_code: code,
        });
        return;
      }
      await finishJob(jobId, { status: "succeeded", stem, exit_code: code });
      return;
    }

    await finishJob(jobId, {
      status: "failed",
      error: `Engine exited with code ${code ?? "unknown"}`,
      exit_code: code,
    });
  });
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
  const caps = await getCapabilities();
  if (!caps.run_generation_enabled) {
    throw new Error("run_generation_disabled");
  }

  if (request.data_source === "cfbd" && !caps.live_cfbd_enabled) {
    throw new Error("cfbd_unavailable");
  }

  if (request.data_source === "cfbd") {
    await assertLiveThrottleAllowed();
  }

  await assertNoActiveJob();

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

  await writeJob(job);
  await setActivePointer(job.job_id, null);

  if (request.data_source === "cfbd") {
    await recordLiveRunStarted();
  }

  setImmediate(() => {
    void runJobAsync(job.job_id);
  });

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

  // Optional Scenario Lab weights. Present-but-invalid is a hard reject (not a
  // silent base run). Weights equal to the defaults collapse to a base run.
  if (record.weights !== undefined) {
    const weights = parseScenarioWeights(record.weights);
    if (weights === null) return null;
    if (weightsScenarioId(weights) !== BASE_SCENARIO_ID) {
      request.weights = weights;
    }
  }

  return request;
}
