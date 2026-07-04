# Committee Emulation Lite (v2.2 research mode)

**This measures which transparent assumptions increase or decrease alignment
with historical committee behavior.** It is not committee replication, it does
not identify a "correct" model, and it never changes the production weights.

**Committee-aligned candidates are follow-up research candidates. They do not
change the production model.**

## What it is

An interpretive layer over the [calibration harness](calibration.md) — no new
model, no new data sources. Every `sroom calibrate` run also writes a
committee-emulation summary derived deterministically from the calibration
results: same `calibration.json` in, byte-identical summary out.

Outputs in `data/output/calibration/`:

- `committee-emulation.json` — candidate assessments (the contract)
- `committee-emulation.md` — candidate board + per-candidate detail
- `committee-emulation.csv` — one row per experiment

## The question it answers

> Can we describe committee behavior with transparent assumptions better than
> the baseline — and at what cost?

Not: "can we make Selection Room copy the committee?" That distinction is the
product identity guardrail from
[v2-tracks-research.md](v2-tracks-research.md): Selection Room stays an
unbiased audit tool, never a committee replica. Alignment also has a practical
ceiling (top-12 Spearman ~0.75–0.85); chasing it further means overfitting the
committee, which this track deliberately avoids.

## Candidate statuses

A committee-aligned candidate is a follow-up research profile that improved
historical alignment without failing protected tradeoff checks. It is not a
production default and not a claim that the model should copy the committee.

Each non-baseline calibration experiment is classified:

| Status | Meaning |
|---|---|
| `committee_aligned_candidate` | Improves committee alignment (Δ Spearman ≥ +0.02 or Δ top-12 overlap ≥ +3 pp) without failing any protected metric — worth follow-up research |
| `blocked` | Improves alignment but fails a protected metric (field overlap, Brier, or the 2024 modern-format holdout) — not safe, regardless of the alignment gain |
| `not_committee_aligned` | Does not meaningfully improve alignment vs baseline |

These statuses are a second lens over the same experiments, not a replacement
for the calibration decision labels: `recommended | promising | neutral |
rejected | needs_more_data` answer "did this assumption help overall?", while
the statuses here answer "did it track committee behavior, and was the gain
safe?". The two can disagree in informative ways — a calibration-`recommended`
experiment whose gains are field/predictive-only would still be
`not_committee_aligned` here, and a gate-blocked `neutral` (like
`no_predictive`) shows up as `blocked` with its protected failure named.

Every assessment carries the full quality gate: deltas vs baseline, the 2022
outlier stress test, the 2024 modern-format holdout, the predictive-signal
tradeoff, the field-overlap tradeoff, and the calibration decision + reason.
Alignment and predictive signal are different tracks — a candidate's
predictive tradeoff is always labeled (`improves` / `neutral` / `degrades`),
never averaged into its alignment score.

## How to read it

- A `committee_aligned_candidate` is an argument for a refinement experiment
  (smaller weight steps around that profile), not a weight change. Promotion
  to production is a deliberate product decision made outside research mode.
- `blocked` entries are often the most instructive: they show which alignment
  gains are being purchased with modern-format field accuracy or predictive
  signal — exactly the tradeoffs an analyst should see, not hide.
- The baseline's own alignment numbers (excluding outliers and all-seasons)
  are included so candidates are read against the honest reference.

## Scope guardrails (v2.2)

This slice deliberately does **not**: implement recency decay, PPA/EPA,
injuries, or any new data source; change production defaults; or make
Scenario Lab defaults follow recommended experiments. Later tracks
(PPA/EPA, SOR refinement) must pass through the calibration harness and this
lens before graduating from research mode — and v2.3 proved the path works:
the opt-in PPA predictive substitution passed through both gates, improved
broad historical metrics, and was **blocked** on the 2024 modern-format
holdout rather than promoted (see
[calibration.md](calibration.md#opt-in-ppa-predictive-substitution-v23-research-only)).
