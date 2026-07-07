# Revealed Committee Preferences (v2.5 research mode)

**This estimates what transparent factor mix best approximates the committee's
published rankings.** It is descriptive, not normative: fitted weights are not
the committee's secret formula and never change production defaults.

```bash
sroom fit-preferences --years 2014:2024
sroom fit-preferences --years 2014:2025 --weeks all
```

Outputs land in `data/output/calibration/` as `revealed-preferences.json` (contract),
`revealed-preferences.md` (report), and `revealed-preferences.csv` (analysis rows).

---

## The core distinction

| Direction | Question |
|-----------|----------|
| **Forward calibration** | What weights produce good fields historically? |
| **Inverse / revealed preferences** | What weights best explain what the committee appeared to do this year/week? |

Forward experiments live in [calibration.md](calibration.md). This track is the
inverse complement: fit weights to published CFP rankings, then compare against
baselines.

---

## Product vision

**Today:** "The model and committee disagree."

**With this track:** "Here is the transparent factor mix that best explains the
committee's ranking this week, and here is how that differs from Selection Room's
baseline."

**Example:** Our model ranks Notre Dame above Miami. The committee's ranking is
best approximated by a more résumé/SOR-heavy blend than our baseline, which helps
Miami relative to Notre Dame.

Selection Room becomes a **committee behavior tracker**: after each CFP ranking
release, estimate what the committee appeared to value and how that shifted from
last week.

---

## Canonical language (mandatory)

**Internal / research:**

> The fitted weights are the closest transparent approximation to the committee's
> published rankings under Selection Room's four-factor model.

**Public-facing:**

> Under Selection Room's four-factor framework, the committee's rankings this week
> are best approximated by a more SOR-heavy and less predictive-heavy blend than
> our baseline.

**Never say:**

- "The committee favored SOR 5% more this year"
- "These are the committee's actual weights"

**When near-optimal region is wide:**

> Several nearby blends explain the committee almost equally well, so treat the
> deltas as directional rather than exact.

---

## Methodology

### Objective

**Primary (Phase 1):** minimize mean absolute rank error on published CFP top 25,
comparing each committee team's model rank to its absolute committee position.

**Objective modes** (`--objective`, experimental beyond `top25`):

| Mode | Committee positions scored | Question answered |
|------|---------------------------|-------------------|
| `top25` (default) | 1–25 | What explains the committee's full ranking? |
| `top12` | 1–12 | What explains the playoff field itself? |
| `bubble` | 7–18 | What explains the teams near the cut line? |

These can produce different answers, and that difference is itself a finding: the
2025 top-25 fit is driven disproportionately by teams ranked 17–25 (teams the
committee ranks on résumé but a predictive-heavy blend buries), so a top-25
headline like "less predictive" mostly describes the 17–25 range, not the field.

**Reported diagnostics (not optimization targets):**

- Spearman on top 12
- Top-12 set overlap
- Era-correct field overlap (final week only)
- Brier score (final week only)

### Search space

Two-stage search:

1. **Fast prune:** vectorized tiebreaker-free rank-error pass over a coarse 5%
   grid on the four-component simplex, plus explicit candidates:
   - Production baseline (`40/30/20/10`)
   - Equal weights (`25/25/25/25`)
   - Sweep anchors from `default_experiments()`
2. **Full re-score:** candidates within 0.75 rank error of the fast minimum
   (capped at 50, baseline always included) are re-scored with the production
   ranking function — `rankings_for_weights()` including committee tiebreakers —
   and the best fit is selected there.

The two stages are required because `resolve_rank_ties` reorders teams whose
composites are within 0.01, which shifts rank error by up to ~0.4 — more than the
gap between top candidates. Selecting on the fast pass alone optimizes a ranking
function the app does not ship.

`colley_share` stays fixed at production default (0.60).

### Near-optimal region

Return all re-scored candidates with rank error ≤ best + 0.25. Confidence is
labeled from the region's **per-component spread** (max − min, in percentage
points) as well as its count: wide spread or many members ⇒ `directional`.
An **edge-weight warning** is attached whenever any fitted component lands near
0% or at/above 50%, since edge fits are directional at best.

### Baselines for drift comparison

1. Production baseline (`RankingWeights()` defaults)
2. Historical fitted mean (excluding outlier 2022)
3. Prior week (weekly runs)
4. Equal weights (`25/25/25/25`)

---

## Current findings (as of 2026-07-07, research-only)

Canonical phrasing for the cross-season result, suitable for docs or a future
Committee Tendencies card:

> Across the cleaned 2024 and 2025 final rankings, the committee's published
> top 25 is best approximated by a more résumé-heavy and less predictive-driven
> blend than Selection Room's production baseline. Because several near-optimal
> blends fit similarly, especially in 2024, these deltas should be interpreted
> directionally rather than as exact committee weights.

Never quote the raw fitted numbers as committee weights. The 2024 fit
(90/5/5/0) is an edge fit with a 45pp résumé/SOR near-optimal spread: the
correct reading is "much more résumé-driven than the baseline, exact
résumé/SOR split not identifiable," not "the committee was 90% résumé."

The full 2014-2025 fits (regenerated on the clean cache, 2026-07-07) point the
same way. All twelve seasons fit with more combined weight on the
results-based components (résumé + SOR) than the baseline's 60%, and ten of
twelve fit predictive below its 30% baseline (2017 fits it at ~33%; 2016
shifts toward SOR rather than résumé). Fitted SOS is zero or near zero in
every season except 2018 (15%) and 2020 (20%). Every season carries the
edge-weight warning and directional confidence, so this remains a direction,
not a formula. 2020 additionally trips the short-season coverage warning
(~7.7 games per team in the COVID year) and has by far the worst fit
(rank error 5.92 against a 7.00 baseline); treat 2020 as an outlier alongside
2022's known committee outlier status.

Each season also leaves a residual the four-factor model cannot explain, and
those residuals are findings in their own right:

- **2025: Miami over Notre Dame.** No searched blend reproduces the ordering;
  the split likely depends on head-to-head/contextual factors or
  bubble-specific judgment.
- **2024: Army at committee #22.** Every strong-fitting blend ranks Army
  (11-1, weak schedule) well above the committee's position, suggesting the
  committee applies a schedule-quality skepticism to inflated records that the
  transparent components do not fully capture.

---

## Weekly backtest (Phase 2.5)

**Purpose:** Test whether fitting is useful during the live CFP ranking cycle, not
only after the final field.

**Data:** `HISTORICAL_CFP_WEEKLY_TOP25` in `src/validation/historical.py`. Week 15
(final) is populated for all seasons with final rankings; additional weeks are
added incrementally as CFP weekly releases are curated.

**Per-week diagnostics:**

- Best-fit weights and near-optimal count
- Delta vs production baseline, prior week, historical mean for that week number
- Rank error improvement vs baseline
- Confidence label (`directional` | `moderate` | `high`)
- Teams helped/hurt by fitted shift vs baseline (bubble sensitivity)

**Stability checks:**

| Check | Why it matters |
|-------|----------------|
| Week-to-week volatility | Avoid over-reading noisy early rankings |
| Final-week convergence | Final rankings should stabilize |
| Near-optimal width by week | Early weeks may have many plausible fits |
| Baseline improvement by week | Fitting must beat baseline when baseline is in grid |
| Bubble sensitivity | Cut-line teams often drive preference shifts |

**Weekly guardrail:**

> Weekly fits are noisier than final-field fits. Early committee rankings include
> fewer data points, more unresolved conference-champion paths, and more subjective
> projection. Weekly preference shifts should be treated as directional signals,
> not precise estimates.

---

## Artifact contract

Each fit entry includes:

- `research_only: true`
- `objective`, `search_step`, `committee_rank_source`
- `year`, `week`
- `fitted_weights`, `near_optimal_count`, `near_optimal_region`
- `baseline_delta_pp` (production, historical_mean, equal_weights, prior_week)
- `fit_quality` (rank_error, spearman_top12, baseline_rank_error, field_overlap, brier)
- `interpretation` (headline, confidence, warning)
- `fit_warning` (early season, outlier divergence, wide near-optimal region,
  incomplete season coverage)
- `explanation_scope` (`explains` / `does_not_explain` bullet lists derived from
  the fit: direction vs baseline, rank-error improvement, teams helped; versus
  unreproduced orderings, collapsed or edge components, unidentifiable splits,
  and the cross-year comparability caveat). Rendered in the markdown report as
  "What this fit explains / What it does not explain"

---

## Limitations

- Committee has no fixed weights; fitted weights are a transparent proxy
- Early-season and weekly fits are unstable
- 2022 is an outlier; flag wild divergence
- Better rank fit does not mean the committee is "right" or that we should adopt fitted weights
- Only four tunable composite knobs can overfit a subjective ballot
- Near-optimal regions mean deltas are directional, not exact
- Fits are only as good as the season cache. The fitter warns (and caps
  confidence at `directional`) when the cache averages fewer than ~10 games per
  team. If the cache starts after week 1 that means a truncated cache (refetch
  from week 1); if it already starts at week 1 the season itself was short
  (2020 averages ~7.7 games per team), so the fit stands but deserves extra
  caution

### Resolved data issue: 2024 cache was truncated (fixed 2026-07-07)

The original 2024 games cache started at **week 5** (about 8.3 games per team
versus 11.2 for 2025), so every team's résumé, SOR, and SOS were computed on
roughly two-thirds of a season. That inflated the 2024 rank error to ~9.1
(about 4x the 2025 error): teams whose profiles were built in September got
buried (Missouri, committee #19, ranked #86 under the baseline). It was a
**data issue, not a real alignment finding**: after refetching the full season
(`sroom fetch --year 2024 --start-week 1 --end-week 15`, now
`games_w15_s1.parquet`; the truncated file is kept beside it as
`games_w15.parquet.bak-truncated-w5`), the 2024 rank error dropped to 2.32
(baseline 4.88), in line with 2025. The incomplete-coverage warning exists so
a truncated season can never silently produce a fit again. The refetch also
refreshed the games input shared by the calibration and validation tracks;
their artifacts were regenerated on the clean cache on 2026-07-07 (validate
2014:2024, calibrate 2014:2024, fit-preferences 2014:2025).

See also [cfp-committee-alignment.md](cfp-committee-alignment.md) and
[limitations-and-ethics.md](limitations-and-ethics.md).

---

## Open questions

1. **Objective-zone comparison:** Future work should compare full-top-25 fitting
   against bubble-weighted and top-12 fitting, because committee preference
   estimates can differ depending on which ranking zone the objective emphasizes.
   The experimental `--objective top12|bubble` modes exist for this; their
   position windows (1–12 and 7–18) are provisional.
2. **Per-era weights:** Do revealed preferences shift between 4-team and 12-team eras?
3. **Weekly fixture completeness:** Full 2014–2024 weekly backfill from CFP archives
   (`HISTORICAL_CFP_WEEKLY_TOP25` currently seeds week 15 from final rankings only)
4. **Factors outside the four-factor model:** The 2025 fit improves overall top-25
   alignment but does not reproduce the committee's Miami-over-Notre-Dame ordering,
   suggesting that split depends on inputs the model doesn't carry (head-to-head or
   common-opponent context, best wins/worst losses, championship context, availability,
   recency, or committee-specific judgment) or on a bubble-specific weighting.
5. **Cross-year comparability:** The 2024 cache truncation is fixed (see
   Limitations) and both seasons now agree directionally (résumé-heavy,
   predictive-light). But the 2024 fit sits at an extreme edge (90% résumé)
   with a 45pp résumé/SOR near-optimal spread, so only the direction is
   comparable across seasons, not the magnitudes. More seasons are needed
   before any cross-year trend claim.

---

## FAQ (external review)

**Did you minimize ranking error for production weights?**
No. Production defaults came from a historical sweep optimizing field overlap and
committee alignment. This track is a separate per-season/week inverse lens.

**Learning rate?**
Not in the current repo. Fitting uses grid search on a 4-weight simplex.

**Brier in decisioning?**
Brier is protected in the calibration gate. Fitted weights report Brier as a
tradeoff diagnostic, not an optimization target.

---

## 2025 public-case diagnostic

For the final 2025 field, the diagnostic reports the **Miami / Notre Dame** split
honestly under committee, baseline, and fitted rankings:

- Committee: Miami #10, Notre Dame #11 (Notre Dame first team out)
- Model baseline: ranks Notre Dame above Miami
- Fitted blend: **also still ranks Notre Dame above Miami** — it narrows the gap
  but does not reproduce the committee's ordering

The artifact carries `reproduces_committee_order` so downstream copy can never
imply the fit explains this decision when it doesn't. The honest framing: the
fitted blend improves alignment with the committee's top 25 overall, but the
Miami/Notre Dame split appears to depend on factors outside the current
four-factor model, or on a different bubble-specific weighting. That is itself
a useful transparency finding.

---

## Test plan

- Synthetic recovery of known-optimal weights
- Simplex constraints (sum to 1, non-negative)
- Baseline-in-grid: fitted rank error ≤ baseline within tolerance
- Near-optimal region population
- 2024 integration (cached games)
- 2025 Notre Dame/Miami diagnostic
- Weekly stability checks (`tests/test_revealed_preferences_weekly.py`)
- Artifact golden file contract

---

## Related

- [Calibration & Ablation Harness](calibration.md) — forward experiments
- [Committee Emulation Lite](committee-emulation.md) — alignment candidates
- [Historical Validation](historical-validation.md) — committee replication metrics
- [v2 Tracks Research](v2-tracks-research.md) — track status
