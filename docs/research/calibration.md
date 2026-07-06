# Calibration & Ablation Harness (v2 research mode)

**This measures how transparent assumptions changed historical alignment and
predictive signal.** It does not identify a "correct" model, it is not
committee replication, and it never changes the default production weights
(40/30/20/10 resume/predictive/SOR/SOS). Every calibration run is a research
artifact, not a model update.

**Recommended experiments are candidates for follow-up testing. They do not
change the production model.** The `recommended` label means "cleared the
research quality gate", and a weight change to production remains a separate,
deliberate product decision that no calibration run makes automatically.

```bash
make calibrate                # or: ./bin/sroom calibrate --years 2014:2024
```

Outputs land in `data/output/calibration/` as `calibration.json` (the
contract), `calibration.md` (report), and `calibration.csv` (one row per
experiment).

## What it does

The composite's four pillar scores are computed once per season by the
production pipeline; they do not depend on the composite weights. The harness
then reweights those pillars per experiment, re-resolves rank ties with the
committee tiebreakers, and re-runs all three validation tracks:

1. **Committee alignment**: Spearman on the top 12, top-12 overlap, bubble
   overlap vs published CFP rankings.
2. **Era-correct selection**: field overlap and field-size correctness under
   each season's real ruleset (4-team `nsmallest(4)` through 2023; 12-team
   auto-bid/at-large selection and seeding for 2024).
3. **Predictive signal**: Brier score and win-side accuracy from composite
   margins on completed games.

## Experiment set

| Group | Experiments |
|---|---|
| Baseline | Production defaults (0.40/0.30/0.20/0.10), the reference every delta is measured against |
| Ablations | `no_sor`, `no_sos`, `no_predictive`, `no_resume`: zero one pillar, renormalize the rest to 1.0 |
| Sweeps | `resume_heavy` (0.55), `predictive_heavy` (0.50), `sor_heavy` (0.35), `balanced` (25/25/25/25), `committee_alignment_candidate` (0.45/0.25/0.20/0.10), `predictive_signal_candidate` (0.30/0.45/0.15/0.10) |
| Optional probes | `sos_capped` (SOS→0.05), `sor_boosted` (SOR→0.30), `predictive_only` (0/1/0/0) |

Ablations answer "what does this pillar contribute?"; sweeps answer "what does
leaning on a pillar cost?". `colley_share` and all component definitions are
held fixed; these experiments sweep composite weights only.

### Opt-in: PPA predictive substitution (v2.3, research-only)

`sroom calibrate --include-ppa` adds one **component-substitution** experiment,
`ppa_predictive_substitution`: identical 0.40/0.30/0.20/0.10 weights, but the
predictive component's data source is swapped for a CFBD PPA score (per-team
mean offensive PPA minus mean defensive PPA per game). Same weights, same gate,
only the predictive component differs. The question it answers is *"does a
CFBD PPA-based predictive component improve predictive signal or
committee-safe alignment compared with the existing predictive component?"*,
not "can we rebuild the model with advanced analytics?".

- **Leakage guard.** Scores aggregate per-game PPA from CFBD `/ppa/games` over
  regular-season weeks 1–15, the same selection-time window as the rest of
  the pipeline. The season-aggregate `/ppa/teams` endpoint is deliberately not
  used: it ignores week bounds and folds bowl/playoff results into its
  averages, which would leak future information into selection-time rankings.
- **Explicit degradation.** If any ranked team in a season lacks PPA data,
  that season is reported as *unavailable* for the experiment (per-year note,
  `incomplete_seasons`/`data_unavailable` flags); missing data is never
  silently filled.
- **Offline by default.** The default `sroom calibrate` run never touches PPA.
  With `--include-ppa`, responses are cached under `data/cache/cfbd/{year}/`
  (`ppa_games_w15.json`); the network is used only when the cache is cold, and
  a failed fetch degrades the affected seasons instead of killing the run.
- **Auditable metadata.** The experiment's `calibration.json` entry carries
  `"research_only": true`, `"experiment_type": "component_substitution"`, and a
  `"substitution"` block naming the component and both sources
  (`current_predictive` → `cfbd_ppa`).

It runs through the same calibration quality gate and the committee-emulation
lens as every other experiment, and like every other experiment it never
changes production weights, Scenario Lab defaults, or the default predictive
component.

**Status: implemented, evaluated, not promoted.** On the full 2014–2024
evaluation the substitution improved every tuning-view metric: top-12
Spearman +0.029, top-12 overlap +0.050, field overlap +0.092 (the best field
overlap in the experiment set), Brier −0.0064, but degraded the 2024
modern-format holdout (alignment −0.084, field overlap −0.083), a protected
failure. Calibration decision: `neutral` (gains blocked by
`field_overlap_2024`); committee-emulation status: `blocked`. The gains
concentrate in the four-team era while the one completed 12-team season gets
worse, so the candidate is not safe for the modern selection format and is
not promoted. This is the gate doing its job: show the gain, show the cost,
protect the current selection format.

### Opt-in: SOR component variants (v2.4, research-only)

`sroom calibrate --include-sor-variants` adds four **component-variant**
experiments: identical 0.40/0.30/0.20/0.10 weights, same games data, but the
SOR component is recalculated with exactly one changed assumption per variant:
exact Poisson-binomial aggregation (`sor_exact_poisson_binomial`),
venue-adjusted win probabilities (`sor_home_field_adjustment`), or an
alternate opponent-rating source (`sor_opponent_rating_balanced`,
`sor_opponent_rating_predictive`). Unlike the PPA substitution, these need no
new data: they are offline, deterministic recalculations of an existing
pillar, so the experiment isolates the *method*, not the data source. Each
entry carries `"experiment_type": "component_variant"` and a `"variant"`
metadata block naming the component, variant id, and baseline/candidate
methods. The production `calculate_sor` is never modified; promotion of any
variant would be a separate, deliberate decision after the research board
proves it safe. Methodology, the home-field constant caveat, and full results:
[sor-refinement.md](sor-refinement.md).

## The research quality gate

The core question is never "did a number go up" but **"did this assumption
actually help, where, and at what cost?"** Every experiment must report:

- **Deltas vs baseline** on the outlier-excluded view: Δ spearman_top12,
  Δ top12_overlap, Δ field_overlap, Δ correct_field_size_rate, Δ brier,
  Δ win_accuracy, plus the same deltas on the all-seasons view.
- **Per-year metrics**, with outlier seasons (2022) labeled, never hidden.
- **Holdout checks**: 2022 (outlier stress test: does the change collapse in
  a chaotic year?) and 2024 (modern 12-team format: does it survive the
  format the model actually runs under?).
- **A decision label with a reason**: `recommended`, `promising`, `neutral`,
  `rejected`, or `needs_more_data`.

### Initial thresholds

These are **initial** gate values chosen to prevent vibes-driven conclusions,
starting points, not permanent scientific truth:

| Metric | Meaningful change |
|---|---|
| Spearman top-12 | ±0.02 |
| Top-12 overlap | ±3 pp |
| Field overlap | ±3 pp (protected on the downside) |
| Brier | ∓0.005 (protected on the downside) |

**Protected metrics.** A material drop in mean field overlap, mean Brier, or
the 2024 holdout's field overlap blocks `recommended` no matter what else
improved; those are the trust metrics users rely on.

**Decision ladder** (applied on the outlier-excluded view):

- No meaningful movement → `neutral`.
- Harms only → `rejected`.
- Improvements, but a protected metric materially drops → `neutral` (blocked),
  with the block named in the reason.
- Improvement that only exists when 2022 is included → `needs_more_data`
  (flagged `overfits_outliers`: the gain is the outlier, not the assumption).
- Improvement with a non-protected tradeoff (e.g. predictive signal up,
  alignment down) → `promising`, an intentional-divergence candidate, not a
  free win.
- Clean improvement, holdouts intact → `recommended`.

## How to read the results

- A `recommended` label means "this assumption cleared the gate on historical
  data", it is an argument for a follow-up experiment, not an instruction to
  change production weights. Weight changes remain a deliberate product
  decision.
- `promising` tradeoffs are where the interesting research lives: the
  committee-alignment ceiling (~0.75–0.85 Spearman) means alignment and
  predictive signal genuinely compete at the margin.
- Ablation deltas size each pillar's contribution; expect removing resume to
  hurt alignment most and removing predictive to hurt Brier most. Surprises
  there are worth a per-year look before believing the aggregate.
- 2020 is a shortened COVID season; treat its predictive metrics with caution.
  Seeding metrics exist only for 2024, the lone completed 12-team season.

## Downstream: Committee Emulation lite

Every `sroom calibrate` run also derives a
[Committee Emulation lite](committee-emulation.md) summary
(`committee-emulation.{json,md,csv}`, same directory) from these results: a
second lens that classifies each experiment as a committee-aligned follow-up
candidate, blocked, or not aligned. The calibration decision labels answer
"did this assumption help overall?"; the emulation statuses answer "did it
track committee behavior, and was the gain safe?".

## Scope guardrails (v2.1)

This slice deliberately does **not**: change production weights, feed Scenario
Lab defaults, add a calibration web UI, or introduce new data sources
(PPA/EPA, recency decay, injuries, play-by-play). Those are later v2 tracks
(see [v2-tracks-research.md](v2-tracks-research.md)) and each must pass
through this harness before graduating from research mode. (v2.3 added exactly
  one such track, the opt-in PPA predictive substitution above, as a
research-only experiment behind `--include-ppa`; v2.4 added the opt-in SOR
component variants behind `--include-sor-variants`; recency decay, injuries,
and full play-by-play remain out of scope.)

**Bottom line:** no model change graduates from research mode unless the
calibration harness can show the improvement, the tradeoff, the holdout
behavior, the reason, and the decision.
