import type { RankingsPayload, SensitivityPayload, TeamResumesPayload } from "@/lib/types";

export function runCacheKey(stem: string | null): string {
  return stem ?? "__latest__";
}

export const rankingsCache = new Map<string, RankingsPayload>();
export const rankingsInFlight = new Map<string, Promise<RankingsPayload>>();

export const teamResumesCache = new Map<string, TeamResumesPayload>();
export const teamResumesInFlight = new Map<string, Promise<TeamResumesPayload>>();

export const sensitivityCache = new Map<string, SensitivityPayload>();
export const sensitivityInFlight = new Map<string, Promise<SensitivityPayload>>();

/** Drop in-memory run JSON after a new pipeline export (same or different stem). */
export function invalidateRunPayloadCache(stem: string | null): void {
  const keys = new Set<string>([runCacheKey(stem), runCacheKey(null)]);
  for (const key of keys) {
    rankingsCache.delete(key);
    rankingsInFlight.delete(key);
    teamResumesCache.delete(key);
    teamResumesInFlight.delete(key);
    sensitivityCache.delete(key);
    sensitivityInFlight.delete(key);
  }
}
