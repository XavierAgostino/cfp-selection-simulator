#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PYTHON="${PYTHON:-python3}"
VENV_PY=".venv/bin/python"

if [[ -x "$VENV_PY" ]]; then
  PY="$VENV_PY"
else
  PY="$PYTHON"
fi

"$PY" -m pip install -e ".[dev]"
"$PY" -m src.cli.main doctor
"$PY" -m src.cli.main run --year 2025 --week 15 --sample
"$PY" -m src.cli.main bracket --year 2025 --week 15 --sample --html
"$PY" -m src.cli.main outputs --latest
