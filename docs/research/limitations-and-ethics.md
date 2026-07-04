# Limitations and Ethics

## What Selection Room Is

A transparent **decision-support** tool for exploring CFP selection under published rules. It helps audit, explain, and stress-test ranking assumptions.

## What Selection Room Is Not

- Not an official CFP product
- Not a committee-vote replica
- Not a claim that the committee is "wrong"
- Not a substitute for human judgment in selection

## Known Limitations

1. **Committee subjectivity**: Real selection involves qualitative factors not fully captured in data.
2. **Injuries and availability**: Not modeled; roster changes can shift committee judgment without changing box scores.
3. **Conference champion detection is data-dependent**: When CFBD CCG results are available (regular-season weeks 14–16), Selection Room uses them. Before those results exist, it falls back to conference-record leaders, documented tiebreakers, and simulated CCG resolution where needed.
4. **Weights are configurable defaults**, not secret committee weights. Current defaults are documented in [model-methodology.md](model-methodology.md) and exported in run metadata.
5. **Min-max normalization** makes scores relative to the run universe (sample ~20 teams vs live ~130 are not directly comparable).
6. **Selection Stability** varies model weights only; it does not simulate future game outcomes, injuries, or alternate championship results. See [sensitivity-analysis.md](sensitivity-analysis.md).
7. **Historical validation is informative**, not proof of committee replication. Pre-2024 field validation uses actual 4-team participants; committee top-12 overlap is a separate metric. See [historical-validation.md](historical-validation.md).

## Research Board (v2)

Several known limitations have research tracks with priorities, guardrails, and
go/no-go criteria in [v2-tracks-research.md](v2-tracks-research.md).
Calibration/ablations, Committee Emulation lite, and a PPA predictive
substitution are implemented as research-only tools — the PPA candidate was
evaluated and **not promoted** (blocked by the 2024 modern-format holdout).
SOR/résumé refinement is next; injury modeling stays deferred behind an
explicit go/no-go. No research track changes production defaults.

## Responsible Use

Present model output alongside committee rankings and uncertainty. Avoid unsupported claims about bias or institutional favoritism without cited evidence. Use projected/simulated language, not "official projection" or "true accuracy."

## Non-Affiliation

Selection Room is an independent analytics project and is not affiliated with, endorsed by, or sponsored by the College Football Playoff.

## Related Docs

- [Research index](index.md)
- [CFP committee alignment](cfp-committee-alignment.md)
- [Historical validation](historical-validation.md)
- [Sensitivity analysis](sensitivity-analysis.md)
- [User Guide](../user-guide.md)
