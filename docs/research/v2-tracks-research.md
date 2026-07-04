# v2 Tracks — Research Parking Note

**Status: researched, deferred.** This document parks post-v1 research intent. It is
**not** a roadmap commitment, and nothing here is under construction. Implementation
does not begin until the go/no-go criteria below are met and v1.5
export/reproducibility work is complete.

---

## 0. Product intent

Selection Room becomes valuable **not because it claims to know the right answer**,
but because it makes every assumption **testable, auditable, and comparable**.

> Selection Room is an independent decision platform for college football selection
> analysis. It lets users inspect the field, audit the selection path, test
> transparent assumptions, validate model behavior historically, and export
> reproducible scenarios.

### Four model layers — keep separate

| Layer | Question it answers |
|---|---|
| **Selection model** | Who deserves / gets selected under published rules? |
| **Predictive model** | How strong are teams on the field? |
| **Validation model** | How did assumptions perform historically? |
| **Scenario model** | What changes if assumptions change? |

Blurring these layers destroys user trust. Every v2 experiment must state which
layer it touches and must not leak conclusions across layers.

### Three traps to avoid

1. **Black-box oracle** — never "this model knows the correct field"; always "this
   platform shows how transparent selection assumptions change the field."
2. **Overfitting to the committee** — Committee Emulation measures alignment under
   transparent assumptions; it does not optimize for perfect mimicry. Results must
   say when the model is committee-aligned, intentionally different, or trading
   alignment for predictive signal.
3. **Mixing predictive football with selection modeling** — EPA/PPA upgrades the
   football-quality signal; it is not a substitute for selection logic or for the
   validation tracks.

---

## 1. What v1 already does

- **Composite pipeline** with default weights 40% resume / 30% predictive /
  20% SOR / 10% SOS (`src/pipeline/weights.py`; canonical description in
  [model-methodology.md](model-methodology.md)). Strength of Record is already
  shipped — Poisson-binomial, weighted at 20%.
- **Three-track historical validation** (`sroom validate`, 2014–2024; see
  [historical-validation.md](historical-validation.md)). Live artifact summary,
  outlier season 2022 excluded from committee/selection means:
  - Committee alignment: mean top-12 Spearman **0.765**, mean top-12 overlap
    **78.3%** across 10 seasons.
  - Era-correct selection: correct field size in **100%** of seasons, mean field
    overlap **76.7%**.
  - Predictive signal (composite rows only): mean Brier **0.178**, win-side
    accuracy **72.2%**, margin MAE **14.1** across 11 seasons — retrospective
    scoring, not spread-beating or live forecasting.
- **Scenario Lab** — weights-only reweighting with run-grounded diffs.
- **Selection Stability** — Monte Carlo weight perturbation
  ([sensitivity-analysis.md](sensitivity-analysis.md)).
- **Reproducibility foundation** — run manifests with config hash and weights,
  audit steps in run output, exportable artifacts.

## 2. What limitations remain

- **Injuries / availability** — not modeled; roster changes can move committee
  judgment without changing box scores.
- **Recency** — no explicit recency weighting (note: Elo is already chronological,
  so "add recency decay" is not automatically a win — see corrections below).
- **CFP 2025 record-strength parity** — published 2025 guidance emphasizes record
  strength in ways the current composite may not fully separate.
- **No play-by-play data** — predictive layer runs on game-level results; no
  EPA/PPA efficiency signal.

## 3. Candidate improvements (priority order)

1. **Calibration and ablations** — most important; turns Selection Room into a
   research tool. **Implemented (v2.1):** `sroom calibrate` runs weight sweeps
   and component ablations (remove SOR, shift predictive weight, cap SOS, …)
   against the validation harness with a research quality gate. See
   [calibration.md](calibration.md).
2. **Committee Emulation lite** — measure the historical relationship between
   transparent assumptions and committee selections. See guardrail below.
3. **EPA/PPA predictive layer** — biggest football-quality upgrade. Use CFBD
   `/ppa/teams` and `/ppa/games` first; full play-by-play only after PPA proves
   marginal value.
4. **SOR / resume refinement** — home-field adjustment, opponent-strength
   treatment, era-aware handling. Selection Room–native work.
5. **Injuries / VORP / full PBP** — last; data quality, subjective assumptions,
   and maintenance burden are all high. Gated behind an explicit go/no-go.

### Committee Emulation guardrail (product identity)

**Do not** frame the goal as "copy the committee perfectly."

**Do** frame it as: *measure which transparent assumptions increase or decrease
alignment with historical committee behavior.* This preserves Selection Room as an
unbiased audit tool, not a committee replica.

## 4. Why not now

The v1 trust layer (field, rules, bubble, Scenario Lab, validation dashboard) is
what earns credibility; research experiments on top of an untrusted base help no
one. v1.5 export/share and reproducibility (run IDs, stable artifacts, shareable
scenarios) must land before v2 experiments, so that every experiment result is an
exportable, reproducible artifact rather than a screenshot.

## 5. Experiment protocol

- All experiments run through `sroom validate` (and the future `sroom calibrate`),
  never ad-hoc notebooks that bypass the harness.
- **Holdout seasons: 2022 and 2024.** Tune on the remaining seasons; report holdout
  results separately. 2022 is a known outlier year and is the stress test, not a
  tuning target.
- Every experiment records: config hash, weights/parameters, seasons used,
  validation artifact, and a one-line statement of which model layer it touches.
- Results are comparable only within a track — committee alignment numbers and
  predictive numbers are never averaged together.

## 6. Go/no-go criteria

An experiment graduates from research to product only if:

- It shows a **marginal improvement in field overlap** (selection track) or
  **Brier score** (predictive track) on the holdout seasons — not just the tuning
  seasons.
- The result explicitly states whether the change makes the model
  **committee-aligned**, **intentionally different**, or **trading alignment for
  predictive signal** — one of the three, stated in the artifact.
- Realistic targets: top-12 Spearman is capped at **0.75–0.85** (the current mean
  is 0.765; chasing 0.90+ means overfitting the committee). Predictive win-side
  accuracy is a retrospective metric — do not conflate it with against-the-spread
  performance, whose edges are far smaller.

## 7. Deferred implementation checklist — do not start

- ~~`sroom calibrate` implementation~~ — shipped as v2.1 ([calibration.md](calibration.md))
- Recency decay
- Injury feed / VORP multiplier
- Play-by-play DuckDB schema
- Hosted adapters (H1–H7)

## 8. Analyst workflow questions

Every v2 capability should move toward answering, for any scenario:

- What changed? Why? Which teams?
- Was this assumption historically better?
- Is it committee-aligned or predictive — and is the divergence intentional?
- Can I export and share it as a reproducible artifact?

---

## Corrections to prior research assumptions

| Assumed gap | Repo reality |
|---|---|
| Build SOR for v1.5 | Already shipped — Poisson-binomial at 20% of the composite |
| Target 0.90 Spearman | Unrealistic — cap expectations at 0.75–0.85 (current mean 0.765) |
| 65% predictive target | Metric confusion — win-side accuracy (currently 72.2%, retrospective) is not against-the-spread accuracy; ATS edges are much smaller and must not be conflated |
| Recency decay = committee win | May conflict with CFP's stated behavior; Elo is already chronological |
| Full PBP DuckDB for EPA | Premature — CFBD `/ppa/teams` and `/ppa/games` first |

---

## Related Docs

- [Research index](index.md)
- [Limitations and Ethics](limitations-and-ethics.md)
- [Historical Validation](historical-validation.md)
- [Model Methodology](model-methodology.md)
- [Sensitivity Analysis](sensitivity-analysis.md)
