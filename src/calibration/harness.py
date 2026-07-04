"""Calibration harness: run weight experiments through the validation tracks.

Per season the component scores (resume/predictive/SOR/SOS) are computed once
by the ranking pipeline — they do not depend on the four composite weights —
then each experiment recomputes the weighted composite, re-resolves rank ties,
and re-runs the committee / era-correct selection / predictive validation
tracks. Conference metadata and champion labels are also rank-independent, so
12-team seasons are enriched once and reused across experiments.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from src.calibration.decisions import Thresholds, decide
from src.calibration.experiments import ExperimentConfig, default_experiments
from src.calibration.ppa import apply_ppa_substitution, load_season_ppa_scores
from src.data.fetcher import fetch_season_games, get_api_key
from src.pipeline.cache_paths import games_cache_candidates, games_cache_write_path
from src.pipeline.composite import calculate_composite_rankings
from src.pipeline.live import enrich_live_rankings
from src.pipeline.weights import RankingWeights
from src.selection.tiebreakers import resolve_rank_ties
from src.validation.committee_validation import validate_committee_replication
from src.validation.era import get_era_spec, has_historical_rankings
from src.validation.historical import OUTLIER_YEARS, validation_note
from src.validation.predictive_validation import evaluate_predictive
from src.validation.selection_validation import validate_selection
from src.validation.sensitivity import COMPONENT_COLUMNS, WEIGHT_KEYS, _minmax

HOLDOUT_YEARS = (2022, 2024)

# Aggregate metric keys; deltas vs baseline are reported for all of them.
DELTA_KEYS = (
    "spearman_top12",
    "top12_overlap",
    "field_overlap",
    "correct_field_size_rate",
    "brier",
    "win_accuracy",
)


@dataclass
class YearMetrics:
    """One experiment's validation metrics for one season."""

    year: int
    is_outlier: bool
    notes: str
    spearman_top12: Optional[float] = None
    top12_overlap: Optional[float] = None
    bubble_overlap: Optional[float] = None
    field_overlap: Optional[float] = None
    correct_field_size: Optional[bool] = None
    seeding_within_one: Optional[float] = None
    brier: Optional[float] = None
    win_accuracy: Optional[float] = None


@dataclass
class ExperimentResult:
    config: ExperimentConfig
    per_year: List[YearMetrics] = field(default_factory=list)
    metrics_all_seasons: Dict[str, Optional[float]] = field(default_factory=dict)
    metrics_excluding_outliers: Dict[str, Optional[float]] = field(default_factory=dict)
    baseline_delta: Dict[str, Optional[float]] = field(default_factory=dict)
    baseline_delta_all_seasons: Dict[str, Optional[float]] = field(default_factory=dict)
    holdout: Dict[str, Dict[str, object]] = field(default_factory=dict)
    decision: str = "neutral"
    reason: str = ""
    flags: List[str] = field(default_factory=list)


@dataclass
class CalibrationResult:
    years: List[int]
    evaluated_years: List[int]
    outlier_years: List[int]
    holdout_years: List[int]
    baseline_weights: RankingWeights
    thresholds: Thresholds
    experiments: List[ExperimentResult] = field(default_factory=list)


@dataclass
class _SeasonInputs:
    year: int
    games_df: pd.DataFrame
    base_rankings_df: pd.DataFrame  # enriched for 12-team seasons


def rankings_for_weights(
    base_rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
    weights: RankingWeights,
) -> pd.DataFrame:
    """Recompute the weighted composite from precomputed components and re-rank.

    Matches the ranking pipeline exactly: components are min-max normalized
    over the season's team universe, combined with the experiment weights, and
    rank ties are re-resolved with the committee tiebreakers.
    """
    weights.validate()
    df = base_rankings_df.copy()
    components = np.column_stack(
        [_minmax(df[col].to_numpy(dtype=float)) for col in COMPONENT_COLUMNS]
    )
    w = np.array([getattr(weights, key) for key in WEIGHT_KEYS], dtype=float)
    df["composite_score"] = components @ w
    return resolve_rank_ties(df, games_df)


def _year_metrics(
    year: int,
    rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
    *,
    api_key: Optional[str],
) -> YearMetrics:
    """Run the three validation tracks for one experiment-season."""
    row = YearMetrics(
        year=year,
        is_outlier=year in OUTLIER_YEARS,
        notes=validation_note(year),
    )

    committee = validate_committee_replication(year, rankings_df)
    if committee:
        row.spearman_top12 = committee.spearman_top12
        row.top12_overlap = committee.top12_overlap_ratio
        row.bubble_overlap = committee.bubble_overlap_ratio

    selection = validate_selection(
        year, rankings_df, games_df, api_key=api_key, assume_enriched=True
    )
    if selection:
        row.field_overlap = selection.field_overlap_ratio
        row.correct_field_size = selection.correct_field_size
        row.seeding_within_one = selection.seeding_within_one

    predictive = evaluate_predictive(games_df, rankings_df, method="composite", year=year)
    row.brier = predictive.brier_score
    row.win_accuracy = predictive.win_accuracy

    return row


def _mean(values: List[float]) -> Optional[float]:
    return float(np.mean(values)) if values else None


def aggregate_metrics(
    per_year: List[YearMetrics], *, exclude_outliers: bool
) -> Dict[str, Optional[float]]:
    rows = [r for r in per_year if not (exclude_outliers and r.is_outlier)]
    field_rows = [r for r in rows if r.correct_field_size is not None]
    return {
        "seasons": len(rows),
        "spearman_top12": _mean([r.spearman_top12 for r in rows if r.spearman_top12 is not None]),
        "top12_overlap": _mean([r.top12_overlap for r in rows if r.top12_overlap is not None]),
        "bubble_overlap": _mean([r.bubble_overlap for r in rows if r.bubble_overlap is not None]),
        "field_overlap": _mean([r.field_overlap for r in rows if r.field_overlap is not None]),
        "correct_field_size_rate": (
            _mean([1.0 if r.correct_field_size else 0.0 for r in field_rows])
        ),
        "seeding_within_one": _mean(
            [r.seeding_within_one for r in rows if r.seeding_within_one is not None]
        ),
        "brier": _mean([r.brier for r in rows if r.brier is not None]),
        "win_accuracy": _mean([r.win_accuracy for r in rows if r.win_accuracy is not None]),
    }


def _deltas(
    metrics: Dict[str, Optional[float]],
    baseline: Dict[str, Optional[float]],
) -> Dict[str, Optional[float]]:
    deltas: Dict[str, Optional[float]] = {}
    for key in DELTA_KEYS:
        exp_value = metrics.get(key)
        base_value = baseline.get(key)
        if exp_value is None or base_value is None:
            deltas[key] = None
        else:
            deltas[key] = float(exp_value) - float(base_value)
    return deltas


def _holdout_note(year: int, alignment_delta: Optional[float], field_delta: Optional[float]) -> str:
    context = "outlier stress test" if year in OUTLIER_YEARS else "modern 12-team format check"
    parts: List[str] = []
    for label, delta in (("alignment", alignment_delta), ("field overlap", field_delta)):
        if delta is None:
            continue
        if abs(delta) < 1e-9:
            parts.append(f"no {label} change")
        elif delta > 0:
            parts.append(f"{label} improves {delta:+.3f}")
        else:
            parts.append(f"{label} degrades {delta:+.3f}")
    detail = "; ".join(parts) if parts else "no comparable metrics"
    return f"{year} {context}: {detail}."


def _holdout_blocks(
    per_year: List[YearMetrics],
    baseline_per_year: List[YearMetrics],
) -> Dict[str, Dict[str, object]]:
    exp_by_year = {r.year: r for r in per_year}
    base_by_year = {r.year: r for r in baseline_per_year}
    blocks: Dict[str, Dict[str, object]] = {}
    for year in HOLDOUT_YEARS:
        exp = exp_by_year.get(year)
        base = base_by_year.get(year)
        if exp is None or base is None:
            continue
        alignment_delta = (
            exp.spearman_top12 - base.spearman_top12
            if exp.spearman_top12 is not None and base.spearman_top12 is not None
            else None
        )
        field_delta = (
            exp.field_overlap - base.field_overlap
            if exp.field_overlap is not None and base.field_overlap is not None
            else None
        )
        blocks[str(year)] = {
            "alignment_delta": alignment_delta,
            "field_overlap_delta": field_delta,
            "note": _holdout_note(year, alignment_delta, field_delta),
        }
    return blocks


def _load_season_games(year: int, *, api_key: Optional[str]) -> pd.DataFrame:
    """Selection-window games for a season, cache-first.

    Uses the same on-disk cache convention as the production pipeline
    (``data/cache/cfbd/{year}/games_w15*.parquet``), so repeated calibration
    runs are offline and deterministic instead of re-spending CFBD API quota
    on identical historical seasons. A miss fetches once and writes the cache.
    """
    # Calibration only evaluates completed historical seasons, so any cached
    # w15 file is a full selection window by construction (shortened seasons
    # like 2020 simply have fewer weeks) — trust it by name, don't refetch.
    for candidate in games_cache_candidates(year, 15, 1):
        if not candidate.exists():
            continue
        cached = pd.read_parquet(candidate)
        if not cached.empty:
            return cached[cached["week"] <= 15]

    games_df = fetch_season_games(year, start_week=1, api_key=api_key)
    games_df = games_df[games_df["week"] <= 15]
    if not games_df.empty:
        cache_path = games_cache_write_path(year, 15, 1)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        games_df.to_parquet(cache_path, index=False)
    return games_df


def _load_season(year: int, *, api_key: Optional[str], verbose: bool) -> Optional[_SeasonInputs]:
    if not has_historical_rankings(year):
        if verbose:
            print(f"Skipped {year}: no historical CFP data")
        return None

    games_df = _load_season_games(year, api_key=api_key)
    if games_df.empty:
        if verbose:
            print(f"Skipped {year}: no games data")
        return None

    base_rankings = calculate_composite_rankings(games_df)

    era = get_era_spec(year)
    if era.era != "four_team":
        # Conference labels and champion status are properties of the season,
        # not of any particular weighting — enrich once, reuse per experiment.
        base_rankings, _source = enrich_live_rankings(
            base_rankings, games_df, year=year, api_key=api_key
        )

    if verbose:
        print(f"Prepared {year}: {len(games_df)} games, {len(base_rankings)} teams ({era.era})")
    return _SeasonInputs(year=year, games_df=games_df, base_rankings_df=base_rankings)


def _is_ppa_substitution(config: ExperimentConfig) -> bool:
    return (
        config.substitution is not None
        and config.substitution.get("component") == "predictive"
        and config.substitution.get("candidate_source") == "cfbd_ppa"
    )


def _substituted_seasons(
    seasons: List[_SeasonInputs],
    *,
    ppa_scores: Optional[Dict[int, Dict[str, float]]],
    api_key: Optional[str],
    verbose: bool,
) -> Dict[int, "tuple[Optional[pd.DataFrame], str]"]:
    """Per season: base rankings with the predictive column swapped for PPA.

    Missing PPA data degrades explicitly — the season maps to ``(None, note)``
    and is reported as unavailable for the experiment, never silently filled.
    """
    substituted: Dict[int, "tuple[Optional[pd.DataFrame], str]"] = {}
    for season in seasons:
        if ppa_scores is not None:
            scores = ppa_scores.get(season.year)
        else:
            try:
                scores = load_season_ppa_scores(season.year, api_key=api_key)
            except Exception as exc:  # noqa: BLE001 - degrade explicitly, never fill
                substituted[season.year] = (
                    None,
                    f"PPA substitution unavailable: {exc}",
                )
                if verbose:
                    print(f"  PPA unavailable for {season.year}: {exc}")
                continue
        substituted[season.year] = apply_ppa_substitution(season.base_rankings_df, scores)
        if verbose and substituted[season.year][0] is None:
            print(f"  PPA unavailable for {season.year}: {substituted[season.year][1]}")
    return substituted


def review_substitution_availability(result: ExperimentResult) -> None:
    """Mark a substitution experiment incomplete/unavailable on missing data.

    An unavailable season carries no metrics at all (``brier`` is always set
    when a season was evaluated). All seasons unavailable → the experiment is
    ``needs_more_data``; a partial gap keeps the decision but flags it and
    names the missing seasons so aggregates are never read as full-coverage.
    """
    if result.config.substitution is None:
        return
    missing_years = [r.year for r in result.per_year if r.brier is None]
    if not missing_years:
        return
    if len(missing_years) == len(result.per_year):
        result.decision = "needs_more_data"
        result.reason = (
            "Candidate component data unavailable for every requested season — "
            "experiment not evaluated. See per-year notes for details."
        )
        result.flags = ["data_unavailable"]
        return
    result.flags.append("incomplete_seasons")
    result.reason += (
        f" Candidate component data unavailable for "
        f"{', '.join(str(y) for y in missing_years)}; aggregates and deltas cover "
        "the remaining seasons only."
    )


def run_calibration(
    years: List[int],
    *,
    experiments: Optional[List[ExperimentConfig]] = None,
    thresholds: Optional[Thresholds] = None,
    api_key: Optional[str] = None,
    verbose: bool = True,
    ppa_scores: Optional[Dict[int, Dict[str, float]]] = None,
) -> CalibrationResult:
    """Run the calibration experiment set over historical seasons.

    ``ppa_scores`` (year → team → score) injects candidate predictive scores
    for substitution experiments; when None they are loaded from the CFBD PPA
    cache (fetching over the network only if the cache is cold). PPA data is
    touched only when the experiment set actually contains a substitution
    experiment, so the default run stays PPA-free.
    """
    thresholds = thresholds or Thresholds()
    configs = experiments or default_experiments()
    baseline_configs = [c for c in configs if c.experiment_id == "baseline"]
    if not baseline_configs:
        raise ValueError("Experiment set must include a 'baseline' experiment")
    key = api_key or get_api_key()

    seasons: List[_SeasonInputs] = []
    for year in years:
        try:
            season = _load_season(year, api_key=key, verbose=verbose)
        except Exception as exc:  # noqa: BLE001 - skip season, keep the sweep going
            print(f"Error preparing {year}: {exc}")
            continue
        if season is not None:
            seasons.append(season)

    if not seasons:
        raise ValueError("No seasons could be prepared for calibration")

    substituted: Dict[int, "tuple[Optional[pd.DataFrame], str]"] = {}
    if any(_is_ppa_substitution(c) for c in configs):
        substituted = _substituted_seasons(
            seasons, ppa_scores=ppa_scores, api_key=key, verbose=verbose
        )

    results: List[ExperimentResult] = []
    for config in configs:
        per_year: List[YearMetrics] = []
        for season in seasons:
            base_df = season.base_rankings_df
            if _is_ppa_substitution(config):
                base_df, unavailable_note = substituted.get(
                    season.year, (None, "PPA substitution unavailable.")
                )
                if base_df is None:
                    per_year.append(
                        YearMetrics(
                            year=season.year,
                            is_outlier=season.year in OUTLIER_YEARS,
                            notes=unavailable_note,
                        )
                    )
                    continue
            rankings = rankings_for_weights(base_df, season.games_df, config.weights)
            per_year.append(_year_metrics(season.year, rankings, season.games_df, api_key=key))
        result = ExperimentResult(
            config=config,
            per_year=per_year,
            metrics_all_seasons=aggregate_metrics(per_year, exclude_outliers=False),
            metrics_excluding_outliers=aggregate_metrics(per_year, exclude_outliers=True),
        )
        results.append(result)
        if verbose:
            excl = result.metrics_excluding_outliers
            print(
                f"  {config.experiment_id}: spearman "
                f"{excl['spearman_top12']:.3f}, field overlap {excl['field_overlap']:.3f}, "
                f"Brier {excl['brier']:.4f}"
                if excl["spearman_top12"] is not None
                else f"  {config.experiment_id}: done"
            )

    baseline = next(r for r in results if r.config.experiment_id == "baseline")
    for result in results:
        result.baseline_delta = _deltas(
            result.metrics_excluding_outliers, baseline.metrics_excluding_outliers
        )
        result.baseline_delta_all_seasons = _deltas(
            result.metrics_all_seasons, baseline.metrics_all_seasons
        )
        result.holdout = _holdout_blocks(result.per_year, baseline.per_year)
        result.decision, result.reason, result.flags = decide(
            result.baseline_delta,
            result.baseline_delta_all_seasons,
            result.holdout,
            thresholds=thresholds,
            is_baseline=result.config.experiment_id == "baseline",
        )
        review_substitution_availability(result)

    return CalibrationResult(
        years=list(years),
        evaluated_years=[s.year for s in seasons],
        outlier_years=sorted(OUTLIER_YEARS),
        holdout_years=[y for y in HOLDOUT_YEARS if y in {s.year for s in seasons}],
        baseline_weights=baseline.config.weights,
        thresholds=thresholds,
        experiments=results,
    )
