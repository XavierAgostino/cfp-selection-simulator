export type RuntimeMode = "local" | "hosted";
export type ArtifactStoreKind = "filesystem" | "supabase";

export function resolveRuntimeMode(): RuntimeMode {
  const value = process.env.SELECTION_ROOM_RUNTIME?.trim().toLowerCase();
  if (value === "hosted") return "hosted";
  return "local";
}

export function resolveArtifactStoreKind(): ArtifactStoreKind {
  const value = process.env.SELECTION_ROOM_ARTIFACT_STORE?.trim().toLowerCase();
  if (value === "supabase") return "supabase";
  return "filesystem";
}

export function isHostedRuntimeConfigured(): boolean {
  return resolveRuntimeMode() === "hosted";
}

export function getDatabaseUrl(): string | null {
  const url = process.env.SELECTION_ROOM_DATABASE_URL?.trim();
  return url || null;
}

export function isHostedDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== null;
}

export function hostedDailyJobCap(): number {
  const raw = process.env.SELECTION_ROOM_HOSTED_DAILY_JOB_CAP ?? "10";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) return 10;
  return parsed;
}

export function hostedMaxConcurrentJobs(): number {
  const raw = process.env.SELECTION_ROOM_HOSTED_MAX_CONCURRENT ?? "1";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

/** Per-user daily run cap — fairness under the global cap so one account can't hog it. */
export function hostedUserDailyJobCap(): number {
  const raw = process.env.SELECTION_ROOM_HOSTED_USER_DAILY_JOB_CAP ?? "5";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) return 5;
  return parsed;
}

export function liveRunThrottleMinutes(): number {
  const raw = process.env.SELECTION_ROOM_LIVE_RUN_THROTTLE_MINUTES ?? "5";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 5;
  return parsed;
}

export function getSupabaseUrl(): string | null {
  const url = process.env.SUPABASE_URL?.trim();
  return url || null;
}

export function getSupabaseServiceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key || null;
}

export function getSupabaseStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "artifacts";
}

/**
 * Public Supabase URL + anon key drive browser-side Auth (sign-in) and cookie
 * session reads on the server. Both are safe to ship to the client — the anon
 * key is not a secret. Distinct from the server-only service-role key above.
 */
export function getSupabasePublicUrl(): string | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  return url || null;
}

export function getSupabaseAnonKey(): string | null {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return key || null;
}

/** True when Supabase Auth is wired (public URL + anon key present). */
export function isAuthConfigured(): boolean {
  return getSupabasePublicUrl() !== null && getSupabaseAnonKey() !== null;
}

export function isHostedStorageConfigured(): boolean {
  return getSupabaseUrl() !== null && getSupabaseServiceRoleKey() !== null;
}

/** True when a hosted worker executor is wired (Trigger.dev in H5). */
export function getTriggerEnqueueKeyIssue(): string | null {
  if (!isHostedRuntimeConfigured()) return null;
  const key = process.env.TRIGGER_SECRET_KEY?.trim();
  if (!key) return null;
  if (key.startsWith("tr_dev_")) {
    return (
      "TRIGGER_SECRET_KEY is a dev key (tr_dev_). Hosted tasks deploy to production; " +
      "use the Production secret (tr_prod_) from Trigger dashboard → API Keys."
    );
  }
  return null;
}

export function isRunExecutorConfigured(): boolean {
  if (!isHostedRuntimeConfigured()) {
    return true;
  }
  if (getTriggerEnqueueKeyIssue()) return false;
  return Boolean(process.env.TRIGGER_SECRET_KEY?.trim()) && process.env.SELECTION_ROOM_HOSTED_EXECUTOR === "trigger";
}
