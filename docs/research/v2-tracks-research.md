# v2 Tracks: Research Board

**Status: active research board.** Tracks 1–4 are implemented (calibration
harness, Committee Emulation lite, PPA predictive substitution, SOR refinement);
track 5 (revealed committee preferences) is **in progress** as research-only
inverse fitting. Injuries/VORP/full PBP stays deferred behind an explicit go/no-go.
This document is **not** a roadmap commitment: every implemented track is
research-only, and nothing here changes production defaults.

> **v1 beta release hardening:** V2.4 evaluation is pending CFBD quota/cache
> population. V2.5 (revealed preferences) is research implementation — no
> production promotion before the public demo launch.

---

## 0. Product intent

Selection Room becomes valuable **not because it claims to know the right answer**,
but because it makes every assumption **testable, auditable, and comparable**.

> Selection Room is an independent decision platform for college football selection
> analysis. It lets users inspect the field, audit the selection path, test
> transparent assumptions, validate model behavior historically, and export
> reproducible scenarios.

### Four model layers (keep separate)

| Layer | Question it answers |
|---|---|
| **Selection model** | Who deserves / gets selected under published rules? |
| **Predictive model** | How strong are teams on the field? |
| **Validation model** | How did assumptions perform historically? |
| **Scenario model** | What changes if assumptions change? |

Blurring these layers destroys user trust. Every v2 experiment must state which
layer it touches and must not leak conclusions across layers.

### Three traps to avoid

1. **Black-box oracle**: never "this model knows the correct field"; always "this
   platform shows how transparent selection assumptions change the field."
2. **Overfitting to the committee**: Committee Emulation measures alignment under
   transparent assumptions; it does not optimize for perfect mimicry. Results must
   say when the model is committee-aligned, intentionally different, or trading
   alignment for predictive signal.
3. **Mixing predictive football with selection modeling**: EPA/PPA upgrades the
   football-quality signal; it is not a substitute for selection logic or for the
   validation tracks.

---

## 1. What v1 already does

- **Composite pipeline** with default weights 40% resume / 30% predictive /
  20% SOR / 10% SOS (`src/pipeline/weights.py`; canonical description in
  [model-methodology.md](model-methodology.md)). Strength of Record is already
  shipped as Poisson-binomial, weighted at 20%.
- **Three-track historical validation** (`sroom validate`, 2014–2024; see
  [historical-validation.md](historical-validation.md)). Live artifact summary,
  outlier season 2022 excluded from committee/selection means:
  - Committee alignment: mean top-12 Spearman **0.765**, mean top-12 overlap
    **78.3%** across 10 seasons.
  - Era-correct selection: correct field size in **100%** of seasons, mean field
    overlap **76.7%**.
  - Predictive signal (composite rows only): mean Brier **0.178**, win-side
    accuracy **72.2%**, margin MAE **14.1** across 11 seasons, retrospective
    scoring, not spread-beating or live forecasting.
- **Scenario Lab**: weights-only reweighting with run-grounded diffs.
- **Selection Stability**: Monte Carlo weight perturbation
  ([sensitivity-analysis.md](sensitivity-analysis.md)).
- **Reproducibility foundation**: run manifests with config hash and weights,
  audit steps in run output, exportable artifacts.

## 2. What limitations remain

- **Injuries / availability**: not modeled; roster changes can move committee
  judgment without changing box scores.
- **Recency**: no explicit recency weighting (note: Elo is already chronological,
  so "add recency decay" is not automatically a win; see corrections below).
- **CFP 2025 record-strength parity**: published 2025 guidance emphasizes record
  strength in ways the current composite may not fully separate.
- **No play-by-play data**: predictive layer runs on game-level results; no
  EPA/PPA efficiency signal.

## 3. Candidate improvements (priority order)

1. **Calibration and ablations**: most important; turns Selection Room into a
   research tool. **Implemented (v2.1):** `sroom calibrate` runs weight sweeps
   and component ablations (remove SOR, shift predictive weight, cap SOS, …)
   against the validation harness with a research quality gate. See
   [calibration.md](calibration.md).
2. **Committee Emulation lite**: measure the historical relationship between
   transparent assumptions and committee selections. **Implemented (v2.2):**
   every `sroom calibrate` run derives a committee-emulation summary from the
   calibration results. See guardrail below and
   [committee-emulation.md](committee-emulation.md).
3. **EPA/PPA predictive layer**: biggest football-quality upgrade. Use CFBD
   `/ppa/teams` and `/ppa/games` first; full play-by-play only after PPA proves
   marginal value. **Implemented (v2.3), evaluated, not promoted,
   research-only:** `sroom calibrate --include-ppa` runs a single
   component-substitution candidate (baseline weights, predictive component
   swapped for CFBD per-game PPA) through the calibration and
   committee-emulation gates, never a wholesale predictive rewrite, and no
   production default changes. First full evaluation: improved broad
   historical metrics (including the best field overlap in the experiment
   set) but **blocked by the 2024 modern-format holdout**; see
   [calibration.md](calibration.md).
4. **SOR / resume refinement**: home-field adjustment, opponent-strength
   treatment, era-aware handling. Selection Room–native work. **Implemented,
   evaluation pending (v2.4).** Cache-first historical games loading added;
   full 2014–2024 SOR variant results pending CFBD quota/cache population.
   `sroom calibrate --include-sor-variants` runs four research-only component-variant
   experiments (exact Poisson-binomial aggregation, venue-adjusted win
   probabilities, balanced / predictive-leaning opponent-rating sources),
   each changing exactly one assumption in the SOR calculation while the
   production `calculate_sor` stays untouched. Same rules as v2.3:
   research-only, through the calibration and committee-emulation gates,
   2022/2024 holdout protection, no production or Scenario Lab default
   changes. The full 2014–2024 evaluation is pending CFBD API quota (the
   harness is now cache-first, so it needs quota exactly once); see
   [sor-refinement.md](sor-refinement.md). Résumé quality-win threshold
   variants are deferred to a separate résumé-pillar slice. Audit note:
   conference championship games are inside the week-15 selection window and
   are not treated as leakage.
5. **Revealed committee preferences**: inverse fitting — what transparent factor
   mix best approximates published CFP rankings per season/week. **In progress
   (v2.5), research-only:** `sroom fit-preferences` grid-searches composite
   weights against committee top-25 rank error, reports near-optimal regions and
   baseline drift. Never changes production defaults. Weekly backtest requires
   incremental CFP weekly fixture curation. See
   [revealed-committee-preferences.md](revealed-committee-preferences.md).
6. **Injuries / VORP / full PBP**: last; data quality, subjective assumptions,
   and maintenance burden are all high. Gated behind an explicit go/no-go:
   only if the research board shows remaining model misses are plausibly
   explained by player-availability context or play-level efficiency.
   **Deferred.**

### Current research board (after v2.1–v2.3, full 2014–2024 runs)

What the gate has actually said so far: candidates are follow-up research,
never production changes:

- **Resume/SOR-heavy assumptions look more committee-aligned.** The
  committee-aligned candidates are `no_sos`, `resume_heavy`, `sor_heavy`, and
  `committee_alignment_candidate`, which all tilt toward selection-native signals.
- **SOS may carry less standalone value than expected.** Removing it
  (`no_sos`) improves alignment, field overlap, and Brier simultaneously.
- **Removing the predictive component looks tempting historically but is
  unsafe.** `no_predictive` posts the best tuning-view Spearman yet is
  `blocked`; it collapses on the 2024 modern-format holdout.
- **PPA substitution improves broad historical metrics but is blocked by the
  modern format.** The v2.3 experiment improved every tuning-view metric
  (best field overlap in the set) and still failed the 2024 holdout, the
  clearest demonstration that the platform refuses to promote assumptions
  that help the four-team era at the expense of the current format.

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
- Results are comparable only within a track: committee alignment numbers and
  predictive numbers are never averaged together.

## 6. Go/no-go criteria

An experiment graduates from research to product only if:

- It shows a **marginal improvement in field overlap** (selection track) or
  **Brier score** (predictive track) on the holdout seasons, not just the tuning
  seasons.
- The result explicitly states whether the change makes the model
  **committee-aligned**, **intentionally different**, or **trading alignment for
  predictive signal**: one of the three, stated in the artifact.
- Realistic targets: top-12 Spearman is capped at **0.75–0.85** (the current mean
  is 0.765; chasing 0.90+ means overfitting the committee). Predictive win-side
  accuracy is a retrospective metric; do not conflate it with against-the-spread
  performance, whose edges are far smaller.

## 7. Deferred implementation checklist (do not start)

- ~~`sroom calibrate` implementation~~: shipped as v2.1 ([calibration.md](calibration.md))
- Recency decay
- Injury feed / VORP multiplier
- Play-by-play DuckDB schema
- Hosted adapters (H1–H7)

## 8. Analyst workflow questions

Every v2 capability should move toward answering, for any scenario:

- What changed? Why? Which teams?
- Was this assumption historically better?
- Is it committee-aligned or predictive, and is the divergence intentional?
- Can I export and share it as a reproducible artifact?

---

## Corrections to prior research assumptions

| Assumed gap | Repo reality |
|---|---|
| Build SOR for v1.5 | Already shipped: Poisson-binomial at 20% of the composite |
| Target 0.90 Spearman | Unrealistic; cap expectations at 0.75–0.85 (current mean 0.765) |
| 65% predictive target | Metric confusion: win-side accuracy (currently 72.2%, retrospective) is not against-the-spread accuracy; ATS edges are much smaller and must not be conflated |
| Recency decay = committee win | May conflict with CFP's stated behavior; Elo is already chronological |
| Full PBP DuckDB for EPA | Premature: CFBD `/ppa/teams` and `/ppa/games` first |

---

## Related Docs

- [Research index](index.md)
- [Limitations and Ethics](limitations-and-ethics.md)
- [Historical Validation](historical-validation.md)
- [Model Methodology](model-methodology.md)
- [Sensitivity Analysis](sensitivity-analysis.md)
