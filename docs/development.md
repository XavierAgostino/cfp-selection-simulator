# Development Guide

For contributors working on the simulator codebase.

> [!TIP]
> Before opening a PR, run `make verify` (tests + lint + sample smoke run). It matches what CI expects.

---

## Setup

```bash
git clone https://github.com/XavierAgostino/cfp-selection-simulator.git
cd cfp-selection-simulator
make setup
```

Installs `pip install -e ".[dev]"` including `sroom`, pytest, black, isort, flake8.

For the web app:

```bash
cd web && pnpm install
```

---

## Test

```bash
make test
# or
pytest tests/ -v
```

With coverage:

```bash
pytest tests/ -v --cov=src
```

---

## Lint and format

```bash
make lint      # check only
make format    # auto-fix black + isort
```

Black is pinned to 23.x for CI consistency (`black>=23.12.1,<25`).

---

## Web app checks

```bash
cd web && pnpm lint && pnpm exec tsc --noEmit && pnpm build
```

### Public demo production build (mirrors Vercel)

```bash
cd web
cp .env.example .env.local
pnpm seed-fixtures:demo
pnpm build
pnpm start
```

CI runs engine and web jobs separately (see `.github/workflows/ci.yml`).

---

## Full verification

```bash
make verify
```

Runs Python tests, lint, and a sample-mode smoke run. Web checks are separate; run them manually before web-facing changes.

---

## Sample mode during development

```bash
make demo
sroom doctor
sroom outputs --latest
```

No API key required.

---

## DuckDB run store

Each export dual-writes pipeline outputs to `data/output/selection_room.duckdb` (local analytical store) alongside the JSON files the web app reads.

```bash
sroom store status
sroom store runs
sroom store query "SELECT stem, label, generated_at FROM runs ORDER BY generated_at DESC LIMIT 5"
sroom store query "SELECT team, rank, composite_score FROM rankings WHERE run_stem = '2025_week15' ORDER BY rank LIMIT 10" --format table
sroom store rebuild --from-api
```

**Policy:** `SELECTION_ROOM_STORE_REQUIRED=1` (default) fails the export if the DuckDB write fails, so JSON and the store stay in sync. Set `SELECTION_ROOM_STORE_REQUIRED=0` locally to continue JSON-only exports while debugging store mappers.

**Rebuild limitations:** `rebuild --from-api` restores payload-derived tables from `data/output/api/runs/{stem}/`. It skips `record_games` (not in API JSON today; only written on live export).

Example queries:

```sql
-- Top 10 by composite for a run
SELECT rank, team, composite_score, bid_type
FROM rankings
WHERE run_stem = '2025_week15'
ORDER BY rank
LIMIT 10;

-- Bubble tiers
SELECT tier, rank, team, composite_score
FROM field_bubble
WHERE run_stem = '2025_week15'
ORDER BY tier, rank;
```

The Next.js app does **not** read DuckDB in this phase. JSON under `data/output/api/` remains the web contract.

---

## Adding tests

- Place tests in `tests/test_*.py`
- Use fixtures from `tests/conftest.py` and `tests/fixtures/`
- Selection/seeding changes **require** unit tests (see `tests/test_seeding_2024.py`, `tests/test_field.py`)
- API contract changes require updates to `tests/test_api_contracts.py` and [api-contracts.md](api-contracts.md)

---

## Notebook hygiene

- Do not commit large embedded outputs (`nbstripout` recommended)
- Notebooks are secondary to CLI; do not add notebook-only required steps to README

---

## Web app environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SELECTION_ROOM_REPO_DIR` | repo root (auto-detected) | Path to Python engine + `.venv/` |
| `SELECTION_ROOM_DATA_DIR` | `data/output/api` | Exported JSON read by the app |
| `SELECTION_ROOM_ENABLE_RUN_JOBS` | unset (disabled) | Set to `1` to enable browser run generation |
| `SELECTION_ROOM_LIVE_RUN_THROTTLE_MINUTES` | `5` | Minimum minutes between live CFBD runs (`0` = off) |
| `SELECTION_ROOM_STORE_REQUIRED` | `1` | When `1`, DuckDB store write failures fail export; set `0` for JSON-only escape hatch |
| `CFBD_API_KEY` | unset | Server-side only; set in repo-root `.env` (same file as CLI). Enables live CFBD in capabilities probe |

Local dev with run generation:

```bash
SELECTION_ROOM_ENABLE_RUN_JOBS=1 SELECTION_ROOM_LIVE_RUN_THROTTLE_MINUTES=0 make web
```

Or add the vars to `.env` (loaded by Next when configured).

CI does **not** run web job generation.

### Stuck job recovery

Jobs are file-backed under `data/output/jobs/`:

- `{job_id}.json`: metadata and status
- `{job_id}.log`: redacted subprocess output
- `active.json`: pointer while a job is queued or running

If the server restarts mid-run or a job appears stuck:

1. Delete `data/output/jobs/active.json`, or
2. Edit the job JSON: set `status` to `"failed"` and `finished_at` to an ISO timestamp.

Then retry from the Run Analysis dialog.

---

## API key handling

- Never commit `.env` or API keys
- Never commit generated `data/output/` artifacts
- Use `.env.example` as template
- CI does not run live CFBD fetches

---

## Release checklist

1. `make verify` passes
2. Web checks pass if `web/` changed: `cd web && pnpm lint && pnpm exec tsc --noEmit && pnpm build`
3. Update `CHANGELOG.md`
4. Bump version in `pyproject.toml` and `src/__init__.py`
5. Update [docs/api-contracts.md](api-contracts.md) when API output shape changes
6. README + docs updated for behavior changes
7. Push to `main`; confirm GitHub Actions green

---

## CI

Workflow: `.github/workflows/ci.yml`

- **engine** job: Python 3.11–3.13, flake8, black, isort, pytest, sample smoke run
- **web** job: pnpm lint, tsc, build

---

## Related

- [Contributing](../CONTRIBUTING.md)
- [Project Structure](project-structure.md)
- [Web App](web-app.md)
- [API Contracts](api-contracts.md)
