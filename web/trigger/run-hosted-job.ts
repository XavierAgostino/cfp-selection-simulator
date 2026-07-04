import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { task } from "@trigger.dev/sdk";
import postgres from "postgres";

import { buildWorkerSubprocessEnv } from "@/lib/runtime/run-executor/worker-env";

const execFileAsync = promisify(execFile);

async function markJobFailed(jobId: string, message: string): Promise<void> {
  const databaseUrl = process.env.SELECTION_ROOM_DATABASE_URL?.trim();
  if (!databaseUrl) return;
  const sql = postgres(databaseUrl, { prepare: false });
  try {
    await sql`
      UPDATE run_jobs
      SET status = 'failed', error_message = ${message}, finished_at = now()
      WHERE id = ${jobId} AND status IN ('queued', 'running')
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function repoDir(): string {
  const cwd = process.cwd();
  const candidates: string[] = [];
  const configured = process.env.SELECTION_ROOM_REPO_DIR?.trim();
  if (configured) candidates.push(configured);
  candidates.push(
    path.join(cwd, "_trigger-worker"),
    path.resolve(cwd, ".."),
    cwd,
  );
  for (const candidate of candidates) {
    const packageInit = path.join(candidate, "src", "__init__.py");
    const cliMain = path.join(candidate, "src", "cli", "main.py");
    if (existsSync(packageInit) && existsSync(cliMain)) {
      return candidate;
    }
  }
  return path.join(cwd, "_trigger-worker");
}

function pythonBin(): string {
  const candidates: string[] = [];
  const configured = process.env.SELECTION_ROOM_PYTHON?.trim();
  if (configured) candidates.push(configured);
  candidates.push("/opt/venv/bin/python", "/opt/venv/bin/python3", "python3");
  for (const candidate of candidates) {
    if (candidate.includes("/")) {
      if (existsSync(candidate)) return candidate;
      continue;
    }
    return candidate;
  }
  return "python3";
}

export const runHostedJob = task({
  id: "run-hosted-job",
  retry: {
    maxAttempts: 2,
  },
  maxDuration: 3600,
  run: async (payload: { jobId: string }) => {
    const cwd = repoDir();
    const python = pythonBin();
    const workerEnv = {
      ...buildWorkerSubprocessEnv(),
      PYTHONPATH: [cwd, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
    };
    try {
      await execFileAsync(
        python,
        ["-m", "src.cli.main", "worker", "run-job", payload.jobId],
        {
          cwd,
          env: workerEnv as NodeJS.ProcessEnv,
          maxBuffer: 20 * 1024 * 1024,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown worker exec failure";
      const detail = `Hosted worker failed (python=${python}, cwd=${cwd}, jobId=${payload.jobId}): ${message}`;
      await markJobFailed(payload.jobId, detail);
      throw new Error(detail);
    }
    return { jobId: payload.jobId, ok: true as const };
  },
});
