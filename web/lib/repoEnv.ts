import { existsSync, readFileSync } from "fs";
import path from "path";

import { REPO_DIR } from "@/lib/paths";

let loaded = false;

/**
 * Load repo-root `.env` into `process.env` for server-side API routes.
 * Python CLI already uses this file via `load_dotenv()`; Next.js only reads `web/.env*`.
 * Existing process.env values win (e.g. `make web` overrides).
 */
export function loadRepoEnv(): void {
  if (loaded) return;
  loaded = true;

  const envPath = path.join(REPO_DIR, ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    const existing = process.env[key];
    if (existing === undefined || existing === "") {
      process.env[key] = value;
    }
  }
}
