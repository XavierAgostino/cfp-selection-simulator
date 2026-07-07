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

Also refreshes the web artifact `data/output/api/validation.json`, the contract
behind the [`/validation` dashboard](web-app.md). A failure in that export is
logged as a warning and never blocks the CSV/Markdown outputs above.

## `sroom calibrate`

Calibration/ablation research harness (v2 research mode). Reweights the four
composite pillars across a fixed experiment set (baseline, single-component
ablations, weight sweeps, optional probes), re-runs the validation tracks per
experiment, and applies a research quality gate: deltas vs the production
baseline, per-year metrics, 2022/2024 holdout checks, and a decision label
(`recommended | promising | neutral | rejected | needs_more_data`) with a
reason. It measures how transparent assumptions changed historical alignment
and predictive signal. It never changes the default production weights.

```bash
./bin/sroom calibrate [--years 2014:2024] [--include-ppa] [--include-sor-variants]
```

Year range format: `2014:2024` or comma-separated `2014,2015,2016`.

`--include-ppa` adds the research-only **PPA predictive substitution**
experiment: same baseline weights, predictive component swapped for a CFBD
PPA score (per-game PPA through week 15, cached under
`data/cache/cfbd/{year}/`). The default run never touches PPA data; seasons
with missing PPA are reported as unavailable, never silently filled. Status:
evaluated and currently **blocked** by the 2024 modern-format holdout despite
broad historical gains, but it stays research-only and is not promoted. See
[research/calibration.md](research/calibration.md#opt-in-ppa-predictive-substitution-v23-research-only).

`--include-sor-variants` adds the four research-only **SOR component-variant**
experiments (v2.4): same baseline weights, SOR component recalculated with one
changed assumption per variant: exact Poisson-binomial aggregation,
venue-adjusted win probabilities, or a balanced / predictive-leaning
opponent-rating source. Offline and deterministic (no new data source, no
network beyond the games the harness already loads); the default run never
includes them, and the production SOR calculation is never modified. See
[research/sor-refinement.md](research/sor-refinement.md). Both flags compose:
`--include-ppa --include-sor-variants` runs the default set plus all five
opt-in experiments.

Season games load **cache-first**: the harness reads and writes the same
per-year cache the production pipeline uses
(`data/cache/cfbd/{year}/games_w15_s1.parquet`), so each historical season
costs CFBD API quota at most once ever; cached seasons run fully offline.

Outputs in `data/output/calibration/`:

- `calibration.json`: machine-readable contract (experiments, metrics, deltas, holdouts, decisions)
- `calibration.md`: human-readable report
- `calibration.csv`: one summary row per experiment
- `committee-emulation.{json,md,csv}`: Committee Emulation lite summary derived
  deterministically from the calibration results (committee-aligned candidate
  profiles, tradeoffs, holdout safety)

"Recommended" and "committee-aligned candidate" mean *worth follow-up
research*. No calibration run changes the production model.

See [research/calibration.md](research/calibration.md) and
[research/committee-emulation.md](research/committee-emulation.md) for
methodology, thresholds, and interpretation guardrails.

---

## `sroom fit-preferences`

Revealed committee preferences research harness (v2.5 research mode). **Inverse-fits**
the four composite weights to approximate published CFP rankings for a season or
week. Descriptive only: it estimates what factor blend best explains the
committee's published order under Selection Room's transparent model. It never
changes production defaults in [`src/pipeline/weights.py`](../src/pipeline/weights.py).

```bash
# Season-final fit (default: final CFP ranking week per season)
./bin/sroom fit-preferences [--years 2014:2024]
./bin/sroom fit-preferences --season 2025

# Weekly backtest against curated committee releases (2024 has all six)
./bin/sroom fit-preferences --season 2024 --weeks all
./bin/sroom fit-preferences --years 2014:2025 --weeks all
./bin/sroom fit-preferences --season 2024 --weeks 12

# Experimental objective zones
./bin/sroom fit-preferences --season 2025 --objective top12
./bin/sroom fit-preferences --season 2025 --objective bubble
```

| Option | Description |
|--------|-------------|
| `--years` | Year range (`2014:2024`) or comma-separated list. Default: `2014–2024` when neither `--years` nor `--season` is set |
| `--season` | Single season year (mutually exclusive with `--years`) |
| `--weeks` | Week number (data cutoff, `games_through_week`), or `all` for every registered weekly CFP fixture. Default: final ranking week (week 15). Curated release-dated fixtures live in `tests/fixtures/cfp_weekly/` (2024: all six committee releases) and are registered automatically |
| `--objective` | Committee slice to fit against: `top25` (default), `top12`, or `bubble` (positions 7–18, experimental) |

Year range format matches `sroom calibrate`: `2014:2024` or `2014,2015,2016`.

The fitter runs a **two-stage search**: a fast tiebreaker-free pass prunes the
four-weight simplex grid (5% step, always including the production baseline
40/30/20/10 and equal weights 25/25/25/25 as explicit candidates), then the
surviving candidates are re-scored with the production ranking function
(`rankings_for_weights`, including committee tiebreakers) and the best fit is
selected there. It reports a **near-optimal region** (re-scored candidates within
0.25 rank error of the best fit) with a per-component spread that drives the
confidence label, plus an **edge-weight warning** when any fitted component lands
near 0% or at/above 50%, and an **incomplete-coverage warning** (confidence capped
at directional) when the season cache averages fewer than ~10 games per team.
The coverage warning distinguishes a truncated cache (earliest week > 1: refetch
from week 1) from a genuinely short season already starting at week 1 (for
example 2020, ~7.7 games per team: interpret with extra caution).
Weekly fits carry directional-confidence warnings; early weeks are noisier than
final-field fits.

Season games load **cache-first** (same `data/cache/cfbd/{year}/` path as
`calibrate` and `validate`). Requires cached games for integration runs; no new
network calls beyond what the harness already uses.

Outputs in `data/output/calibration/` (all artifacts include `research_only: true`):

- `revealed-preferences.json`: machine-readable contract (fits, near-optimal region, baselines, 2025 public-case diagnostic)
- `revealed-preferences.md`: human-readable report with weekly drift block when multiple weeks are fitted
- `revealed-preferences.csv`: one row per `(season, week)` with weights, rank error, confidence, headline
- `revealed-preferences-weekly.json`: written only when a season has 2+ weekly fits; release-keyed fits with week-over-week volatility (contract in [api-contracts.md](api-contracts.md))

See [research/revealed-committee-preferences.md](research/revealed-committee-preferences.md)
for methodology, canonical language, near-optimal interpretation, and weekly
backtest guardrails.

---

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
| `make calibrate` | `./bin/sroom calibrate --years 2014:2024` |
| `make verify` | tests + lint + sample smoke run |

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CFBD_API_KEY` | College Football Data API key |

Set in `.env` (see `.env.example`) or export in shell.
