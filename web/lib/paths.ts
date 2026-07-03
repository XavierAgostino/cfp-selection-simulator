import path from "path";

/** Repo root (parent of web/ by default). */
export const REPO_DIR =
  process.env.SELECTION_ROOM_REPO_DIR ??
  path.resolve(/* turbopackIgnore: true */ process.cwd(), "..");

/** Exported JSON API directory: data/output/api */
export const API_DATA_DIR =
  process.env.SELECTION_ROOM_DATA_DIR ??
  path.join(REPO_DIR, "data", "output", "api");

/** File-backed run job registry: data/output/jobs */
export const JOBS_DIR = path.join(REPO_DIR, "data", "output", "jobs");

export const RUNS_JSON_PATH = path.join(API_DATA_DIR, "runs.json");

export const ACTIVE_JOB_PATH = path.join(JOBS_DIR, "active.json");

export const LIVE_THROTTLE_PATH = path.join(JOBS_DIR, ".live_throttle.json");

export function jobMetaPath(jobId: string): string {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

export function jobLogPath(jobId: string): string {
  return path.join(JOBS_DIR, `${jobId}.log`);
}
