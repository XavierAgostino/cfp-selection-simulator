import { spawn, type ChildProcess } from "child_process";
import { existsSync } from "fs";
import path from "path";

import type { JobStore } from "@/lib/runtime/job-store/types";
import type { RunExecutor } from "@/lib/runtime/run-executor/types";
import type { RunJobRecord } from "@/lib/runJob";
import { formatWeightSpec } from "@/lib/scenarioWeights";
import { REPO_DIR } from "@/lib/paths";

function pythonBin(): string | null {
  const venv = path.join(REPO_DIR, ".venv", "bin", "python");
  if (existsSync(venv)) return venv;
  return existsSync(path.join(REPO_DIR, "src", "cli", "main.py"))
    ? "python3"
    : null;
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

export class LocalRunExecutor implements RunExecutor {
  constructor(private readonly jobStore: JobStore) {}

  async enqueueJob(jobId: string): Promise<void> {
    setImmediate(() => {
      void this.runJobAsync(jobId);
    });
  }

  private async finishJob(
    jobId: string,
    update: Partial<Pick<RunJobRecord, "status" | "stem" | "error" | "exit_code">>,
  ): Promise<RunJobRecord | null> {
    const job = await this.jobStore.getJob(jobId);
    if (!job) return null;

    Object.assign(job, update);
    job.finished_at = new Date().toISOString();
    await this.jobStore.updateJob(job);
    await this.jobStore.clearActivePointer();
    return job;
  }

  private async runJobAsync(jobId: string): Promise<void> {
    const job = await this.jobStore.getJob(jobId);
    if (!job) return;

    let child: ChildProcess;
    try {
      child = spawnEngine(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to launch engine";
      await this.jobStore.appendLog(jobId, message);
      await this.finishJob(jobId, { status: "failed", error: message, exit_code: null });
      return;
    }

    job.status = "running";
    job.started_at = new Date().toISOString();
    job.pid = child.pid ?? null;
    await this.jobStore.updateJob(job);
    await this.jobStore.setActivePointer(jobId, job.pid);

    const onData = (chunk: Buffer) => {
      const lines = chunk.toString("utf-8").split("\n");
      for (const line of lines) {
        if (line.trim()) void this.jobStore.appendLog(jobId, line);
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);

    child.on("error", async (err) => {
      await this.jobStore.appendLog(jobId, `Failed to launch engine: ${err.message}`);
      await this.finishJob(jobId, {
        status: "failed",
        error: err.message,
        exit_code: null,
      });
    });

    child.on("close", async (code) => {
      const current = await this.jobStore.getJob(jobId);
      if (!current) return;

      if (code === 0) {
        const stemFromLog = await this.jobStore.resolveStemFromJobLog(jobId);
        const stem =
          stemFromLog ?? (await this.jobStore.resolveStemFromRunsJson(current));
        if (!stem) {
          await this.finishJob(jobId, {
            status: "failed",
            error: "Engine finished but no matching run found in runs.json",
            exit_code: code,
          });
          return;
        }
        await this.finishJob(jobId, { status: "succeeded", stem, exit_code: code });
        return;
      }

      await this.finishJob(jobId, {
        status: "failed",
        error: `Engine exited with code ${code ?? "unknown"}`,
        exit_code: code,
      });
    });
  }
}

export function engineAvailable(): boolean {
  return pythonBin() !== null;
}
