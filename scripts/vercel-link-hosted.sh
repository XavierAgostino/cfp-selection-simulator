#!/usr/bin/env bash
# Point local Vercel CLI at selection-room-hosted. Deploy from repo root, not web/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/.vercel"
cp "$ROOT/web/.vercel/hosted-project.json" "$ROOT/.vercel/project.json"
echo "Linked to selection-room-hosted (deploy from repo root: cd $ROOT && npx vercel deploy --prod --yes)"
