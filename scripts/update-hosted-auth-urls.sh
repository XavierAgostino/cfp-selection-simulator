#!/usr/bin/env bash
# Update hosted Supabase Auth URL allow-list for the custom domain.
# Requires a personal access token: https://supabase.com/dashboard/account/tokens
#
#   SUPABASE_ACCESS_TOKEN=sbp_... ./scripts/update-hosted-auth-urls.sh
#   ./scripts/update-hosted-auth-urls.sh --dry-run
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-tucqckdwtbrgmqlnwfhj}"
SITE_URL="${SELECTION_ROOM_SITE_URL:-https://www.selectionroom.org}"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

REDIRECT_URLS=(
  "${SITE_URL}/auth/callback"
  "https://selectionroom.org/auth/callback"
  "https://selection-room.vercel.app/auth/callback"
  "http://localhost:3000/auth/callback"
  "http://localhost:3099/auth/callback"
)

URI_ALLOW_LIST=$(IFS=,; echo "${REDIRECT_URLS[*]}")

PAYLOAD=$(cat <<EOF
{
  "site_url": "${SITE_URL}",
  "uri_allow_list": "${URI_ALLOW_LIST}"
}
EOF
)

echo "Supabase Auth config for ${PROJECT_REF}"
echo "  site_url:       ${SITE_URL}"
echo "  uri_allow_list: ${URI_ALLOW_LIST}"
echo

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run — nothing sent."
  exit 0
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN." >&2
  echo "Create one at https://supabase.com/dashboard/account/tokens" >&2
  echo "Then: SUPABASE_ACCESS_TOKEN=sbp_... $0" >&2
  exit 1
fi

HTTP_CODE=$(curl -sS -o /tmp/supabase-auth-config-response.json -w "%{http_code}" \
  -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Supabase API returned HTTP ${HTTP_CODE}:" >&2
  cat /tmp/supabase-auth-config-response.json >&2
  exit 1
fi

echo "✓ Updated Supabase Auth URL configuration."
