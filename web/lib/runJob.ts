import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";

/**
 * Single-slot job runner for launching the Python selection engine from the
 * web app. Local-first by design: the Next server lives in web/ inside the
 * repo, so it can invoke `sroom run` directly. Only one run at a time; the
 * last job's state sticks around so the UI can show the result.
 */

export interface RunJob {
  year: number;
  week: number;
  sample: boolean;
  stem: string;
  status: "running" | "succeeded" | "failed";
  startedAt: string;
  finishedAt?: string;
  exitCode?: number | null;
  logTail: string[];
}

const LOG_TAIL_LINES = 120;

// Survives dev-server HMR module reloads.
const store = globalThis as unknown as { __selectionRoomRunJob?: RunJob };

const REPO_DIR =
  process.env.SELECTION_ROOM_REPO_DIR ??
  path.resolve(/* turbopackIgnore: true */ process.cwd(), "..");

function pythonBin(): string | null {
  const venv = path.join(REPO_DIR, ".venv", "bin", "python");
  if (existsSync(venv)) return venv;
  return existsSync(path.join(REPO_DIR, "src", "cli", "main.py")) ? "python3" : null;
}

export function engineAvailable(): boolean {
  return pythonBin() !== null;
}

export function currentJob(): RunJob | null {
  return store.__selectionRoomRunJob ?? null;
}

export function startRun(year: number, week: number, sample: boolean): RunJob {
  const running = currentJob();
  if (running?.status === "running") {
    throw new Error("run_in_progress");
  }
  const python = pythonBin();
  if (!python) {
    throw new Error("engine_unavailable");
  }

  const job: RunJob = {
    year,
    week,
    sample,
    stem: `${year}_week${week}`,
    status: "running",
    startedAt: new Date().toISOString(),
    logTail: [],
  };
  store.__selectionRoomRunJob = job;

  const args = [
    "-m",
    "src.cli.main",
    "run",
    "--year",
    String(year),
    "--week",
    String(week),
  ];
  if (sample) args.push("--sample");

  const child = spawn(python, args, {
    cwd: REPO_DIR,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const append = (chunk: Buffer) => {
    const lines = chunk.toString("utf-8").split("\n");
    job.logTail.push(...lines.filter((line) => line.trim().length > 0));
    if (job.logTail.length > LOG_TAIL_LINES) {
      job.logTail.splice(0, job.logTail.length - LOG_TAIL_LINES);
    }
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);

  child.on("error", (err) => {
    job.status = "failed";
    job.finishedAt = new Date().toISOString();
    job.logTail.push(`Failed to launch engine: ${err.message}`);
  });

  child.on("close", (code) => {
    job.exitCode = code;
    job.status = code === 0 ? "succeeded" : "failed";
    job.finishedAt = new Date().toISOString();
  });

  return job;
}
