#!/usr/bin/env bash
# Point local Vercel CLI at selection-room (public demo). Git deploys use dashboard settings.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/.vercel"
cp "$ROOT/web/.vercel/demo-project.json" "$ROOT/.vercel/project.json"
echo "Linked to selection-room (public demo)"
