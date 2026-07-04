#!/usr/bin/env bash
# Phase 2: create a queued job and run the Python worker locally (no Trigger cloud).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/web/.env.hosted.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Run ./scripts/bootstrap-hosted-env.sh first" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

PYTHON="${SELECTION_ROOM_PYTHON:-$ROOT/.venv/bin/python}"
if [[ ! -x "$PYTHON" ]]; then
  PYTHON="python3"
fi

JOB_ID="$(node "$ROOT/scripts/create-hosted-test-job.mjs")"
echo "Created queued job: $JOB_ID"

cd "$ROOT"
export SELECTION_ROOM_REPO_DIR="${SELECTION_ROOM_REPO_DIR:-$ROOT}"

echo "Running worker..."
set +e
"$PYTHON" -m src.cli.main worker run-job "$JOB_ID"
EXIT_CODE=$?
set -e

echo "Worker exit code: $EXIT_CODE"

HOSTED_WORKER_SMOKE_JOB_ID="$JOB_ID" node <<'NODE'
const fs = require("fs");
const path = require("path");
const postgres = require(path.join(process.cwd(), "web/node_modules/postgres"));

const envPath = path.join(process.cwd(), "web/.env.hosted.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  process.env[t.slice(0, i)] = t.slice(i + 1);
}

const jobId = process.env.HOSTED_WORKER_SMOKE_JOB_ID;
const sql = postgres(process.env.SELECTION_ROOM_DATABASE_URL, { prepare: false });

(async () => {
  const jobs = await sql`
    SELECT status, run_stem, error_message,
           (logs_text LIKE '%eyJ%' OR logs_text ILIKE '%service_role%' OR logs_text ILIKE '%postgresql://%') AS suspicious_logs
    FROM run_jobs WHERE id = ${jobId}
  `;
  const job = jobs[0];
  console.log("Job status:", job?.status ?? "missing");
  console.log("Run stem:", job?.run_stem ?? "(none)");
  if (job?.error_message) console.log("Error:", job.error_message.slice(0, 200));
  console.log("Suspicious log patterns:", job?.suspicious_logs ? "FOUND" : "none");

  if (job?.run_stem) {
    const runs = await sql`SELECT stem FROM runs WHERE stem = ${job.run_stem}`;
    console.log("runs row:", runs.length === 1 ? "present" : "missing");
  }

  await sql.end({ timeout: 5 });
  process.exit(job?.status === "succeeded" ? 0 : 1);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
NODE
