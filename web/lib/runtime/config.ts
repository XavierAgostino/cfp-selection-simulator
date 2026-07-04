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

export function liveRunThrottleMinutes(): number {
  const raw = process.env.SELECTION_ROOM_LIVE_RUN_THROTTLE_MINUTES ?? "5";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 5;
  return parsed;
}
