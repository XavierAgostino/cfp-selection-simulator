import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { task } from "@trigger.dev/sdk";

import { buildWorkerSubprocessEnv } from "@/lib/runtime/run-executor/worker-env";

const execFileAsync = promisify(execFile);

function repoDir(): string {
  return (
    process.env.SELECTION_ROOM_REPO_DIR?.trim() ||
    path.resolve(process.cwd(), "..")
  );
}

function pythonBin(): string {
  const configured = process.env.SELECTION_ROOM_PYTHON?.trim();
  if (configured) return configured;
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
    await execFileAsync(
      python,
      ["-m", "src.cli.main", "worker", "run-job", payload.jobId],
      {
        cwd,
        env: buildWorkerSubprocessEnv() as NodeJS.ProcessEnv,
        maxBuffer: 20 * 1024 * 1024,
      },
    );
    return { jobId: payload.jobId, ok: true as const };
  },
});
