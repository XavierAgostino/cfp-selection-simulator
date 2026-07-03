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
│   ├── data/                 # CFBD fetcher
│   ├── validation/           # Backtest, Selection Stability
│   └── utils/                # Metrics, conference helpers
├── tests/                    # pytest suite
├── docs/                     # Documentation funnel
└── data/
    ├── cache/                # CFBD + team asset cache
    ├── processed/sample/     # Demo games + champions
    └── output/               # Generated run artifacts
        ├── api/              # JSON web contract (runs.json, per-run payloads)
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
- **Tests** → `tests/` mirroring `src/selection`, `src/pipeline`, etc.

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
