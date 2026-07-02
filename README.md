# CFP Selection Simulator

[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

A transparent, reproducible decision-support simulator for College Football Playoff ranking, selection, seeding, and bracket analysis.

The simulator runs from sample data in under a minute, generates a 12-team playoff field, explains why teams made or missed the bracket, and compares model outputs against CFP-style selection rules.

<p align="center">
  <img src="https://a.espncdn.com/i/teamlogos/ncaa/500/194.png" width="44" alt="Ohio State" />
  <img src="https://a.espncdn.com/i/teamlogos/ncaa/500/61.png" width="44" alt="Georgia" />
  <img src="https://a.espncdn.com/i/teamlogos/ncaa/500/333.png" width="44" alt="Alabama" />
  <img src="https://a.espncdn.com/i/teamlogos/ncaa/500/251.png" width="44" alt="Texas" />
  <img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png" width="44" alt="Oregon" />
  <img src="https://a.espncdn.com/i/teamlogos/ncaa/500/87.png" width="44" alt="Notre Dame" />
  <img src="https://a.espncdn.com/i/teamlogos/ncaa/500/228.png" width="44" alt="Clemson" />
  <img src="https://a.espncdn.com/i/teamlogos/ncaa/500/130.png" width="44" alt="Michigan" />
  <img src="https://a.espncdn.com/i/teamlogos/ncaa/500/52.png" width="44" alt="Florida State" />
  <img src="https://a.espncdn.com/i/teamlogos/ncaa/500/68.png" width="44" alt="Boise State" />
</p>

---

## What it does

- Composite rankings (resume, predictive, SOR, SOS)
- 12-team field selection under **2024** or **2025+** CFP rules
- Format-aware seeding and bracket generation
- Structured audit trail and reproducibility manifest
- Streamlit dashboard for exploration
- Historical validation against published CFP rankings

---

## Quickstart

```bash
git clone https://github.com/XavierAgostino/cfp-selection-simulator.git
cd cfp-selection-simulator
make setup
make demo
make dashboard
```

No API key is required for demo mode.

One-shot script: `./scripts/demo.sh`

---

## Run with live data

```bash
cp .env.example .env   # add CFBD_API_KEY
export CFBD_API_KEY="your_key_here"
cfp-sim run --year 2025 --week 15
```

Get a free key at [CollegeFootballData.com](https://collegefootballdata.com/key).

---

## Common commands

| Goal | Command |
|------|---------|
| Environment check | `cfp-sim doctor` |
| Sample demo | `make demo` |
| Full pipeline | `make run YEAR=2025 WEEK=15` |
| Dashboard | `make dashboard` |
| Bracket HTML | `make bracket YEAR=2025 WEEK=15` |
| Latest outputs | `cfp-sim outputs --latest` |
| Validation | `make validate` |
| Dev verification | `make verify` |

See [CLI Reference](docs/cli-reference.md) for all options.

---

## Example outputs

After `make demo`:

| File | Description |
|------|-------------|
| `data/output/rankings/2025_week15_rankings.csv` | Composite rankings |
| `data/output/fields/2025_week15_field.csv` | 12-team playoff field |
| `data/output/brackets/2025_week15_bracket.csv` | Seeded bracket |
| `data/output/brackets/2025_week15_bracket.html` | Interactive bracket |
| `data/output/audits/2025_week15_audit.json` | Selection audit |
| `data/output/runs/2025_week15_manifest.json` | Reproducibility manifest |

Details: [Output Files](docs/output-files.md)

---

## Dashboard

```bash
make dashboard
# or: cfp-sim dashboard
```

Tabs: Overview, Rankings, Playoff Field, Bracket, Bubble Watch, Team Resume, Components, Selection Audit, Methodology.

Guide: [Dashboard Guide](docs/dashboard-guide.md)

---

## Research-backed methodology

One composite pipeline with explainable components. The simulator is a **decision-support tool**, not a claim to replicate committee deliberations.

| Topic | Doc |
|-------|-----|
| CFP format rules | [Format History](docs/research/cfp-format-history.md) |
| Ranking model | [Model Methodology](docs/research/model-methodology.md) |
| Metrics | [Metric Definitions](docs/research/metric-definitions.md) |
| Backtests | [Historical Validation](docs/research/historical-validation.md) |
| Stability | [Sensitivity Analysis](docs/research/sensitivity-analysis.md) |
| Scope | [Limitations & Ethics](docs/research/limitations-and-ethics.md) |

---

## CFP format support

| Era | Field | Seeding / byes |
|-----|-------|----------------|
| 2014–2023 | 4 teams | Use validation modules only |
| 2024 | 12 teams (5 auto + 7 at-large) | Top 4 **conference champions** get byes |
| 2025+ | 12 teams (5 auto + 7 at-large) | **Straight** seeding; top 4 overall get byes |

---

## Documentation

**Start here**

- [Documentation home](docs/index.md)
- [Quickstart](docs/quickstart.md)
- [User Guide](docs/user-guide.md)
- [CLI Reference](docs/cli-reference.md)
- [Dashboard Guide](docs/dashboard-guide.md)
- [Output Files](docs/output-files.md)
- [Configuration](docs/configuration.md)

**Research**

- [Research index](docs/research/index.md)

**Contributors**

- [Contributing](CONTRIBUTING.md)
- [Development Guide](docs/development.md)
- [Project Structure](docs/project-structure.md)

---

## Development

```bash
make setup
make verify
```

---

## License & data

MIT License. See [LICENSE](LICENSE).

Game data via [College Football Data API](https://collegefootballdata.com/). Team logos may load from ESPN CDN fallbacks in demo mode.

Author: **Xavier Agostino**
