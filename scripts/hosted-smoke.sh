#!/usr/bin/env bash
# Hosted Runs v1 local smoke tests against `pnpm dev` in web/.
# Reads Supabase credentials from the linked CLI project (not printed).
# Usage:
#   ./scripts/hosted-smoke.sh
#   ./scripts/hosted-smoke.sh --port 3099
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/web"
ENV_FILE="$WEB/.env.hosted.local"
PORT="${HOSTED_SMOKE_PORT:-3099}"
REF_FILE="$ROOT/supabase/.temp/project-ref"
POOLER_FILE="$ROOT/supabase/.temp/pooler-url"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
elif [[ -f "$REF_FILE" && -f "$POOLER_FILE" ]]; then
  PROJECT_REF="$(tr -d '[:space:]' < "$REF_FILE")"
  DATABASE_URL="$(tr -d '[:space:]' < "$POOLER_FILE")"
  SERVICE_ROLE="$(
    supabase projects api-keys --project-ref "$PROJECT_REF" -o json \
      | node -e "const k=JSON.parse(require('fs').readFileSync(0,'utf8')); const row=k.find(x=>x.name==='service_role'); if(!row) process.exit(1); process.stdout.write(row.api_key)"
  )"
  export SELECTION_ROOM_RUNTIME=hosted
  export SELECTION_ROOM_ARTIFACT_STORE=supabase
  export SELECTION_ROOM_DATABASE_URL="$DATABASE_URL"
  export SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE"
  export SUPABASE_STORAGE_BUCKET=artifacts
  export SELECTION_ROOM_HOSTED_EXECUTOR=trigger
  export SELECTION_ROOM_HOSTED_DAILY_JOB_CAP=10
  export SELECTION_ROOM_HOSTED_MAX_CONCURRENT=1
  export SELECTION_ROOM_BETA_RUN_CODES="${SELECTION_ROOM_BETA_RUN_CODES:-hosted-smoke-test}"
else
  echo "Run ./scripts/bootstrap-hosted-env.sh or supabase link first" >&2
  exit 1
fi

DEV_PID=""
cleanup() {
  if [[ -n "$DEV_PID" ]]; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

cd "$WEB"

# Avoid Next.js "another dev server already running" when port 3000 is in use.
export NEXT_DISABLE_DEV_OVERLAY=1
existing_pid="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$existing_pid" ]]; then
  kill "$existing_pid" 2>/dev/null || true
  sleep 1
fi

pnpm dev --port "$PORT" > /tmp/sroom-hosted-smoke-dev.log 2>&1 &
DEV_PID=$!

echo "Waiting for http://127.0.0.1:${PORT} ..."
for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${PORT}/api/run/capabilities" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

base="http://127.0.0.1:${PORT}"

echo
echo "== capabilities =="
curl -s "${base}/api/run/capabilities" \
  | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(JSON.stringify({runtime:d.runtime,requires_beta_code:d.requires_beta_code,run_generation_enabled:d.run_generation_enabled,executor_configured:d.executor_configured,hosted_run_generation_available:d.hosted_run_generation_available,disabled_reason:d.disabled_reason},null,2));"

echo
echo "== /api/data/runs.json (server proxy) =="
curl -s -o /dev/null -w "status=%{http_code}\n" "${base}/api/data/runs.json"

echo
echo "== public storage URL (must not be world-readable) =="
PROJECT_REF="${SUPABASE_URL#https://}"
PROJECT_REF="${PROJECT_REF%.supabase.co}"
curl -s -o /dev/null -w "status=%{http_code}\n" \
  "https://${PROJECT_REF}.supabase.co/storage/v1/object/public/artifacts/runs.json"

echo
echo "== POST /api/run without beta =="
curl -s -o /tmp/sroom-smoke-no-beta.json -w "status=%{http_code}\n" \
  -X POST "${base}/api/run" \
  -H "Content-Type: application/json" \
  -d '{"season":2025,"week":15,"data_source":"sample"}'
node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/sroom-smoke-no-beta.json','utf8')))"

echo
echo "== POST /api/run wrong beta =="
curl -s -o /tmp/sroom-smoke-wrong-beta.json -w "status=%{http_code}\n" \
  -X POST "${base}/api/run" \
  -H "Content-Type: application/json" \
  -H "X-Selection-Room-Beta-Code: wrong-code" \
  -d '{"season":2025,"week":15,"data_source":"sample"}'
node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/sroom-smoke-wrong-beta.json','utf8')))"

echo
echo "== POST /api/run valid beta (202 when Trigger configured) =="
BETA_CODE="${SELECTION_ROOM_BETA_RUN_CODES%%,*}"
curl -s -o /tmp/sroom-smoke-valid-beta.json -w "status=%{http_code}\n" \
  -X POST "${base}/api/run" \
  -H "Content-Type: application/json" \
  -H "X-Selection-Room-Beta-Code: ${BETA_CODE}" \
  -d '{"season":2025,"week":15,"data_source":"sample"}'
node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/sroom-smoke-valid-beta.json','utf8')))"

echo
echo "== recent jobs =="
curl -s "${base}/api/run/jobs" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const d=JSON.parse(s);console.log('jobs='+(d.jobs?.length??0));}catch{console.log('jobs=unavailable');}});"

echo
echo "Done. Dev log: /tmp/sroom-hosted-smoke-dev.log"
echo "After Trigger deploy, re-run and expect POST valid beta -> 202 with job_id."
