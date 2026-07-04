/** Env vars forwarded to the Python worker subprocess (Trigger task). */
const WORKER_ENV_KEYS = [
  "SELECTION_ROOM_DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "CFBD_API_KEY",
  "SELECTION_ROOM_WORKER_DATA_OUTPUT",
  "SELECTION_ROOM_STORE_REQUIRED",
  "PATH",
  "HOME",
  "LANG",
  "LC_ALL",
  "PYTHONPATH",
  "VIRTUAL_ENV",
] as const;

export function buildWorkerSubprocessEnv(
  source: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const key of WORKER_ENV_KEYS) {
    const value = source[key];
    if (value !== undefined) {
      env[key] = value;
    }
  }
  return env;
}
