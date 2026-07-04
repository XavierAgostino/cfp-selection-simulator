# Project Structure

Contributor-focused map of the repository.

```
cfp-selection-simulator/
├── README.md                 # Front door (command-first)
├── CONTRIBUTING.md           # PR expectations
├── CHANGELOG.md              # Release history
├── Makefile                  # setup, demo, verify, ...
├── configs/                  # YAML run configs
├── scripts/
│   └── demo.sh               # One-shot demo script
├── web/                      # Next.js Selection Room app (primary UI)
│   ├── app/                  # Routes + API handlers
│   ├── components/           # UI components
│   └── lib/                  # Types, data helpers
├── src/
│   ├── api_contracts/        # JSON API builder/models for web app
│   ├── config/               # Formats, SimulatorConfig
│   ├── selection/            # Field, seeding, audit
│   ├── pipeline/             # Composite, run orchestration, paths
│   ├── rankings/             # Colley, Massey, Elo algorithms
│   ├── playoff/              # Bracket HTML export
│   ├── cli/                  # sroom Typer commands
│   ├── store/                # DuckDB run store (local analytics)
│   ├── assets/               # Team logos/colors registry
│   ├── data/                 # CFBD fetcher + season cache helpers
│   ├── validation/           # Backtest, Selection Stability (v1 + reused by calibrate)
│   ├── calibration/          # v2 research harness (`sroom calibrate`) — isolated from production defaults
│   └── utils/                # Metrics, conference helpers
├── tests/                    # pytest suite
├── docs/                     # Documentation funnel
│   └── research/             # Research prose (v1 validation + v2 tracks board)
└── data/
    ├── cache/                # CFBD + team asset cache (gitignored except sample assets)
    │   └── cfbd/{year}/      # Per-season games parquet + PPA JSON for offline research
    ├── processed/sample/     # Demo games + champions
    └── output/               # Generated run artifacts (gitignored)
        ├── api/              # JSON web contract (runs.json, per-run payloads)
        ├── validation/       # `sroom validate` CSV/MD outputs
        ├── calibration/      # `sroom calibrate` JSON/MD/CSV (v2 research only)
        ├── reports/          # Reserved placeholder (unused)
        └── selection_room.duckdb  # DuckDB local run store (gitignored)
```

---

## Module responsibilities

| Module | Owns |
|--------|------|
| `web/` | Next.js Selection Room app (primary product surface) |
| `src/api_contracts/` | JSON export contract for web app (`runs.json`, `sensitivity.json`, etc.) |
| `src/store/` | DuckDB run store — dual-write on export; CLI query/rebuild for local analytics |
| `src/config/formats.py` | 2024 vs 2025+ CFP rules |
| `src/selection/field.py` | 5+7 field selection, displacement |
| `src/selection/seeding.py` | Champion-bye vs straight seeding |
| `src/selection/audit.py` | Structured audit steps |
| `src/pipeline/composite.py` | Composite ranking pipeline |
| `src/pipeline/run.py` | End-to-end run orchestration |
| `src/pipeline/paths.py` | Output path contract (`run_id`, `scenario_id`, `stem`) |
| `src/pipeline/sample.py` | Sample champion enrichment |
| `src/validation/sensitivity.py` | Selection Stability / Monte Carlo weight perturbation |
| `src/calibration/harness.py` | v2 weight ablation + quality gate (`sroom calibrate`) |
| `src/calibration/experiments.py` | Baseline, ablations, PPA/SOR variant experiment configs |
| `src/calibration/outputs.py` | Writes `data/output/calibration/calibration.*` |
| `src/calibration/emulation.py` | Committee Emulation lite derived from calibration payload |
| `src/data/season_cache.py` | Cache-first CFBD games loading for offline calibrate runs |
| `src/cli/main.py` | CLI entry point |

---

## What belongs where

- **Selection logic** → `src/selection/`
- **Ranking math** → `src/rankings/` + `src/pipeline/composite.py`
- **Web UI** → `web/`
- **JSON API exports** → `src/api_contracts/` (web contract)
- **Local run analytics** → `src/store/` + `data/output/selection_room.duckdb`
- **User-facing commands** → `src/cli/` + `Makefile`
- **Research prose** → `docs/research/`
- **v2 research code** → `src/calibration/` (never changes production weights or web defaults)
- **v2 research outputs** → `data/output/calibration/` (gitignored; see [output-files.md](output-files.md))
- **CFBD research cache** → `data/cache/cfbd/{year}/` (gitignored; populated by calibrate/validate fetches)
- **Tests** → `tests/` mirroring `src/selection`, `src/pipeline`, `src/calibration`, etc.

---

## v2 research boundary

v2 work lives in `src/calibration/` + `docs/research/` and runs via `sroom
calibrate`. It reuses the v1 validation tracks in `src/validation/` but does
**not** feed the production composite pipeline, Scenario Lab defaults, or the
web app. Promotion requires an explicit decision documented on the
[v2 research board](research/v2-tracks-research.md).

Status board: [docs/research/v2-tracks-research.md](research/v2-tracks-research.md)

---

## Architecture

| Doc | Purpose |
|-----|---------|
| [Hosted production](architecture/hosted-production.md) | Dual-mode design: local OSS vs Vercel + worker + object storage + Postgres; adapter boundaries |
| [Render bootstrap checklist](hosting/render-feasibility-checklist.md) | Secondary single-service deploy path (not primary architecture) |

**Doctrine:** JSON under `data/output/api/` stays the web contract. DuckDB is local/dev/worker-side analytics, not central hosted page state.

---

## Related

- [Development Guide](development.md)
- [Web App](web-app.md)
- [API Contracts](api-contracts.md)
- [Contributing](../CONTRIBUTING.md)
