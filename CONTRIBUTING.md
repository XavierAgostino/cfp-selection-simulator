# Contributing

## Development setup

```bash
git clone https://github.com/XavierAgostino/cfp-selection-simulator.git
cd cfp-selection-simulator
make setup
make verify
```

## Before opening a PR

```bash
make verify
```

This runs tests, lint checks, and a sample-mode smoke run.

## Project structure

| Path | Purpose |
|------|---------|
| `src/selection/` | CFP rules, field selection, seeding |
| `src/pipeline/` | Run orchestration and output paths |
| `src/rankings/` | Ranking algorithms and composite score |
| `src/cli/` | Typer CLI (`cfp-sim`) |
| `app/` | Streamlit dashboard |
| `configs/` | Reproducible YAML run configs |
| `docs/research/` | Methodology and citations |
| `tests/` | Unit and integration tests |

## Common commands

```bash
make demo          # Sample run, no API key
make test          # pytest
make lint          # black + isort + flake8
make format        # Auto-fix formatting
cfp-sim doctor     # Environment check
cfp-sim outputs --latest
```

## Output contract

Runs write to predictable paths under `data/output/`:

```
data/output/rankings/{year}_week{week}_rankings.csv
data/output/fields/{year}_week{week}_field.csv
data/output/brackets/{year}_week{week}_bracket.csv
data/output/brackets/{year}_week{week}_bracket.html
data/output/audits/{year}_week{week}_audit.json
data/output/runs/{year}_week{week}_manifest.json
```

## Code style

- Python 3.9+
- Black (line length 100)
- isort
- Type hints on public functions

## Author

Xavier Agostino
