# Sensitivity Analysis

CFP selection involves judgment. The simulator tests how stable each team's selection is under reasonable weight changes.

---

## Why sensitivity matters

Small changes to résumé vs predictive vs schedule weighting can move bubble teams in or out of the field. Reporting a single deterministic bracket without uncertainty overstates model confidence.

---

## Selection Stability

**Status:** Implemented in `src/validation/sensitivity.py` (`run_weight_perturbation`), exported as `sensitivity.json` (see `docs/api-contracts.md`).

For each team near the cut line, Selection Stability measures the fraction of weight perturbations that still produce a playoff selection (`selection_frequency`, 0–1).

**Trust rule:** Selection Stability changes model weights around the current run. It does **not** simulate future game outcomes, and conference-champion labels stay fixed per run.

Status bands (exhaustive, non-overlapping):

| Band | Frequency | Interpretation |
|-------|-----------|----------------|
| `lock` | ≥ 0.99 | Selected under essentially all tested perturbations |
| `likely_in` | [0.75, 0.99) | Selected in most perturbations |
| `bubble` | [0.25, 0.75) | Genuinely contested |
| `likely_out` | (0.01, 0.25) | Rarely selected |
| `out` | ≤ 0.01 | Not selected under tested perturbations |

---

## Weight perturbation method

1. Start from the **run's actual weights** (engine defaults: resume 0.40 / predictive 0.30 / SOR 0.20 / SOS 0.10 — `src/pipeline/weights.py`).
2. Per scenario, multiply each weight by an independent uniform factor `U(1 − r, 1 + r)` with `r = relative_range = 0.10`, clamp at zero, renormalize to sum 1.0.
3. Recompute the weighted composite from the **precomputed** normalized component scores (min-max normalization is weight-independent, so components are computed once by the ranking pipeline and reused — no Colley/Massey/Elo rerun).
4. Sort by composite, rerun `select_playoff_field` (5 auto bids + 7 at-large, displacement included), and record who made the field.
5. Aggregate over `n_scenarios = 1000` trials with `random_seed = 42` (`numpy.random.default_rng`; same seed ⇒ byte-identical output).

Scope: the base field plus first four out, next four out, and any displaced team (~20 teams).

Per-scenario ranks use a stable pure-composite sort; the committee near-tie tiebreakers (±0.01 tolerance, `resolve_rank_ties`) are **not** re-applied inside scenarios. Teams separated only by a tiebreaker therefore read as genuinely unstable relative to each other — which is the signal this feature exists to surface. The deterministic base run (`base_rank`, `base_selected`, `base_field_cutoff`) still uses the fully tiebroken pipeline ranks.

`primary_risk` classifies why a team misses: `auto_bid_displacement` (ranked inside the field size but pushed out by a champion's auto bid in most missed scenarios), `weight_sensitivity` (flips with the weights), `composite_gap` (never selected in any scenario), or `none`.

---

## Interpreting results

- High selection frequency for a bubble team → selection robust to model assumptions.
- Low frequency → small methodology changes flip the outcome; report with caution.
- `median_rank` far from `base_rank` signals a profile whose components disagree (weight changes move it a lot).
- On sample datasets with wide composite gaps, most teams legitimately land at 0.0 or 1.0 — that is honest output, not a stub.

---

## Limitations

- The ±10% relative range is a documented modeling choice; wider ranges overstate instability, narrower ranges overstate confidence. The range, seed, and scenario count are all exported in `perturbation_spec` for reproducibility.
- Does not model committee subjective factors.
- Conference champion labels affect auto-bids; champion uncertainty (and game-outcome simulation generally) is explicitly out of scope for this phase.
- Dirichlet-based perturbation is deferred; uniform relative perturbation was chosen for interpretability.

---

## Related

- [Model Methodology](model-methodology.md)
- [Historical Validation](historical-validation.md)
- [Limitations & Ethics](limitations-and-ethics.md)
