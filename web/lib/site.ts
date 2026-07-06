/** Canonical public origin for hosted production (override via env). */
export const DEFAULT_SITE_URL = "https://www.selectionroom.org";

/** Trailing slash stripped. Env wins; dev falls back to localhost; prod to custom domain. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return DEFAULT_SITE_URL;
}
