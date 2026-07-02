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
├── app/
│   └── streamlit_app.py      # Dashboard
├── src/
│   ├── config/               # Formats, SimulatorConfig
│   ├── selection/            # Field, seeding, audit
│   ├── pipeline/             # Composite, run orchestration, paths
│   ├── rankings/             # Colley, Massey, Elo algorithms
│   ├── playoff/              # Bracket viz (HTML, Plotly)
│   ├── cli/                  # sroom Typer commands
│   ├── assets/               # Team logos/colors registry
│   ├── data/                 # CFBD fetcher
│   ├── validation/           # Backtest, sensitivity
│   └── utils/                # Metrics, conference helpers
├── tests/                    # pytest suite
├── docs/                     # Documentation funnel
└── data/
    ├── cache/                # CFBD + team asset cache
    ├── processed/sample/     # Demo games + champions
    └── output/               # Generated run artifacts
```

---

## Module responsibilities

| Module | Owns |
|--------|------|
| `src/config/formats.py` | 2024 vs 2025+ CFP rules |
| `src/selection/field.py` | 5+7 field selection, displacement |
| `src/selection/seeding.py` | Champion-bye vs straight seeding |
| `src/selection/audit.py` | Structured audit steps |
| `src/pipeline/composite.py` | Composite ranking pipeline |
| `src/pipeline/run.py` | End-to-end run orchestration |
| `src/pipeline/paths.py` | Output path contract |
| `src/pipeline/sample.py` | Sample champion enrichment |
| `src/cli/main.py` | CLI entry point |
| `app/streamlit_app.py` | Dashboard UI |

---

## What belongs where

- **Selection logic** → `src/selection/`
- **Ranking math** → `src/rankings/` + `src/pipeline/composite.py`
- **User-facing commands** → `src/cli/` + `Makefile`
- **Research prose** → `docs/research/`
- **Tests** → `tests/` mirroring `src/selection`, `src/pipeline`, etc.

---


## Related

- [Development Guide](development.md)
- [Contributing](../CONTRIBUTING.md)
