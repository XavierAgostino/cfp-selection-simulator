# CLI Reference

Mechanical reference for the `sroom` command. For tutorials, see [Quickstart](quickstart.md).

Install: `make setup` or `pip install -e ".[dev]"`

> [!TIP]
> Use `./bin/sroom` or `make` targets from the repo root without activating `.venv`.

**Run without activating the venv** (pick one):

```bash
make validate                    # preferred
./bin/sroom validate ...       # project wrapper
.venv/bin/sroom validate ...   # direct venv path
```

Bare `sroom` only works after `source .venv/bin/activate` or a global install.

## Global

```bash
sroom --help
sroom <command> --help
```

---

## `sroom doctor`

Check environment readiness.

```bash
sroom doctor
```

Verifies Python, package import, API key (warns if missing), sample data, team assets, output directory writability, and CLI availability.

---

## `sroom run`

Full pipeline: load games → rank → select → seed → bracket → manifest.

```bash
sroom run --year 2025 --week 15 [--sample] [--config PATH] [--html/--no-html]
          [--weights "resume=0.45,predictive=0.25,sor=0.20,sos=0.10"] [--scenario-id ID]
```

| Option | Description |
|--------|-------------|
| `--year` | Season (required unless `--config`) |
| `--week` | Analysis week (default 15 with config) |
| `--sample` | Use bundled sample games (no API key) |
| `--config` | YAML config file (`configs/2025.yaml`) |
| `--html` / `--no-html` | Write bracket HTML (default: on) |
| `--weights` | Scenario Lab override for the four composite weights (`resume,predictive,sor,sos`), each `0–1` and summing to 1. Derives a `scenario_id` (`w45-25-20-10`); default weights map to `base` |
| `--scenario-id` | Override the derived scenario id explicitly. A non-base scenario writes a `{run_id}__{scenario_id}` stem and never becomes `latest` |

---

## `sroom fetch`

Fetch FBS games from CFBD into `data/cache/cfbd/{year}/`.

```bash
sroom fetch --year 2025 [--start-week 5] [--end-week 15]
```

Requires `CFBD_API_KEY`.

---

## `sroom rank`

Composite rankings only.

```bash
sroom rank --year 2025 --week 15 [--sample] [--config PATH]
```

---

## `sroom select`

Field selection and seeding (no HTML bracket).

```bash
sroom select --year 2025 --week 15 [--sample] [--config PATH]
```

---

## `sroom bracket`

Bracket CSV; optional HTML.

```bash
sroom bracket --year 2025 --week 15 [--sample] [--html] [--config PATH]
```

---

## `sroom validate`

Era-aware historical validation: committee replication, field selection, and predictive metrics.

```bash
./bin/sroom validate [--years 2014:2024] [--target all|committee|selection|predictive]
```

Year range format: `2014:2023` or comma-separated `2014,2015,2016`.

Outputs in `data/output/validation/`:

- `committee_replication.csv`
- `era_selection_validation.csv`
- `predictive_validation.csv`
- `validation_summary.md`
- `validation_manifest.json`
- `backtest_results.csv` (legacy)

## `sroom reproduce`

Re-run a season with current code and write manifest.

```bash
sroom reproduce --season 2024 [--week 15] [--sample]
```

---

## `sroom outputs`

List files from the latest run.

```bash
sroom outputs [--latest/--all]
```

---

## `sroom open`

Open an output file (browser for HTML, path printed for others).

```bash
sroom open --latest
sroom open --type bracket --year 2025 --week 15
```

| `--type` | File |
|----------|------|
| `bracket` | Bracket HTML |
| `rankings` | Rankings CSV |
| `manifest` | Manifest JSON |
| `field` | Field CSV |
| `audit` | Audit JSON |

---

## `sroom clean`

Remove generated output artifacts.

```bash
sroom clean [--outputs/--all]
```

---

## Makefile shortcuts

| Make target | CLI equivalent |
|-------------|----------------|
| `make demo` | `sroom run --year 2025 --week 15 --sample` |
| `make web` | Next.js dev server at `http://localhost:3000` |
| `make run` | `sroom run --year $(YEAR) --week $(WEEK)` |
| `make bracket` | `sroom bracket ... --sample --html` |
| `make validate` | `./bin/sroom validate --years 2014:2024 --target all` |
| `make validate-selection` | `./bin/sroom validate --target selection` |
| `make validate-committee` | `./bin/sroom validate --target committee` |
| `make validate-predictive` | `./bin/sroom validate --target predictive` |
| `make validate YEARS=2021:2023 TARGET=selection` | Custom year range and track |
| `make verify` | tests + lint + sample smoke run |

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CFBD_API_KEY` | College Football Data API key |

Set in `.env` (see `.env.example`) or export in shell.
