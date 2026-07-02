# Historical Validation

## Methodology

Validation compares simulator output to historical CFP final top-12 rankings (2014–2023 proxy for playoff field).

Metrics per season:

| Metric | Description |
|--------|-------------|
| Spearman correlation | Rank order agreement on common teams |
| Selection accuracy | Overlap of simulated vs CFP top-12 |
| Seeding exact match | Same seed assignment |
| Seeding ±1 | Seed within one position |
| Prediction MAE/RMSE | Game margin prediction error |

## Format-Aware Rules (2024+)

From 2024 onward, validation uses:

- `select_playoff_field()` with year-appropriate `PlayoffFormat`
- `seed_playoff_teams()` with 2024 champion-bye or 2025+ straight seeding

When conference champion data is unavailable, all teams default to non-champion for auto-bid purposes; field selection falls back to rank-order at-large fill.

## Reporting

Run validation:

```bash
cfp-sim validate --years 2014:2023
```

Results write to `data/output/validation/backtest_results.csv` with year-by-year tables. Aggregate accuracy claims should always cite the underlying table, not headline percentages.

## Sample Results (2021–2023, prior composite)

| Year | Spearman | Selection Acc | Seeding ±1 |
|------|----------|---------------|------------|
| 2023 | 0.82 | 58% | 29% |
| 2022 | 0.48 | 67% | 38% |
| 2021 | 0.88 | 58% | 29% |

Re-run after model changes to update these figures.
