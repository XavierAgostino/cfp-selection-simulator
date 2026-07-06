# Historical Validation

## Overview

Validation is split into **three tracks**. Do not collapse them into one "accuracy" number.

| Track | Question | Headline metrics |
|-------|----------|------------------|
| **Committee replication** | How close is the model to CFP committee rankings? | Top-12/25 Spearman, top-12 overlap, bubble overlap |
| **Era-correct selection** | Did the simulator pick the right field under that season's rules? | 4-team or 12-team field overlap, auto/at-large (2024+) |
| **Predictive** | Is the model useful for forecasting games? | Brier score, win accuracy, margin MAE |

Pre-2024 **field validation uses the actual 4-team CFP bracket**, not top-12 ranking overlap. Calling top-12 overlap "selection accuracy" for those years was misleading and has been removed.

## CLI

```bash
# All three tracks (default)
sroom validate --years 2014:2024

# Single track
sroom validate --years 2021:2023 --target committee
sroom validate --years 2014:2024 --target selection
sroom validate --years 2021:2023 --target predictive
```

## Outputs

Written to `data/output/validation/`:

| File | Contents |
|------|----------|
| `committee_replication.csv` | Spearman, rank error, top-12/bubble overlap |
| `era_selection_validation.csv` | Era-correct field overlap, auto/at-large, displacements |
| `predictive_validation.csv` | Brier, win accuracy, margin error by model |
| `validation_summary.md` | Human-readable year-by-year tables |
| `validation_manifest.json` | Run metadata and file paths |
| `backtest_results.csv` | Legacy committee slice (deprecated columns) |

## Era mapping

| Years | Era | Field validation target | Ruleset |
|-------|-----|-------------------------|---------|
| 2014–2023 | `four_team` | Top **4** playoff teams | `four_team_cfp` |
| 2024 | `twelve_team_2024` | 12-team field, 5+7 | `2024` champion-byes |
| 2025+ | `twelve_team_2025_plus` | 12-team field, 5+7 | `2025_plus` straight seeding |

## Committee replication metrics

- **Spearman (top-25 / top-12)**: Rank-order correlation on published CFP lists
- **Average rank error**: Mean absolute rank difference on common teams
- **Top-12 overlap**: How many of the committee's top 12 appear in your top 12 (rank imitation, not field selection pre-2024)
- **Bubble overlap (ranks 10–12)**: Borderline-team agreement

Top-25 fixtures are complete for 2024; earlier seasons use the deepest published CFP list available (typically top 12).

## Era-correct selection metrics

### 2014–2023 (4-team)

Simulator field = **top 4 by composite rank** (transparent model rule).

Compared against documented 4-team participants in `src/validation/historical.py`.

### 2024+ (12-team)

Simulator runs full `select_playoff_field()` with CFBD CCG champion labels when available.

Additional 2024 metrics:

- Auto-bid overlap (5 conference champions)
- At-large overlap (7 teams)
- First team out comparison (e.g. Alabama 2024)
- Displacement flag when a champ outside the top 12 is pulled in

**Seeding exact match** is recorded for diagnostics only. It is not a headline KPI.

## Predictive metrics

Composite vs Elo, SRS, and home-field baselines on the same game sample:

- Brier score (home win probability)
- Win prediction accuracy
- Margin MAE / RMSE

Predictive performance protects against overfitting to committee votes.

## Outlier years

**2022** is flagged as an outlier in aggregate summaries. Committee decisions that year diverged sharply from formula rankings (TCU, Kansas State). Exclude from headline averages when reporting replication quality.

## Current results (defaults: 40/30/20/10, start_week 1)

Snapshot from `make validate` on the 2014-2024 backtest, which selected the
current default weights and full-season data window:

| Year | Field overlap | Misses |
|------|---------------|--------|
| 2014 | 4/4 | None |
| 2015 | 3/4 | Stanford in, Oklahoma out |
| 2016 | 3/4 | Michigan in, Clemson out |
| 2017 | 2/4 | Auburn/UCF in, Alabama/Oklahoma out |
| 2018 | 3/4 | Georgia in, Oklahoma out |
| 2019 | 3/4 | Penn State in, Oklahoma out |
| 2020 | 1/4 | COVID year: conference-only P5 schedules starve the graph |
| 2021 | 4/4 | None |
| 2022 | 4/4 | None |
| 2023 | 4/4 | None |
| 2024 | 11/12 | Alabama in, Tennessee out (auto bids 5/5) |

Mean field overlap ~79%; the only structural failure is 2020, where G5
unbeatens (BYU, Cincinnati, Coastal Carolina) can't be separated from P5
contenders without cross-conference games.

## Interpretation guidelines

| Metric | Good (rough guide) | Notes |
|--------|-------------------|-------|
| Top-12 Spearman | 0.75–0.85 avg | Committee is subjective; 0.95+ unrealistic |
| 4-team field overlap | 3/4 avg | One miss per year is common |
| 12-team field overlap | 8–9/12 | 2024 case study target |
| Top-12 overlap (pre-2024) | Diagnostic only | Not field selection |
| Brier vs Elo | Lower is better | Composite should beat naive baselines |

## Weight calibration

The current defaults came from a weight sweep evaluated with this harness
(field overlap + committee Spearman across 2014-2024). The SOR-heavy
40/30/20/10 mix matched or beat 50/30/10/10 in every season. A built-in
calibration command remains future work:

```bash
# Planned: do not mix with validation
sroom calibrate --train-years 2014:2021 --holdout-years 2022,2024
```

## Module layout

```
src/validation/
├── historical.py           # CFP top-25, 4-team fields, 2024 12-team field
├── era.py                  # year → era spec
├── metrics.py              # Spearman, overlap, rank error
├── committee_validation.py   # Track 1
├── selection_validation.py   # Track 2
├── predictive_validation.py  # Track 3
├── reports.py              # CSV + Markdown output
└── backtest.py             # CLI orchestrator
```

## Related

- [CFP committee alignment](cfp-committee-alignment.md)
- [Limitations & ethics](limitations-and-ethics.md)
- [2024 first 12-team field case study](case-studies/2024-first-12-team-field.md)
