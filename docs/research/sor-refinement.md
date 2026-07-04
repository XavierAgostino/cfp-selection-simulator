# SOR Refinement (v2.4, research-only)

**This evaluates alternate ways to calculate the existing Strength of Record
component. It does not change the production SOR, the composite weights
(40/30/20/10), or any Scenario Lab default.** Every variant is an opt-in
calibration experiment behind `--include-sor-variants`; the production
`calculate_sor` stays exactly as it is unless a future, deliberate decision —
backed by this research board — promotes a variant.

```bash
./bin/sroom calibrate --years 2014:2024 --include-sor-variants
```

The variants run entirely from existing local data — no new data source, no
network, fully deterministic.

## Why SOR

The research board after v2.1–v2.3 points at selection-native signals: the
committee-aligned candidates are all resume/SOR-tilted profiles, and the v2.3
PPA substitution showed data-source swaps get blocked by the modern-format
holdout. SOR is the pillar where the *calculation method* itself has known,
documented approximations worth auditing:

1. **Averaged-probability aggregation.** Production SOR asks "what is the
   probability an average top-25 team (rating 0.75) achieves this record
   against this schedule?" — but for every real schedule size (n ≤ 20 games)
   it answers with a binomial on the *averaged* per-game win probability.
   That erases the distribution of opponent difficulty: beating one elite and
   one weak opponent scores the same as beating two average ones, which is
   precisely the distinction SOR exists to make. (Docs that describe
   production SOR as "Poisson-binomial" describe the intent; the shipped
   n ≤ 20 branch is the averaged-binomial approximation.)
2. **Venue blindness.** Production win probabilities ignore where the game
   was played; a road win and a home win against the same opponent are worth
   the same.
3. **Opponent-rating source.** Production rates SOR opponents by a provisional
   composite of 0.50·resume + 0.30·predictive — so the SOR pillar partially
   double-counts resume signal that the composite already weights at 0.40.

## The variants

Each variant changes **exactly one** of those assumptions, so any delta is
attributable to that assumption alone. All four keep the baseline
0.40/0.30/0.20/0.10 weights and carry `"experiment_type":
"component_variant"`, `"research_only": true`, and a `"variant"` metadata
block in `calibration.json`.

| Experiment | Changed assumption | Everything else |
|---|---|---|
| `sor_exact_poisson_binomial` | Aggregation: exact O(n²) dynamic-programming Poisson binomial (no approximation, no exponential enumeration) | Baseline opponent ratings, venue-blind |
| `sor_home_field_adjustment` | Venue: per-game win probability shifted by a documented rating offset (home up, away down, neutral unchanged) | Baseline opponent ratings, averaged-binomial aggregation |
| `sor_opponent_rating_balanced` | Opponent ratings: balanced 0.50 resume / 0.50 predictive blend | Averaged-binomial aggregation, venue-blind |
| `sor_opponent_rating_predictive` | Opponent ratings: predictive-leaning 0.30 resume / 0.70 predictive blend | Averaged-binomial aggregation, venue-blind |

The opponent-rating variants are deliberately limited to those two blends —
this is an audit of the resume double-count, not a grid search.

### Home-field constant caveat

The home-field variant uses one constant, `HOME_FIELD_RATING_OFFSET = 0.033`
(`src/calibration/sor_variants.py`), applied on the 0–1 rating scale: home
games shift the hypothetical top-25 team's rating edge up by 0.033, away games
down by 0.033, neutral-site games (per the `neutral_site` flag in the games
data) are untouched. On the production logistic that gives the top-25 team a
~57.5% win probability at home against an equally rated opponent — a
conventional ballpark for college-football home advantage. **This constant is
a documented research assumption, not a fitted or definitive home-field
value.** It is deliberately a single named constant so it is easy to change;
the experiment's metadata records it as such:

```json
"home_field_adjustment": {
  "enabled": true,
  "method": "rating_offset",
  "rating_offset": 0.033,
  "neutral_sites_adjusted": false,
  "constant_source": "documented research assumption"
}
```

### Explicit degradation

Like the v2.3 substitution, missing candidate data is never silently filled:
if any ranked team in a season lacks a variant SOR score, the whole season is
reported as unavailable for that experiment (per-year note,
`incomplete_seasons`/`data_unavailable` flags). In practice the variants
recompute from the same games data the pipeline already has, so seasons only
degrade if that data is genuinely absent.

## Audit note: conference championship games

Conference championship games are played inside the week-15 selection window —
the committee sees their results before selecting the field. They are
therefore **not leakage** for selection-time analysis, and SOR (baseline and
all variants) correctly includes them. No experiment is needed to "fix" CCGs;
this note exists so the question stays answered.

## Deferred: résumé quality-win thresholds

Quality-win threshold variants (e.g. counting wins over top-N opponents with
different N or different rating cutoffs) belong to the **résumé pillar**, not
SOR, and are deferred to a separate résumé-pillar research slice. v2.4 changes
only how the SOR component is calculated.

## Results

**Status: implemented and tested; full 2014–2024 evaluation pending.** The
first full run attempt (2026-07-04) was blocked by an exhausted CFBD monthly
API quota: the harness previously re-fetched every season's games from the
CFBD API on every calibration run, and the quota ran out — 10 of 11 seasons
failed to load, which is not an evaluation. Two things came out of that run:

- **The harness is now cache-first for season games.** It reads and writes
  the same on-disk cache the production pipeline uses
  (`data/cache/cfbd/{year}/games_w15_s1.parquet`), so a season is fetched at
  most once ever; after that, calibration runs are offline and deterministic.
  When quota is available again, one full run populates the caches for all
  historical seasons permanently.
- **A real offline smoke run on 2024** (the one season already cached)
  verified the entire variant path end to end: all four variants evaluated on
  real data, carried their `component_variant` metadata through
  `calibration.json`, both markdown reports, and the committee-emulation
  summary, and produced plausibly small deltas (a component recalculation,
  not a reweighting). A single season has no tuning/holdout split, so those
  numbers are plumbing verification, **not** results.

The full-run results table and decision reasons will be added here after the
first complete 2014–2024 `--include-sor-variants` run.

## Scope guardrails (v2.4)

This slice deliberately does **not**: modify `calculate_sor` or any production
component, change composite weights or Scenario Lab defaults, add résumé
quality-win threshold or conference-title experiments, touch PPA/play-by-play
or injury data, or add hosted adapters. Every variant runs through the same
calibration quality gate and committee-emulation lens as every other
experiment ([calibration.md](calibration.md),
[committee-emulation.md](committee-emulation.md)); a protected-holdout failure
blocks promotion no matter what else improved.
