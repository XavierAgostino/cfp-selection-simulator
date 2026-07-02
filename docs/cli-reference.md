# CLI Reference

Mechanical reference for the `cfp-sim` command. For tutorials, see [Quickstart](quickstart.md).

Install: `make setup` or `pip install -e ".[app,dev]"`

---

## Global

```bash
cfp-sim --help
cfp-sim <command> --help
```

---

## `cfp-sim doctor`

Check environment readiness.

```bash
cfp-sim doctor
```

Verifies Python, package import, API key (warns if missing), sample data, team assets, output directory writability, Streamlit, and CLI availability.

---

## `cfp-sim run`

Full pipeline: load games → rank → select → seed → bracket → manifest.

```bash
cfp-sim run --year 2025 --week 15 [--sample] [--config PATH] [--html/--no-html]
```

| Option | Description |
|--------|-------------|
| `--year` | Season (required unless `--config`) |
| `--week` | Analysis week (default 15 with config) |
| `--sample` | Use bundled sample games (no API key) |
| `--config` | YAML config file (`configs/2025.yaml`) |
| `--html` / `--no-html` | Write bracket HTML (default: on) |

---

## `cfp-sim fetch`

Fetch FBS games from CFBD into `data/cache/cfbd/{year}/`.

```bash
cfp-sim fetch --year 2025 [--start-week 5] [--end-week 15]
```

Requires `CFBD_API_KEY`.

---

## `cfp-sim rank`

Composite rankings only.

```bash
cfp-sim rank --year 2025 --week 15 [--sample] [--config PATH]
```

---

## `cfp-sim select`

Field selection and seeding (no HTML bracket).

```bash
cfp-sim select --year 2025 --week 15 [--sample] [--config PATH]
```

---

## `cfp-sim bracket`

Bracket CSV; optional HTML.

```bash
cfp-sim bracket --year 2025 --week 15 [--sample] [--html] [--config PATH]
```

---

## `cfp-sim validate`

Historical backtest against published CFP rankings.

```bash
cfp-sim validate [--years 2014:2024]
```

Year range format: `2014:2023` or comma-separated `2014,2015,2016`.

Output: `data/output/validation/backtest_results.csv`

---

## `cfp-sim reproduce`

Re-run a season with current code and write manifest.

```bash
cfp-sim reproduce --season 2024 [--week 15] [--sample]
```

---

## `cfp-sim outputs`

List files from the latest run.

```bash
cfp-sim outputs [--latest/--all]
```

---

## `cfp-sim open`

Open an output file (browser for HTML, path printed for others).

```bash
cfp-sim open --latest
cfp-sim open --type bracket --year 2025 --week 15
```

| `--type` | File |
|----------|------|
| `bracket` | Bracket HTML |
| `rankings` | Rankings CSV |
| `manifest` | Manifest JSON |
| `field` | Field CSV |
| `audit` | Audit JSON |

---

## `cfp-sim clean`

Remove generated output artifacts.

```bash
cfp-sim clean [--outputs/--all]
```

---

## `cfp-sim dashboard`

Launch Streamlit dashboard.

```bash
cfp-sim dashboard
```

---

## Makefile shortcuts

| Make target | CLI equivalent |
|-------------|----------------|
| `make demo` | `cfp-sim run --year 2025 --week 15 --sample` |
| `make run` | `cfp-sim run --year $(YEAR) --week $(WEEK)` |
| `make bracket` | `cfp-sim bracket ... --sample --html` |
| `make validate` | `cfp-sim validate --years 2014:2024` |
| `make verify` | tests + lint + sample smoke run |

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CFBD_API_KEY` | College Football Data API key |

Set in `.env` (see `.env.example`) or export in shell.
