# Research Methodology

Institutional documentation for how Selection Room models CFP selection. These docs explain the transparent ranking engine, validation harness, and responsible interpretation, not committee deliberations.

**Before any v2 research work:** read the active research board at
[v2-tracks-research.md](v2-tracks-research.md) first. It is the single source
of truth for track status, findings, and promotion decisions. Per-track docs
below describe how experiments work; the board records what is safe to ship.

---

## Which doc answers which question?

| Question | Start here |
|----------|------------|
| What CFP rules apply by era? | [CFP Format History](cfp-format-history.md) |
| How does the simulator relate to the committee? | [CFP Committee Alignment](cfp-committee-alignment.md) |
| What are the default weights and pipeline? | [Model Methodology](model-methodology.md) |
| What does each metric mean? | [Metric Definitions](metric-definitions.md) |
| Where does data come from? | [Data Sources](data-sources.md) |
| How close is the model to committee rankings? | [Historical Validation](historical-validation.md): committee replication track |
| Did the simulator pick the right field under era rules? | [Historical Validation](historical-validation.md): era-correct selection track |
| How stable is a bubble team under weight changes? | [Sensitivity Analysis](sensitivity-analysis.md) |
| Did a weight assumption actually help, where, and at what cost? | [Calibration & Ablation Harness](calibration.md) |
| Which transparent assumptions track committee behavior, and at what cost? | [Committee Emulation Lite](committee-emulation.md) |
| Would a different SOR calculation (exact aggregation, home field, opponent source) help? | [SOR Refinement](sor-refinement.md) |
| What are the known limits and ethics? | [Limitations & Ethics](limitations-and-ethics.md) |
| What is the v2 research board's status and what has it found? | [v2 Tracks Research](v2-tracks-research.md) |

---

## Core principles

1. **Reproducibility**: Every run writes a manifest with config hash, weights, and output paths.
2. **Format-aware rules**: 2024 champion-bye vs 2025+ straight seeding are implemented separately.
3. **Separation of resume and predictive strength**: Composite pipeline exposes both views.
4. **Explainability**: Structured audit trail for field selection.
5. **Historical validation**: Three-track backtests against published CFP data where available.
6. **Selection Stability**: Monte Carlo weight perturbation for bubble uncertainty (implemented; see [sensitivity-analysis.md](sensitivity-analysis.md)).

---

## A. Rules and committee context

| Document | Focus |
|----------|-------|
| [CFP Format History](cfp-format-history.md) | Rule changes by era |
| [CFP Committee Alignment](cfp-committee-alignment.md) | Simulator vs official committee practice |

## B. Model methodology

| Document | Focus |
|----------|-------|
| [Model Methodology](model-methodology.md) | **Canonical** composite pipeline and default weights |
| [Metric Definitions](metric-definitions.md) | **Canonical** metric glossary |
| [Data Sources](data-sources.md) | CFBD, caching, conference championships |

## C. Validation and uncertainty

| Document | Focus |
|----------|-------|
| [Historical Validation](historical-validation.md) | **Canonical** validation: committee replication, era-correct selection, predictive |
| [Sensitivity Analysis](sensitivity-analysis.md) | **Canonical** Selection Stability |
| [Calibration & Ablation Harness](calibration.md) | **Canonical** v2 research mode: weight experiments, quality gate, decisions |
| [Committee Emulation Lite](committee-emulation.md) | Committee-aligned candidate profiles derived from calibration results: alignment measurement, never mimicry |
| [SOR Refinement](sor-refinement.md) | v2.4 research-only SOR component variants: exact Poisson-binomial, home field, opponent-rating source |

## D. Responsible interpretation

| Document | Focus |
|----------|-------|
| [Limitations & Ethics](limitations-and-ethics.md) | Scope, non-affiliation, responsible use |
| [v2 Tracks Research](v2-tracks-research.md) | v2 research board: calibration, Committee Emulation, and PPA substitution implemented (PPA evaluated, not promoted); SOR variants (v2.4) implemented, evaluation pending |

---

## Case studies

Notable selection debates with simulator context:

- [2014: TCU / Baylor](case-studies/2014-tcu-baylor.md)
- [2017: Alabama / Ohio State](case-studies/2017-alabama-ohio-state.md)
- [2023: Florida State](case-studies/2023-florida-state.md)
- [2024: First 12-team field](case-studies/2024-first-12-team-field.md)

---

## Related

- [Documentation home](../index.md)
- [User Guide](../user-guide.md)
- [Output Files](../output-files.md)
- [API Contracts](../api-contracts.md)
