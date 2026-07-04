# Calibration & Ablation Harness (v2 research mode)

**This measures how transparent assumptions changed historical alignment and
predictive signal.** It does not identify a "correct" model, it is not
committee replication, and it never changes the default production weights
(40/30/20/10 resume/predictive/SOR/SOS). Every calibration run is a research
artifact, not a model update.

**Recommended experiments are candidates for follow-up testing. They do not
change the production model.** The `recommended` label means "cleared the
research quality gate" — a weight change to production remains a separate,
deliberate product decision that no calibration run makes automatically.

```bash
make calibrate                # or: ./bin/sroom calibrate --years 2014:2024
```

Outputs land in `data/output/calibration/` as `calibration.json` (the
contract), `calibration.md` (report), and `calibration.csv` (one row per
experiment).

## What it does

The composite's four pillar scores are computed once per season by the
production pipeline — they do not depend on the composite weights. The harness
then reweights those pillars per experiment, re-resolves rank ties with the
committee tiebreakers, and re-runs all three validation tracks:

1. **Committee alignment** — Spearman on the top 12, top-12 overlap, bubble
   overlap vs published CFP rankings.
2. **Era-correct selection** — field overlap and field-size correctness under
   each season's real ruleset (4-team `nsmallest(4)` through 2023; 12-team
   auto-bid/at-large selection and seeding for 2024).
3. **Predictive signal** — Brier score and win-side accuracy from composite
   margins on completed games.

## Experiment set

| Group | Experiments |
|---|---|
| Baseline | Production defaults (0.40/0.30/0.20/0.10) — the reference every delta is measured against |
| Ablations | `no_sor`, `no_sos`, `no_predictive`, `no_resume` — zero one pillar, renormalize the rest to 1.0 |
| Sweeps | `resume_heavy` (0.55), `predictive_heavy` (0.50), `sor_heavy` (0.35), `balanced` (25/25/25/25), `committee_alignment_candidate` (0.45/0.25/0.20/0.10), `predictive_signal_candidate` (0.30/0.45/0.15/0.10) |
| Optional probes | `sos_capped` (SOS→0.05), `sor_boosted` (SOR→0.30), `predictive_only` (0/1/0/0) |

Ablations answer "what does this pillar contribute?"; sweeps answer "what does
leaning on a pillar cost?". `colley_share` and all component definitions are
held fixed — this harness sweeps composite weights only.

## The research quality gate

The core question is never "did a number go up" but **"did this assumption
actually help, where, and at what cost?"** Every experiment must report:

- **Deltas vs baseline** on the outlier-excluded view: Δ spearman_top12,
  Δ top12_overlap, Δ field_overlap, Δ correct_field_size_rate, Δ brier,
  Δ win_accuracy — plus the same deltas on the all-seasons view.
- **Per-year metrics**, with outlier seasons (2022) labeled, never hidden.
- **Holdout checks**: 2022 (outlier stress test — does the change collapse in
  a chaotic year?) and 2024 (modern 12-team format — does it survive the
  format the model actually runs under?).
- **A decision label with a reason**: `recommended`, `promising`, `neutral`,
  `rejected`, or `needs_more_data`.

### Initial thresholds

These are **initial** gate values chosen to prevent vibes-driven conclusions —
starting points, not permanent scientific truth:

| Metric | Meaningful change |
|---|---|
| Spearman top-12 | ±0.02 |
| Top-12 overlap | ±3 pp |
| Field overlap | ±3 pp (protected on the downside) |
| Brier | ∓0.005 (protected on the downside) |

**Protected metrics.** A material drop in mean field overlap, mean Brier, or
the 2024 holdout's field overlap blocks `recommended` no matter what else
improved — those are the trust metrics users rely on.

**Decision ladder** (applied on the outlier-excluded view):

- No meaningful movement → `neutral`.
- Harms only → `rejected`.
- Improvements, but a protected metric materially drops → `neutral` (blocked),
  with the block named in the reason.
- Improvement that only exists when 2022 is included → `needs_more_data`
  (flagged `overfits_outliers` — the gain is the outlier, not the assumption).
- Improvement with a non-protected tradeoff (e.g. predictive signal up,
  alignment down) → `promising` — an intentional-divergence candidate, not a
  free win.
- Clean improvement, holdouts intact → `recommended`.

## How to read the results

- A `recommended` label means "this assumption cleared the gate on historical
  data" — it is an argument for a follow-up experiment, not an instruction to
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

## Scope guardrails (v2.1)

This slice deliberately does **not**: change production weights, feed Scenario
Lab defaults, add a calibration web UI, or introduce new data sources
(PPA/EPA, recency decay, injuries, play-by-play). Those are later v2 tracks
(see [v2-tracks-research.md](v2-tracks-research.md)) and each must pass
through this harness before graduating from research mode.

**Bottom line:** no model change graduates from research mode unless the
calibration harness can show the improvement, the tradeoff, the holdout
behavior, the reason, and the decision.
