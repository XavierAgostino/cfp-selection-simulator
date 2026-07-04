#!/usr/bin/env bash
# Push hosted env vars from web/.env.hosted.local to a linked Vercel project.
# Does not print secret values. Requires: vercel login, project linked in web/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/web/.env.hosted.local"
WEB="$ROOT/web"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run ./scripts/bootstrap-hosted-env.sh first" >&2
  exit 1
fi

if [[ ! -f "$WEB/.vercel/project.json" ]]; then
  echo "Link a Vercel project first: cd web && npx vercel link" >&2
  exit 1
fi

TARGET_ENV="${1:-production}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-}"

# Keys synced to Vercel (server-side hosted beta). Never NEXT_PUBLIC_ secrets.
HOSTED_KEYS=(
  SELECTION_ROOM_RUNTIME
  SELECTION_ROOM_ARTIFACT_STORE
  SELECTION_ROOM_DATABASE_URL
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_STORAGE_BUCKET
  SELECTION_ROOM_HOSTED_EXECUTOR
  TRIGGER_SECRET_KEY
  TRIGGER_PROJECT_REF
  SELECTION_ROOM_BETA_RUN_CODES
  SELECTION_ROOM_HOSTED_DAILY_JOB_CAP
  SELECTION_ROOM_HOSTED_MAX_CONCURRENT
  CFBD_API_KEY
)

env_value() {
  local key="$1"
  local line trimmed k v
  while IFS= read -r line || [[ -n "$line" ]]; do
    trimmed="${line#"${line%%[![:space:]]*}"}"
    trimmed="${trimmed%"${trimmed##*[![:space:]]}"}"
    [[ -z "$trimmed" || "$trimmed" == \#* ]] && continue
    k="${trimmed%%=*}"
    v="${trimmed#*=}"
    if [[ "$k" == "$key" ]]; then
      printf '%s' "$v"
      return 0
    fi
  done < "$ENV_FILE"
  return 1
}

cd "$WEB"

for key in "${HOSTED_KEYS[@]}"; do
  value="$(env_value "$key" || true)"
  if [[ -z "$value" ]]; then
    echo "Skip $key (not in .env.hosted.local)" >&2
    continue
  fi
  printf '%s' "$value" | npx vercel env add "$key" "$TARGET_ENV" --force --yes 2>/dev/null \
    || printf '%s' "$value" | npx vercel env update "$key" "$TARGET_ENV" --yes
  echo "Synced $key -> Vercel ($TARGET_ENV)"
done

if [[ -n "$SITE_URL" ]]; then
  printf '%s' "$SITE_URL" | npx vercel env add NEXT_PUBLIC_SITE_URL "$TARGET_ENV" --force --yes 2>/dev/null \
    || printf '%s' "$SITE_URL" | npx vercel env update NEXT_PUBLIC_SITE_URL "$TARGET_ENV" --yes
  echo "Synced NEXT_PUBLIC_SITE_URL -> Vercel ($TARGET_ENV)"
fi

echo "Done. Verify with: cd web && npx vercel env list $TARGET_ENV"
