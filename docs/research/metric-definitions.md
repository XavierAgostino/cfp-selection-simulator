# Metric Definitions

Reference glossary for Selection Room ranking and uncertainty metrics. For pipeline design and default weights, see [model-methodology.md](model-methodology.md). For Selection Stability methodology, see [sensitivity-analysis.md](sensitivity-analysis.md).

---

## Resume Score

**Definition:** Normalized blend of Colley rating (60%) and win percentage (40%). Represents on-paper accomplishment against the schedule played.

**Higher means:** Stronger resume relative to other teams in the run universe.

**In the app:** Rankings table, Team Resume score breakdown, Components scatter (x-axis), Methodology page.

**Caveat:** Min-max normalized within the run; not comparable across sample (~20 teams) vs live (~130 teams) pools.

**See also:** [Model Methodology](model-methodology.md)

---

## Predictive Score

**Definition:** Normalized blend of Massey (50%) and Elo (50%). Estimates neutral-field team strength from margin-aware and sequential rating models.

**Higher means:** Stronger predicted performance against an average opponent.

**In the app:** Rankings table, Team Resume, Components scatter (y-axis).

**Caveat:** MOV-capped Massey and chronological Elo can diverge on small samples.

**See also:** [Model Methodology](model-methodology.md)

---

## Strength of Record (SOR)

**Definition:** Poisson-binomial probability that a baseline Top-25-caliber team would achieve at least this team's win-loss record against this exact schedule. Implemented in `src/utils/metrics.py`.

**Higher means:** The record is harder to achieve given who was played (stronger accomplishment relative to schedule).

**In the app:** Rankings table, Team Resume, component ranks.

**Caveat:** Depends on opponent ratings from the same composite pipeline; circular but stable within a run.

**See also:** [Model Methodology](model-methodology.md), [CFP Committee Alignment](cfp-committee-alignment.md)

---

## Strength of Schedule (SOS)

**Definition:** Opponent win percentage with opponent-opponent record (OOR) component at 33% weight.

**Higher means:** Faced stronger opponents on average.

**In the app:** Rankings table, Team Resume, Components scatter (bubble size).

**Caveat:** Early-season SOS shifts as opponents play more games; uses data through analysis week only.

**See also:** [Model Methodology](model-methodology.md)

---

## Quality Wins

**Definition:** Wins against opponents above a strength tier threshold, computed in `src/utils/metrics.py` relative to opponent composite ratings.

**Higher means:** More wins over strong opposition.

**In the app:** Team Resume selection case (`why_in` / concerns templates).

**Caveat:** Tier thresholds are model-defined, not committee-defined.

**See also:** [Model Methodology](model-methodology.md)

---

## Bad Losses

**Definition:** Losses against opponents below a strength tier threshold.

**Higher means (count):** More losses to weaker opponents — a negative resume signal.

**In the app:** Team Resume concerns / selection case text.

**Caveat:** Single-game noise; committee may weigh context (injuries, weather) not in data.

**See also:** [Limitations & Ethics](limitations-and-ethics.md)

---

## Composite Score

**Definition:** Weighted combination of min-max normalized resume, predictive, SOR, and SOS per `RankingWeights`. Default: 40% resume, 30% predictive, 20% SOR, 10% SOS.

**Higher means:** Better overall rank in the transparent model.

**In the app:** Primary sort key everywhere — Rankings, Field, Bracket, Bubble cut line.

**Caveat:** Active weights are exported per run in manifest / `latest.json`; defaults are not secret committee weights.

**See also:** [Model Methodology](model-methodology.md), [Configuration](../configuration.md)

---

## Selection Stability

**Definition:** Fraction of Monte Carlo weight-perturbation scenarios in which a team remains in the projected playoff field (`selection_frequency`, 0–1). Computed in `src/validation/sensitivity.py`, exported as `sensitivity.json`.

**Higher means:** Selection is robust to reasonable changes in resume vs predictive vs schedule weighting.

**In the app:** Bubble Selection Stability board, Team Resume stability strip (web app only; omitted when `sensitivity.json` is missing).

**Caveat:** Varies model weights only — does not simulate future game outcomes, injuries, or alternate championship results. Conference champion labels are fixed per run.

**See also:** [Sensitivity Analysis](sensitivity-analysis.md)
