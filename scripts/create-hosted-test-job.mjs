#!/usr/bin/env node
/**
 * Insert a queued hosted test job. Reads web/.env.hosted.local (gitignored).
 * Prints only the job id to stdout.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, "web", ".env.hosted.local");

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

if (!fs.existsSync(envPath)) {
  console.error("Missing web/.env.hosted.local — run ./scripts/bootstrap-hosted-env.sh");
  process.exit(1);
}

loadEnv(envPath);

const databaseUrl = process.env.SELECTION_ROOM_DATABASE_URL;
if (!databaseUrl) {
  console.error("SELECTION_ROOM_DATABASE_URL missing from web/.env.hosted.local");
  process.exit(1);
}

const season = Number(process.argv[2] ?? 2025);
const week = Number(process.argv[3] ?? 15);
const source = process.argv[4] ?? "sample";

const now = new Date();
const stamp = [
  now.getUTCFullYear(),
  String(now.getUTCMonth() + 1).padStart(2, "0"),
  String(now.getUTCDate()).padStart(2, "0"),
  "_",
  String(now.getUTCHours()).padStart(2, "0"),
  String(now.getUTCMinutes()).padStart(2, "0"),
  String(now.getUTCSeconds()).padStart(2, "0"),
].join("");
const suffix = Math.random().toString(16).slice(2, 8);
const jobId = `run_${stamp}_${suffix}`;

const sql = postgres(databaseUrl, { prepare: false });

try {
  await sql`
    INSERT INTO run_jobs (
      id, status, requested_season, requested_week, requested_source, logs_text
    ) VALUES (
      ${jobId}, 'queued', ${season}, ${week}, ${source}, ''
    )
  `;
  process.stdout.write(jobId);
} finally {
  await sql.end({ timeout: 5 });
}
