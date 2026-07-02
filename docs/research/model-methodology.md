# Model Methodology

## Overview

The Selection Room uses a **single composite pipeline** with exposed component views (résumé, predictive, schedule). It does not claim to replicate committee deliberations exactly.

## Composite Formula

Default weights (`RankingWeights`):

| Component | Weight | Source |
|-----------|--------|--------|
| Résumé | 40% | Colley (60%) + Win% (40%), normalized |
| Predictive | 30% | Massey (50%) + Elo (50%), normalized |
| SOR | 20% | Strength of Record |
| SOS | 10% | Strength of Schedule with OOR |

Weights were selected by the 2014-2024 historical backtest (`make validate`):
the SOR-heavy 40/30/20/10 mix matched or beat the previous 50/30/10/10
defaults on committee-field overlap in every season.

## Algorithms

- **Colley Matrix**: Linear system based on wins/losses and schedule connectivity
- **Massey Ratings**: Margin-of-victory adjusted, Colleyized
- **Elo**: K=85, HFA=3.75, MOV cap=28

## Future Modes (v2.1+)

The config API reserves `mode` for future Committee Emulation, Merit, and Best-Team engines. v2.0 runs composite only.

## References

See [metric-definitions.md](metric-definitions.md), [cfp-format-history.md](cfp-format-history.md), and [cfp-committee-alignment.md](cfp-committee-alignment.md).
