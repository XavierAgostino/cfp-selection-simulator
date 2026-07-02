# Sensitivity Analysis

CFP selection involves judgment. The simulator tests how stable each team's selection is under reasonable weight changes.

---

## Why sensitivity matters

Small changes to résumé vs predictive vs schedule weighting can move bubble teams in or out of the field. Reporting a single deterministic bracket without uncertainty overstates model confidence.

---

## Selection Stability Index (SSI)

**Status:** Stub implementation in `src/validation/sensitivity.py` (v2.0).

**Goal:** For each team near the cut line, measure the fraction of weight perturbations that still produce a playoff selection.

Planned categories:

| Label | Interpretation |
|-------|----------------|
| Lock | Selected under all tested perturbations |
| Likely in | Selected in most perturbations |
| Bubble | Selected in ~40–60% of perturbations |
| Likely out | Rarely selected |
| Out | Not selected under any perturbation |

---

## Weight perturbation method (planned)

1. Start from default weights (0.50 / 0.30 / 0.10 / 0.10).
2. Apply random perturbations that preserve sum-to-1.0.
3. Re-run composite rankings and field selection.
4. Record selection frequency per team over N trials.

---

## Interpreting results

- High SSI for a bubble team → selection robust to model assumptions.
- Low SSI → small methodology changes flip the outcome; report with caution.

---

## Limitations

- Perturbation range must be documented; arbitrary ranges can overstate or understate stability.
- Does not model committee subjective factors.
- Conference champion labels affect auto-bids; sensitivity should include champion uncertainty in future work.

---

## Related

- [Model Methodology](model-methodology.md)
- [Historical Validation](historical-validation.md)
- [Limitations & Ethics](limitations-and-ethics.md)
