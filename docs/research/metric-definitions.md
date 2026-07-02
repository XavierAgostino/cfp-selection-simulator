# Metric Definitions

## Strength of Record (SOR)

Average opponent rating weighted by result. Higher values indicate wins over stronger opposition.

## Strength of Schedule (SOS)

Opponent win percentage with opponent-opponent record (OOR) component at 33% weight.

## Quality Wins / Bad Losses

Defined in `src/utils/metrics.py` relative to opponent strength tiers.

## Résumé Score

Normalized blend of Colley rating and win percentage. Represents on-paper accomplishment.

## Predictive Score

Normalized blend of Massey and Elo. Estimates neutral-field team strength.

## Composite Score

Weighted combination of normalized résumé, predictive, SOR, and SOS per `RankingWeights`.
