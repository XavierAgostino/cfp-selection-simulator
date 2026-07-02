#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python -m pip install -e ".[app,dev]"
cfp-sim doctor
cfp-sim run --year 2025 --week 15 --sample
cfp-sim bracket --year 2025 --week 15 --sample --html
cfp-sim outputs --latest
