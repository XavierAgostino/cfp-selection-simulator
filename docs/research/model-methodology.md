# Model Methodology

## Overview

The CFP Selection Simulator uses a **single composite pipeline** with exposed component views (résumé, predictive, schedule). It does not claim to replicate committee deliberations exactly.

## Composite Formula

Default weights (`RankingWeights`):

| Component | Weight | Source |
|-----------|--------|--------|
| Résumé | 50% | Colley (60%) + Win% (40%), normalized |
| Predictive | 30% | Massey (50%) + Elo (50%), normalized |
| SOR | 10% | Strength of Record |
| SOS | 10% | Strength of Schedule with OOR |

## Algorithms

- **Colley Matrix**: Linear system based on wins/losses and schedule connectivity
- **Massey Ratings**: Margin-of-victory adjusted, Colleyized
- **Elo**: K=85, HFA=3.75, MOV cap=28

## Future Modes (v2.1+)

The config API reserves `mode` for future Committee Emulation, Merit, and Best-Team engines. v2.0 runs composite only.

## References

See [metric-definitions.md](metric-definitions.md), [cfp-format-history.md](cfp-format-history.md), and [cfp-committee-alignment.md](cfp-committee-alignment.md).
