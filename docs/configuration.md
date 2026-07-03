# Configuration

Runs can be driven by YAML config files for reproducibility.

---

## Config file example

`configs/2025.yaml`:

```yaml
year: 2025
week: 15
start_week: 1
fbs_only: true
mode: composite
weights:
  resume: 0.40
  predictive: 0.30
  sor: 0.20
  sos: 0.10
```

> [!IMPORTANT]
> Ranking `weights` must sum to **1.0**. Invalid configs fail at load time.

---

## Available configs

| File | Purpose |
|------|---------|
| `configs/sample.yaml` | Demo defaults (2025, week 15) |
| `configs/2024.yaml` | 2024 champion-bye ruleset |
| `configs/2025.yaml` | 2025+ straight seeding |
| `configs/validation.yaml` | Validation/backtest defaults |

---

## Usage

```bash
sroom run --config configs/2025.yaml --sample
sroom run --config configs/2024.yaml --sample
```

Override year/week from CLI if needed:

```bash
sroom run --config configs/2025.yaml --year 2025 --week 14 --sample
```

---

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `year` | int | Season (≥ 2024 for 12-team selection) |
| `week` | int | Last week included in analysis |
| `start_week` | int | First week for CFBD fetch (default 1 — full season) |
| `fbs_only` | bool | FBS teams only |
| `mode` | string | `composite` (v2.0 default) |
| `weights` | object | Ranking component weights (must sum to 1.0) |

### Weights

| Key | Default | Component |
|-----|---------|-----------|
| `resume` | 0.40 | Colley + win% |
| `predictive` | 0.30 | Massey + Elo |
| `sor` | 0.20 | Strength of Record |
| `sos` | 0.10 | Strength of Schedule |

---

## Playoff format

Format is inferred from `year`:

| Year | Ruleset | Seeding |
|------|---------|---------|
| 2024 | `2024` | Champion byes |
| 2025+ | `2025_plus` | Straight |

Years 2014–2023 use validation modules only (4-team era).

Implementation: `src/config/formats.py`

---

## Sample mode

Sample mode is a **CLI flag**, not a YAML field:

```bash
sroom run --config configs/sample.yaml --sample
```

Loads games from `data/processed/sample/sample_games.csv` and applies `sample_champions.csv`.

---

## Reproducibility

Each run writes `config_hash` and active `weights` in the manifest, `runs.json`, and `latest.json`, computed from year, week, weights, and ruleset. Same config + same data → same hash.

Scenario runs use the scenario id for API stem collision avoidance (`2025_week15__{scenario_id}`). Launch them from the web app's [Scenario Lab](web-app.md) or from the CLI with `sroom run --weights` (see [CLI Reference](cli-reference.md)); the base run always keeps `latest.json`.

---

## Related

- [CLI Reference](cli-reference.md)
- [Output Files](output-files.md)
- [CFP Format History](research/cfp-format-history.md)
