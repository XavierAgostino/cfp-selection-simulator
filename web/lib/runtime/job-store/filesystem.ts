import { existsSync } from "fs";
import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  unlink,
  writeFile,
} from "fs/promises";
import path from "path";

import type { JobStore } from "@/lib/runtime/job-store/types";
import {
  BASE_SCENARIO_ID,
  weightsScenarioId,
} from "@/lib/scenarioWeights";
import type { RunJobRecord } from "@/lib/runJob";
import {
  ACTIVE_JOB_PATH,
  JOBS_DIR,
  jobLogPath,
  jobMetaPath,
  LIVE_THROTTLE_PATH,
  RUNS_JSON_PATH,
} from "@/lib/paths";
import { FilesystemArtifactStore } from "@/lib/runtime/artifact-store/filesystem";

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
    data_source: "sample" | "cfbd";
    generated_at: string;
  }>;
}

interface LiveThrottleState {
  last_run_at: string;
}

const LOG_TAIL_LINES = 200;

import { liveRunThrottleMinutes } from "@/lib/runtime/config";
import { redactLogLine } from "@/lib/runtime/log-redaction";

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

export class FilesystemJobStore implements JobStore {
  private readonly artifactStore: FilesystemArtifactStore;

  constructor(artifactRootDir: string) {
    this.artifactStore = new FilesystemArtifactStore(artifactRootDir);
  }

  private async ensureJobsDir(): Promise<void> {
    await mkdir(JOBS_DIR, { recursive: true });
  }

  async isStorageWritable(): Promise<boolean> {
    try {
      await this.ensureJobsDir();
      const probe = path.join(JOBS_DIR, ".write_probe");
      await writeFile(probe, "ok", "utf-8");
      await unlink(probe);
      return true;
    } catch {
      return false;
    }
  }

  async createJob(job: RunJobRecord): Promise<void> {
    await this.ensureJobsDir();
    await writeFile(jobMetaPath(job.job_id), JSON.stringify(job, null, 2), "utf-8");
  }

  async updateJob(job: RunJobRecord): Promise<void> {
    await this.ensureJobsDir();
    await writeFile(jobMetaPath(job.job_id), JSON.stringify(job, null, 2), "utf-8");
  }

  async getJob(jobId: string): Promise<RunJobRecord | null> {
    return readJsonFile<RunJobRecord>(jobMetaPath(jobId));
  }

  async listRecentJobs(limit = 20): Promise<RunJobRecord[]> {
    try {
      await this.ensureJobsDir();
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

  private async readActivePointer(): Promise<ActiveJobPointer | null> {
    return readJsonFile<ActiveJobPointer>(ACTIVE_JOB_PATH);
  }

  private async clearActivePointerInternal(): Promise<void> {
    try {
      await unlink(ACTIVE_JOB_PATH);
    } catch {
      // already cleared
    }
  }

  async clearActivePointer(): Promise<void> {
    await this.clearActivePointerInternal();
  }

  async setActivePointer(jobId: string, pid: number | null): Promise<void> {
    await this.ensureJobsDir();
    const payload: ActiveJobPointer = { job_id: jobId, pid };
    await writeFile(ACTIVE_JOB_PATH, JSON.stringify(payload, null, 2), "utf-8");
  }

  async getActiveJob(): Promise<RunJobRecord | null> {
    const pointer = await this.readActivePointer();
    if (!pointer) return null;

    const job = await this.getJob(pointer.job_id);
    if (!job) {
      await this.clearActivePointerInternal();
      return null;
    }

    if (job.status === "running" && job.pid !== null && !isProcessAlive(job.pid)) {
      job.status = "failed";
      job.finished_at = new Date().toISOString();
      job.error = job.error ?? "Process exited unexpectedly";
      await this.updateJob(job);
      await this.clearActivePointerInternal();
      return job;
    }

    if (job.finished_at !== null) {
      await this.clearActivePointerInternal();
    }

    return job;
  }

  async readLogTail(jobId: string, maxLines = LOG_TAIL_LINES): Promise<string[]> {
    try {
      const raw = await readFile(jobLogPath(jobId), "utf-8");
      const lines = raw.split("\n").filter((line) => line.length > 0);
      return lines.slice(-maxLines);
    } catch {
      return [];
    }
  }

  async appendLog(jobId: string, line: string): Promise<void> {
    await this.ensureJobsDir();
    const safe = redactLogLine(line);
    if (!safe.trim()) return;
    await appendFile(jobLogPath(jobId), `${safe}\n`, "utf-8");
  }

  async assertNoActiveJob(): Promise<void> {
    await this.assertCanStartJob();
  }

  async assertCanStartJob(): Promise<void> {
    const active = await this.getActiveJob();
    if (active?.status === "running" || active?.status === "queued") {
      throw new Error("run_in_progress");
    }
  }

  async assertLiveThrottleAllowed(): Promise<void> {
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

  async recordLiveRunStarted(): Promise<void> {
    await this.ensureJobsDir();
    const payload: LiveThrottleState = { last_run_at: new Date().toISOString() };
    await writeFile(LIVE_THROTTLE_PATH, JSON.stringify(payload, null, 2), "utf-8");
  }

  async resolveStemFromJobLog(jobId: string): Promise<string | null> {
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

  async resolveStemFromRunsJson(job: RunJobRecord): Promise<string | null> {
    const index = await this.artifactStore.getJson<RunsIndexWire>("runs.json");
    if (!index) {
      // Fallback to direct path for compatibility with RUNS_JSON_PATH constant.
      return readJsonFile<RunsIndexWire>(RUNS_JSON_PATH).then((fallback) =>
        fallback ? this.matchStemFromIndex(fallback, job) : null,
      );
    }
    return this.matchStemFromIndex(index, job);
  }

  private matchStemFromIndex(
    index: RunsIndexWire,
    job: RunJobRecord,
  ): string | null {
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
      void this.appendLog(
        job.job_id,
        `Warning: no exact runs.json match for ${runId}; falling back to latest stem ${index.latest.stem}`,
      );
      return index.latest.stem;
    }

    return null;
  }

  async getDailyJobsRemaining(): Promise<number | null> {
    return null;
  }
}
