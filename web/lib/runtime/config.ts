export type RuntimeMode = "local" | "hosted";
export type ArtifactStoreKind = "filesystem" | "supabase";

/** Resolved runtime configuration from environment. H1: only local adapters exist. */
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
