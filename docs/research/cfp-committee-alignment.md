# CFP Committee Alignment

Selection Room is an independent analytics project and is not affiliated with, endorsed by, or sponsored by the College Football Playoff.

How this simulator relates to official [College Football Playoff](https://collegefootballplayoff.com/) selection practice and published research.

## What the committee actually does

Per CFP protocol and 2025 offseason updates ([CFP news, Aug 2025](https://collegefootballplayoff.com/news/2025/8/20/selection-committee-prepares-for-2025-26.aspx)):

- Ranks the **top 25** subjectively via secret ballot
- Considers **entire body of work**: record, SOS, head-to-head, common opponents, championships, injuries
- **No fixed weights** on any factor; members may disagree on emphasis
- Uses **SportSource Analytics** team sheets as supplementary data, not as a single formula
- From 2025 onward: enhanced **schedule strength** and new **record strength** metrics that reward wins vs strong teams and penalize bad losses more than weak wins

The committee explicitly says it picks the **best** teams, not necessarily the most "deserving" by record alone ([AP, 2024](https://apnews.com/article/college-playoff-bracket-2ab0e19163bf6f4ac874d179f0df50ed)).

## What this simulator does

| Layer | Simulator | Committee |
|-------|-----------|-----------|
| **Ranking** | Configurable composite combining resume, predictive, SOR, and SOS; active weights stored in each run manifest (defaults in [model-methodology.md](model-methodology.md)) | Subjective multi-factor ballot |
| **Algorithms** | Colley, Massey, Elo, Poisson-binomial SOR, SOS+OOR | Proprietary SportSource metrics + eye test |
| **Selection rules** | Published 5 auto + 7 at-large protocol | Same published bracket rules (2024+) |
| **Conference champs** | Data-dependent: CFBD CCG results when available; else conference-record tiebreakers and simulated CCG | Actual conference championship results |
| **Data** | CFBD FBS regular season through analysis week (weeks ≥ start_week, default 1) | Full season + CCG + contextual factors |

**We model the rules and a transparent ranking engine. We do not replicate committee votes.**

## Research backing for our components

| Component | Literature / practice | Our implementation |
|-----------|----------------------|-------------------|
| **Colley Matrix** | Colley (2002); used in BCS era | Win/loss linear system, no MOV |
| **Massey ratings** | Massey (1997); MOV with cap | Colleyized Massey, HFA 3.75, MOV cap 28 |
| **Elo** | Standard predictive rating | K=85, chronological by week |
| **SOR** | Similar spirit to CFP "record strength" | Poisson-binomial P(baseline team matches record) |
| **SOS** | Committee emphasizes schedule | Opponent win% + 33% OOR |
| **Ensemble** | Reduces single-model bias | MinMax normalize then weighted sum |

See [metric-definitions.md](metric-definitions.md) and [model-methodology.md](model-methodology.md).

## Known gaps (document honestly)

1. **No injury / availability adjustments**
2. **Conference championship handling is data-dependent.** When CFBD CCG results are available (regular-season weeks 14–16), Selection Room uses them for auto-bid labels. Before those results exist, it falls back to conference-record leaders, documented tiebreakers, and simulated CCG resolution where needed. Bowls and playoff games are not modeled in ranking inputs.
3. **MinMax normalization** makes scores relative to the team pool (sample 20 vs live ~130 are not comparable)
4. **Weights are configurable defaults**, not secret committee weights. Historical validation is informative, not proof of committee replication (see [historical-validation.md](historical-validation.md))

## Tiebreakers and champions (implemented)

National ranking ties (composite scores within 0.01) resolve via committee order: head-to-head, common opponents, SOS, SOR, composite (`src/selection/tiebreakers.py`).

Conference champion ties use the notebook waterfall protocol: pool H2H when balanced, conference SOS when unbalanced, sweeper detection, then optional CCG simulation via predictive scores (`src/selection/conference_champions.py`).

Independents (including Notre Dame) never receive conference-champion auto-bid labels.

## Selection Stability

**Selection Stability** measures how often a team remains in the projected field across Monte Carlo perturbations of model weights. It does not simulate future game outcomes, injuries, or alternate championship results. Details: [Sensitivity Analysis](sensitivity-analysis.md).

## Validation

Validation is split into three tracks: committee replication, era-correct selection, and predictive validation. Full methodology, metrics, and interpretation: [Historical Validation](historical-validation.md).

```bash
sroom validate --years 2014:2024
```

## Responsible interpretation

- Use **sample mode** for demos and rule audits (controlled 20-team universe)
- Use **live mode** for schedule-realistic stress tests (~130 FBS teams)
- Compare simulator output to committee rankings as **one transparent model**, not ground truth
- When auto bids look wrong mid-season, check whether CFBD conference leaders differ from composite rank inference (the web app shows champion source when available)

## References

- [CFP format history](cfp-format-history.md)
- [Historical validation](historical-validation.md)
- [Limitations & ethics](limitations-and-ethics.md)
- [CFP Selection Committee Prepares for 2025-26](https://collegefootballplayoff.com/news/2025/8/20/selection-committee-prepares-for-2025-26.aspx)
- [ESPN: Enhanced CFP metrics 2025](https://www.espn.com/college-football/story/_/id/46027603/cfp-selection-committee-use-enhanced-metrics)
- Colley, W. (2002). *Colley's Bias Free College Football Ranking Method*
- Massey, K. (1997). *Statistical models applied to rating sports teams*
