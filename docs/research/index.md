# Research Methodology

This simulator is designed as a **transparent decision-support tool**, not a replacement for human committee judgment.

---

## Core principles

1. **Reproducibility** — Every run writes a manifest with config hash and output paths.
2. **Format-aware rules** — 2024 champion-bye vs 2025+ straight seeding are implemented separately.
3. **Separation of résumé and predictive strength** — Composite pipeline exposes both views.
4. **Explainability** — Structured audit trail for field selection.
5. **Historical validation** — Backtests against published CFP rankings where data exists.
6. **Sensitivity testing** — Framework for selection stability under weight perturbations.

---

## Research documents

| Document | Focus |
|----------|-------|
| [CFP Format History](cfp-format-history.md) | Rule changes by era |
| [Model Methodology](model-methodology.md) | Composite pipeline |
| [Metric Definitions](metric-definitions.md) | SOR, SOS, résumé, predictive |
| [Historical Validation](historical-validation.md) | Backtest design and results |
| [Sensitivity Analysis](sensitivity-analysis.md) | Selection Stability Index |
| [Data Sources](data-sources.md) | CFBD, caching, logos |
| [Limitations & Ethics](limitations-and-ethics.md) | Scope and responsible use |

---

## Case studies

Notable selection debates with simulator context:

- [2014: TCU / Baylor](case-studies/2014-tcu-baylor.md)
- [2017: Alabama / Ohio State](case-studies/2017-alabama-ohio-state.md)
- [2023: Florida State](case-studies/2023-florida-state.md)
- [2024: First 12-team field](case-studies/2024-first-12-team-field.md)

---

## Related

- [User Guide](../user-guide.md)
- [Output Files](../output-files.md)
