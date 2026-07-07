"""Revealed committee preferences: inverse weight fitting (v2.5 research mode).

Fits composite weights to approximate published CFP rankings. Descriptive only —
never changes production defaults.

The search runs in two stages: a vectorized tiebreaker-free pass prunes the
simplex grid, then the surviving candidates are re-scored with the production
ranking function (``rankings_for_weights``, including committee tiebreakers) so
the selected fit optimizes the same ranking behavior the app ships.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional, Sequence, Tuple, Union

import numpy as np
import pandas as pd

from src.calibration.experiments import default_experiments
from src.calibration.harness import _minmax, rankings_for_weights
from src.data.fetcher import get_api_key
from src.pipeline.composite import calculate_composite_rankings
from src.pipeline.live import enrich_live_rankings
from src.pipeline.weights import COMPONENT_KEYS, RankingWeights
from src.validation.era import get_era_spec, has_historical_rankings
from src.validation.historical import (
    FINAL_CFP_RANKING_WEEK,
    OUTLIER_YEARS,
    historical_top25,
    historical_weeks_available,
)
from src.validation.metrics import spearman_on_list, subset_overlap
from src.validation.predictive_validation import evaluate_predictive
from src.validation.selection_validation import validate_selection
from src.validation.sensitivity import COMPONENT_COLUMNS, WEIGHT_KEYS

ObjectiveName = Literal[
    "rank_error_top25",
    "rank_error_top12",
    "rank_error_bubble",
]
ConfidenceLabel = Literal["directional", "moderate", "high"]
WeeksSpec = Union[None, int, Literal["all"]]

SEARCH_STEP = 0.05
NEAR_OPTIMAL_BAND = 0.25
NEAR_OPTIMAL_DIRECTIONAL_THRESHOLD = 8
NEAR_OPTIMAL_SPREAD_DIRECTIONAL_PP = 15
NEAR_OPTIMAL_SPREAD_MODERATE_PP = 5
EARLY_WEEK_WARNING_THRESHOLD = 10
EDGE_WEIGHT_LOW = 0.02
EDGE_WEIGHT_HIGH = 0.50
OUTLIER_DIVERGENCE_PP = 20

# Stage-2 rerank: candidates within this fast-error band of the fast minimum
# (capped) are re-scored under the full tiebreaker ranking. The fast path can
# deviate from the full path by ~0.4 rank error, so the band must be wider.
RERANK_BAND = 0.75
RERANK_LIMIT = 50

# Committee positions each objective scores against (1-indexed, inclusive).
# "bubble" brackets the 12-team cut line; experimental — see research doc.
OBJECTIVE_POSITIONS: Dict[str, Tuple[int, int]] = {
    "rank_error_top25": (1, 25),
    "rank_error_top12": (1, 12),
    "rank_error_bubble": (7, 18),
}

PRODUCTION_BASELINE = RankingWeights()
EQUAL_WEIGHTS = RankingWeights(resume=0.25, predictive=0.25, sor=0.25, sos=0.25)
PUBLIC_CASE_2025_TEAMS = ("Miami", "Notre Dame")

COMPONENT_DISPLAY = {
    "resume": "résumé",
    "predictive": "predictive",
    "sor": "SOR",
    "sos": "SOS",
}

CANONICAL_DISCLAIMER = (
    "The fitted weights are the closest transparent approximation to the "
    "committee's published rankings under Selection Room's four-factor model. "
    "They are not the committee's actual weights."
)

NEAR_OPTIMAL_WARNING = (
    "Several nearby blends explain the committee almost equally well, so treat "
    "the deltas as directional rather than exact."
)

EDGE_FIT_WARNING = (
    "Edge-weight fit: one or more components are near 0% or above 50%; "
    "interpret as directional, not exact."
)

# A full regular season through the final ranking week gives roughly 11-12
# games per FBS team; well under that means the cached season is truncated
# (e.g. the 2024 cache starts at week 5) and component scores are distorted.
MIN_GAMES_PER_TEAM = 10.0

WEEKLY_FIT_WARNING = (
    "Weekly fits are noisier than final-field fits. Early committee rankings "
    "include fewer data points, more unresolved conference-champion paths, and "
    "more subjective projection. Weekly preference shifts should be treated as "
    "directional signals, not precise estimates."
)

OUTLIER_DIVERGENCE_WARNING = (
    "Fitted weights diverge sharply from the multi-season fitted mean; treat "
    "this season as a potential outlier."
)


@dataclass(frozen=True)
class CandidateEvaluation:
    weights: RankingWeights
    rank_error: float
    spearman_top12: Optional[float]
    top12_overlap: Optional[float]


@dataclass
class FitQuality:
    rank_error: Optional[float] = None
    spearman_top12: Optional[float] = None
    baseline_rank_error: Optional[float] = None
    top12_overlap: Optional[float] = None
    field_overlap: Optional[float] = None
    brier: Optional[float] = None


@dataclass
class Interpretation:
    headline: str
    confidence: ConfidenceLabel
    warning: Optional[str] = None


@dataclass
class TeamShift:
    team: str
    baseline_rank: int
    fitted_rank: int
    rank_delta: int
    committee_rank: Optional[int] = None


@dataclass
class FitResult:
    year: int
    week: int
    fitted_weights: RankingWeights
    near_optimal_region: List[CandidateEvaluation]
    near_optimal_count: int
    fit_quality: FitQuality
    baseline_delta_pp: Dict[str, Dict[str, int]]
    interpretation: Interpretation
    fit_warning: Optional[str]
    near_optimal_spread_pp: Dict[str, int] = field(default_factory=dict)
    teams_helped: List[TeamShift] = field(default_factory=list)
    teams_hurt: List[TeamShift] = field(default_factory=list)
    focus_team_shifts: Dict[str, TeamShift] = field(default_factory=dict)
    committee_rank_source: str = "historical_fixture"
    objective: ObjectiveName = "rank_error_top25"
    search_step: float = SEARCH_STEP


@dataclass
class RevealedPreferencesResult:
    requested_years: List[int]
    evaluated_entries: List[FitResult] = field(default_factory=list)
    production_baseline: RankingWeights = field(default_factory=RankingWeights)


def _weights_key(weights: RankingWeights) -> Tuple[float, float, float, float]:
    return tuple(round(getattr(weights, key), 6) for key in COMPONENT_KEYS)


def _dedupe_candidates(candidates: List[RankingWeights]) -> List[RankingWeights]:
    seen: set[Tuple[float, float, float, float]] = set()
    unique: List[RankingWeights] = []
    for weights in candidates:
        key = _weights_key(weights)
        if key in seen:
            continue
        seen.add(key)
        unique.append(weights)
    return unique


def build_candidate_grid(*, step: float = SEARCH_STEP) -> List[RankingWeights]:
    """Simplex grid plus explicit baseline, equal weights, and sweep anchors."""
    candidates: List[RankingWeights] = [PRODUCTION_BASELINE, EQUAL_WEIGHTS]

    for experiment in default_experiments():
        if experiment.experiment_id != "baseline":
            candidates.append(experiment.weights)

    grid_step = step
    values = np.arange(0.0, 1.0 + grid_step / 2, grid_step)
    for resume in values:
        for predictive in values:
            for sor in values:
                sos = 1.0 - resume - predictive - sor
                if sos < -1e-9:
                    continue
                if sos < 0.0:
                    sos = 0.0
                if not np.isclose(resume + predictive + sor + sos, 1.0, atol=0.01):
                    continue
                try:
                    candidates.append(
                        RankingWeights(
                            resume=float(resume),
                            predictive=float(predictive),
                            sor=float(sor),
                            sos=float(sos),
                        )
                    )
                except ValueError:
                    continue

    return _dedupe_candidates(candidates)


def _committee_order(year: int, week: int) -> Optional[List[str]]:
    order = historical_top25(year, week=week)
    if not order:
        return None
    return list(order)


def _objective_positions(
    committee_order: Sequence[str], objective: ObjectiveName
) -> List[int]:
    start, end = OBJECTIVE_POSITIONS[objective]
    end = min(end, len(committee_order))
    return list(range(start, end + 1))


def _component_matrix(base_rankings_df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
    teams = base_rankings_df["team"].tolist()
    matrix = np.column_stack(
        [_minmax(base_rankings_df[col].to_numpy(dtype=float)) for col in COMPONENT_COLUMNS]
    )
    return matrix, teams


def _fast_rank_errors(
    components: np.ndarray,
    teams: List[str],
    candidates: List[RankingWeights],
    committee_order: Sequence[str],
    positions: Optional[Sequence[int]] = None,
) -> List[float]:
    """Vectorized tiebreaker-free rank-error pass, used only to prune the grid."""
    if positions is None:
        positions = range(1, len(committee_order) + 1)
    team_index = {team: idx for idx, team in enumerate(teams)}
    committee_idx: List[int] = []
    ref_ranks: List[int] = []
    for ref_rank in positions:
        team = committee_order[ref_rank - 1]
        idx = team_index.get(team)
        if idx is None:
            continue
        committee_idx.append(idx)
        ref_ranks.append(ref_rank)
    if len(committee_idx) < 2:
        return [float("inf")] * len(candidates)

    committee_idx_arr = np.array(committee_idx, dtype=int)
    ref_ranks_arr = np.array(ref_ranks, dtype=float)
    weight_matrix = np.array(
        [[getattr(weights, key) for key in COMPONENT_KEYS] for weights in candidates],
        dtype=float,
    )
    # scores: (n_teams, n_candidates)
    scores = components @ weight_matrix.T
    # Ranks via double argsort (1 = best)
    order = np.argsort(-scores, axis=0)
    ranks = np.empty_like(order)
    for col in range(order.shape[1]):
        ranks[order[:, col], col] = np.arange(1, order.shape[0] + 1)

    sim_ranks = ranks[committee_idx_arr, :]
    errors = np.mean(np.abs(sim_ranks - ref_ranks_arr[:, None]), axis=0)
    return [float(value) for value in errors]


def _slice_rank_error(
    rankings_df: pd.DataFrame,
    committee_order: Sequence[str],
    positions: Sequence[int],
) -> Optional[float]:
    """Mean absolute rank error against absolute committee positions."""
    team_ranks = dict(zip(rankings_df["team"], rankings_df["rank"]))
    errors: List[int] = []
    for pos in positions:
        team = committee_order[pos - 1]
        rank = team_ranks.get(team)
        if rank is None:
            continue
        errors.append(abs(int(rank) - pos))
    return float(np.mean(errors)) if errors else None


def _delta_pp(
    fitted: RankingWeights, reference: RankingWeights
) -> Dict[str, int]:
    return {
        key: int(round((getattr(fitted, key) - getattr(reference, key)) * 100))
        for key in COMPONENT_KEYS
    }


def _headline(delta_pp: Dict[str, int]) -> str:
    shifts = sorted(
        ((key, delta_pp[key]) for key in COMPONENT_KEYS),
        key=lambda item: abs(item[1]),
        reverse=True,
    )
    parts: List[str] = []
    for key, delta in shifts[:2]:
        if delta == 0:
            continue
        label = COMPONENT_DISPLAY[key]
        if delta > 0:
            parts.append(f"more {label}-heavy")
        else:
            parts.append(f"less {label}-driven")
    if not parts:
        return "Close to production baseline"
    sentence = " and ".join(parts) + " than the production baseline"
    return sentence[0].upper() + sentence[1:]


def _near_optimal_spread_pp(
    near_optimal: Sequence[CandidateEvaluation],
) -> Dict[str, int]:
    """Per-component max-min across the near-optimal region, in percentage points."""
    if not near_optimal:
        return {key: 0 for key in COMPONENT_KEYS}
    spread: Dict[str, int] = {}
    for key in COMPONENT_KEYS:
        values = [getattr(ev.weights, key) for ev in near_optimal]
        spread[key] = int(round((max(values) - min(values)) * 100))
    return spread


def _confidence_label(
    near_optimal_count: int,
    spread_pp: Dict[str, int],
    week: int,
) -> ConfidenceLabel:
    max_spread = max(spread_pp.values()) if spread_pp else 0
    if (
        week < EARLY_WEEK_WARNING_THRESHOLD
        or max_spread >= NEAR_OPTIMAL_SPREAD_DIRECTIONAL_PP
        or near_optimal_count >= NEAR_OPTIMAL_DIRECTIONAL_THRESHOLD
    ):
        return "directional"
    if max_spread >= NEAR_OPTIMAL_SPREAD_MODERATE_PP or near_optimal_count >= 4:
        return "moderate"
    return "high"


def _is_edge_fit(weights: RankingWeights) -> bool:
    return any(
        getattr(weights, key) <= EDGE_WEIGHT_LOW
        or getattr(weights, key) >= EDGE_WEIGHT_HIGH
        for key in COMPONENT_KEYS
    )


def _has_full_games(games_df: pd.DataFrame) -> bool:
    return {"home_score", "away_score", "week"}.issubset(games_df.columns)


def _games_coverage_warning(
    games_df: pd.DataFrame, team_count: int
) -> Optional[str]:
    """Warn when the cached season is truncated (too few games per team)."""
    if not _has_full_games(games_df) or not team_count or games_df.empty:
        return None
    per_team = 2 * len(games_df) / team_count
    if per_team >= MIN_GAMES_PER_TEAM:
        return None
    first_week = int(games_df["week"].min())
    if first_week > 1:
        return (
            f"Incomplete season coverage: about {per_team:.1f} games per team in the "
            f"cache (earliest week {first_week}). Component scores are computed on a "
            "truncated season, so this fit is unreliable until the games cache is "
            "refetched from week 1."
        )
    return (
        f"Short season: about {per_team:.1f} games per team even from week 1 "
        "(for example the 2020 COVID season). Component scores rest on fewer "
        "games than a normal season, so interpret this fit with extra caution."
    )


def _resolve_rankings(
    base_rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
    weights: RankingWeights,
) -> pd.DataFrame:
    """Re-rank with tiebreakers when full games exist; otherwise score-only."""
    if _has_full_games(games_df):
        return rankings_for_weights(base_rankings_df, games_df, weights)

    weights.validate()
    df = base_rankings_df.copy()
    components = np.column_stack(
        [_minmax(df[col].to_numpy(dtype=float)) for col in COMPONENT_COLUMNS]
    )
    weight_vector = np.array(
        [getattr(weights, key) for key in WEIGHT_KEYS],
        dtype=float,
    )
    df["composite_score"] = components @ weight_vector
    df = df.sort_values("composite_score", ascending=False).reset_index(drop=True)
    df["rank"] = range(1, len(df) + 1)
    return df


def _rank_map(rankings_df: pd.DataFrame) -> Dict[str, int]:
    return {
        str(row["team"]): int(row["rank"]) for _, row in rankings_df.iterrows()
    }


def _focus_team_shifts(
    baseline_rankings: pd.DataFrame,
    fitted_rankings: pd.DataFrame,
    teams: Sequence[str],
    committee_order: Sequence[str],
) -> Dict[str, TeamShift]:
    baseline_map = _rank_map(baseline_rankings)
    fitted_map = _rank_map(fitted_rankings)
    committee_ranks = {team: i for i, team in enumerate(committee_order, start=1)}
    shifts: Dict[str, TeamShift] = {}
    for team in teams:
        baseline_rank = baseline_map.get(team)
        fitted_rank = fitted_map.get(team)
        if baseline_rank is None or fitted_rank is None:
            continue
        shifts[team] = TeamShift(
            team=team,
            baseline_rank=baseline_rank,
            fitted_rank=fitted_rank,
            rank_delta=baseline_rank - fitted_rank,
            committee_rank=committee_ranks.get(team),
        )
    return shifts


def _team_shifts(
    baseline_rankings: pd.DataFrame,
    fitted_rankings: pd.DataFrame,
    committee_order: Sequence[str],
    *,
    limit: int = 5,
    relevance_rank: int = 25,
) -> Tuple[List[TeamShift], List[TeamShift]]:
    """Largest baseline→fitted moves among committee-relevant teams.

    Restricted to teams in the committee ranking or ranked inside
    ``relevance_rank`` under either blend, so deep-field noise (teams moving
    30 spots in the 80s) doesn't crowd out the cut-line story.
    """
    baseline_map = _rank_map(baseline_rankings)
    fitted_map = _rank_map(fitted_rankings)
    committee_ranks = {team: i for i, team in enumerate(committee_order, start=1)}
    shifts: List[TeamShift] = []
    for team in set(baseline_map) & set(fitted_map):
        baseline_rank = baseline_map[team]
        fitted_rank = fitted_map[team]
        if baseline_rank == fitted_rank:
            continue
        if (
            team not in committee_ranks
            and min(baseline_rank, fitted_rank) > relevance_rank
        ):
            continue
        shifts.append(
            TeamShift(
                team=team,
                baseline_rank=baseline_rank,
                fitted_rank=fitted_rank,
                rank_delta=baseline_rank - fitted_rank,
                committee_rank=committee_ranks.get(team),
            )
        )
    helped = sorted(
        [s for s in shifts if s.rank_delta > 0],
        key=lambda s: s.rank_delta,
        reverse=True,
    )[:limit]
    hurt = sorted(
        [s for s in shifts if s.rank_delta < 0],
        key=lambda s: s.rank_delta,
    )[:limit]
    return helped, hurt


def fit_weights_for_season(
    year: int,
    base_rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
    *,
    week: Optional[int] = None,
    objective: ObjectiveName = "rank_error_top25",
    candidates: Optional[List[RankingWeights]] = None,
    historical_mean_weights: Optional[RankingWeights] = None,
    prior_week_weights: Optional[RankingWeights] = None,
    committee_order: Optional[Sequence[str]] = None,
) -> Optional[FitResult]:
    """Fit weights to approximate committee rankings for one season/week."""
    resolved_week = week if week is not None else FINAL_CFP_RANKING_WEEK
    resolved_committee = (
        list(committee_order)
        if committee_order is not None
        else _committee_order(year, resolved_week)
    )
    if not resolved_committee:
        return None
    positions = _objective_positions(resolved_committee, objective)

    grid = candidates or build_candidate_grid()
    components, teams = _component_matrix(base_rankings_df)
    fast_errors = _fast_rank_errors(
        components, teams, grid, resolved_committee, positions
    )

    model_teams = set(teams)
    missing_teams = [
        resolved_committee[pos - 1]
        for pos in positions
        if resolved_committee[pos - 1] not in model_teams
    ]

    baseline_rankings = _resolve_rankings(
        base_rankings_df, games_df, PRODUCTION_BASELINE
    )
    baseline_rank_error = _slice_rank_error(
        baseline_rankings, resolved_committee, positions
    )

    if _has_full_games(games_df):
        # Stage 2: re-score the fast-path survivors under the production
        # ranking function (composite + committee tiebreakers) and select
        # the best fit there — the fast pass only prunes.
        fast_min = min(fast_errors)
        rerank_pool = sorted(
            zip(grid, fast_errors), key=lambda item: item[1]
        )
        rerank_pool = [
            (weights, error)
            for weights, error in rerank_pool
            if error <= fast_min + RERANK_BAND
        ][:RERANK_LIMIT]
        rerank_keys = {_weights_key(weights) for weights, _ in rerank_pool}
        if _weights_key(PRODUCTION_BASELINE) not in rerank_keys:
            rerank_pool.append((PRODUCTION_BASELINE, float("inf")))

        evaluations: List[CandidateEvaluation] = []
        for weights, _fast in rerank_pool:
            if _weights_key(weights) == _weights_key(PRODUCTION_BASELINE):
                rankings = baseline_rankings
            else:
                rankings = rankings_for_weights(base_rankings_df, games_df, weights)
            rank_error = _slice_rank_error(rankings, resolved_committee, positions)
            evaluations.append(
                CandidateEvaluation(
                    weights=weights,
                    rank_error=(
                        float(rank_error) if rank_error is not None else float("inf")
                    ),
                    spearman_top12=None,
                    top12_overlap=None,
                )
            )
    else:
        evaluations = [
            CandidateEvaluation(
                weights=weights,
                rank_error=rank_error,
                spearman_top12=None,
                top12_overlap=None,
            )
            for weights, rank_error in zip(grid, fast_errors)
        ]

    if not evaluations:
        return None

    best = min(evaluations, key=lambda ev: ev.rank_error)
    near_optimal = sorted(
        [
            ev
            for ev in evaluations
            if ev.rank_error <= best.rank_error + NEAR_OPTIMAL_BAND
        ],
        key=lambda ev: ev.rank_error,
    )

    baseline_eval = next(
        (
            ev
            for ev in evaluations
            if _weights_key(ev.weights) == _weights_key(PRODUCTION_BASELINE)
        ),
        None,
    )
    if baseline_eval is not None and np.isfinite(baseline_eval.rank_error):
        baseline_rank_error = baseline_eval.rank_error

    fitted_rankings = _resolve_rankings(base_rankings_df, games_df, best.weights)
    spearman12, _p = spearman_on_list(fitted_rankings, resolved_committee[:12])
    overlap = subset_overlap(
        fitted_rankings, resolved_committee, start_rank=1, end_rank=12
    )

    selection = None
    predictive = None
    if _has_full_games(games_df) and resolved_week == FINAL_CFP_RANKING_WEEK:
        selection = validate_selection(
            year, fitted_rankings, games_df, api_key=None, assume_enriched=True
        )
        predictive = evaluate_predictive(
            games_df, fitted_rankings, method="composite", year=year
        )

    helped, hurt = _team_shifts(
        baseline_rankings, fitted_rankings, resolved_committee
    )

    focus_shifts: Dict[str, TeamShift] = {}
    if year == 2025:
        focus_shifts = _focus_team_shifts(
            baseline_rankings,
            fitted_rankings,
            PUBLIC_CASE_2025_TEAMS,
            resolved_committee,
        )

    production_delta = _delta_pp(best.weights, PRODUCTION_BASELINE)
    baseline_deltas: Dict[str, Dict[str, int]] = {
        "production": production_delta,
        "equal_weights": _delta_pp(best.weights, EQUAL_WEIGHTS),
    }
    if historical_mean_weights is not None:
        baseline_deltas["historical_mean"] = _delta_pp(
            best.weights, historical_mean_weights
        )
    if prior_week_weights is not None:
        baseline_deltas["prior_week"] = _delta_pp(best.weights, prior_week_weights)

    near_count = len(near_optimal)
    spread_pp = _near_optimal_spread_pp(near_optimal)
    confidence = _confidence_label(near_count, spread_pp, resolved_week)
    warnings: List[str] = []
    coverage_warning = _games_coverage_warning(games_df, len(teams))
    if coverage_warning:
        warnings.append(coverage_warning)
        confidence = "directional"
    if _is_edge_fit(best.weights):
        warnings.append(EDGE_FIT_WARNING)
    if (
        near_count >= NEAR_OPTIMAL_DIRECTIONAL_THRESHOLD
        or max(spread_pp.values(), default=0) >= NEAR_OPTIMAL_SPREAD_DIRECTIONAL_PP
    ):
        warnings.append(NEAR_OPTIMAL_WARNING)
    if resolved_week < FINAL_CFP_RANKING_WEEK:
        warnings.append(WEEKLY_FIT_WARNING)
    if missing_teams:
        warnings.append(
            "Committee teams missing from the model universe (excluded from "
            f"the objective): {', '.join(missing_teams)}"
        )

    fit_warning = "; ".join(warnings) if warnings else None

    return FitResult(
        year=year,
        week=resolved_week,
        fitted_weights=best.weights,
        near_optimal_region=near_optimal,
        near_optimal_count=near_count,
        near_optimal_spread_pp=spread_pp,
        fit_quality=FitQuality(
            rank_error=best.rank_error,
            spearman_top12=spearman12,
            baseline_rank_error=baseline_rank_error,
            top12_overlap=float(overlap["overlap_ratio"]) if overlap else None,
            field_overlap=selection.field_overlap_ratio if selection else None,
            brier=predictive.brier_score if predictive else None,
        ),
        baseline_delta_pp=baseline_deltas,
        interpretation=Interpretation(
            headline=_headline(production_delta),
            confidence=confidence,
            warning=warnings[0] if warnings else None,
        ),
        fit_warning=fit_warning,
        teams_helped=helped,
        teams_hurt=hurt,
        focus_team_shifts=focus_shifts,
        objective=objective,
    )


def _load_season_games(year: int, week: int, *, api_key: Optional[str]) -> pd.DataFrame:
    from src.calibration.harness import _load_season_games

    games_df = _load_season_games(year, api_key=api_key)
    return games_df[games_df["week"] <= week]


def _prepare_season(
    year: int,
    week: int,
    *,
    api_key: Optional[str],
) -> Optional[Tuple[pd.DataFrame, pd.DataFrame]]:
    if not has_historical_rankings(year):
        return None
    if week not in historical_weeks_available(year):
        return None

    games_df = _load_season_games(year, week, api_key=api_key)
    if games_df.empty:
        return None

    base_rankings = calculate_composite_rankings(games_df)
    era = get_era_spec(year)
    if era.era != "four_team":
        base_rankings, _source = enrich_live_rankings(
            base_rankings, games_df, year=year, api_key=api_key
        )
    return games_df, base_rankings


def _historical_mean_weights(entries: List[FitResult]) -> Optional[RankingWeights]:
    if not entries:
        return None
    non_outlier = [e for e in entries if e.year not in OUTLIER_YEARS]
    pool = non_outlier or entries
    means = {
        key: float(np.mean([getattr(e.fitted_weights, key) for e in pool]))
        for key in COMPONENT_KEYS
    }
    total = sum(means.values())
    if total <= 0:
        return None
    normalized = {key: means[key] / total for key in COMPONENT_KEYS}
    return RankingWeights(**normalized)


def _resolve_weeks(year: int, weeks: WeeksSpec) -> List[int]:
    available = historical_weeks_available(year)
    if weeks is None:
        return [FINAL_CFP_RANKING_WEEK] if FINAL_CFP_RANKING_WEEK in available else available[-1:]
    if weeks == "all":
        return available
    if isinstance(weeks, int):
        return [weeks] if weeks in available else []
    return []


def _append_warning(fit: FitResult, warning: str) -> None:
    fit.fit_warning = f"{fit.fit_warning}; {warning}" if fit.fit_warning else warning
    if fit.interpretation.warning is None:
        fit.interpretation.warning = warning


def _attach_historical_mean(result: RevealedPreferencesResult) -> None:
    """Add historical-mean deltas when at least two seasons produced fits.

    A single-season run would compare the fit against itself (delta 0 across
    the board), which reads as signal when it is tautology — omit it instead.
    """
    latest_by_year: Dict[int, FitResult] = {}
    for fit in result.evaluated_entries:
        current = latest_by_year.get(fit.year)
        if current is None or fit.week > current.week:
            latest_by_year[fit.year] = fit
    final_fits = list(latest_by_year.values())
    if len(final_fits) < 2:
        return
    historical_mean = _historical_mean_weights(final_fits)
    if historical_mean is None:
        return
    for fit in result.evaluated_entries:
        delta = _delta_pp(fit.fitted_weights, historical_mean)
        fit.baseline_delta_pp["historical_mean"] = delta
        if max(abs(value) for value in delta.values()) >= OUTLIER_DIVERGENCE_PP:
            _append_warning(fit, OUTLIER_DIVERGENCE_WARNING)


def run_revealed_preferences(
    years: List[int],
    *,
    weeks: WeeksSpec = None,
    objective: ObjectiveName = "rank_error_top25",
    api_key: Optional[str] = None,
    verbose: bool = True,
) -> RevealedPreferencesResult:
    """Run inverse fitting across seasons and optional weeks."""
    key = api_key or get_api_key()
    result = RevealedPreferencesResult(requested_years=list(years))

    pairs: List[Tuple[int, int]] = []
    for year in years:
        for week in _resolve_weeks(year, weeks):
            pairs.append((year, week))
    if not pairs:
        raise ValueError("No season/week pairs to fit")

    prior_by_year: Dict[int, FitResult] = {}
    for year, week in sorted(pairs, key=lambda item: (item[0], item[1])):
        prepared = _prepare_season(year, week, api_key=key)
        if prepared is None:
            if verbose:
                print(f"Skipped {year} week {week}: no data")
            continue
        games_df, base_rankings = prepared
        prior_fit = prior_by_year.get(year)
        fit = fit_weights_for_season(
            year,
            base_rankings,
            games_df,
            week=week,
            objective=objective,
            prior_week_weights=prior_fit.fitted_weights if prior_fit else None,
        )
        if fit is None:
            if verbose:
                print(f"Skipped {year} week {week}: no committee rankings")
            continue
        result.evaluated_entries.append(fit)
        prior_by_year[year] = fit
        if verbose:
            baseline_err = fit.fit_quality.baseline_rank_error
            baseline_str = f"{baseline_err:.2f}" if baseline_err is not None else "n/a"
            rank_err = fit.fit_quality.rank_error
            rank_str = f"{rank_err:.2f}" if rank_err is not None else "n/a"
            print(
                f"  {year} w{week}: rank_error {rank_str} "
                f"(baseline {baseline_str}), "
                f"near_optimal {fit.near_optimal_count}, "
                f"{fit.interpretation.headline}"
            )

    if not result.evaluated_entries:
        raise ValueError("No season/week entries could be fitted")

    _attach_historical_mean(result)

    return result


def miami_notre_dame_attribution(fit: FitResult) -> Optional[Dict[str, object]]:
    """2025 public-case: Miami vs Notre Dame under committee, baseline, and fit.

    Honest by construction: states whether the fitted blend actually reproduces
    the committee's Miami-over-Notre-Dame ordering instead of assuming it does.
    """
    if fit.year != 2025:
        return None

    focus = fit.focus_team_shifts
    miami = focus.get("Miami")
    notre_dame = focus.get("Notre Dame")
    if miami is None or notre_dame is None:
        shifts = fit.teams_helped + fit.teams_hurt
        if miami is None:
            miami = next((t for t in shifts if t.team == "Miami"), None)
        if notre_dame is None:
            notre_dame = next((t for t in shifts if t.team == "Notre Dame"), None)
    if miami is None or notre_dame is None:
        return None

    reproduces = miami.fitted_rank < notre_dame.fitted_rank
    relative_gain = (
        (notre_dame.fitted_rank - notre_dame.baseline_rank)
        - (miami.fitted_rank - miami.baseline_rank)
    )
    if reproduces:
        explanation = (
            "The fitted blend ranks Miami above Notre Dame, matching the "
            "committee's ordering. The production delta shows which pillars "
            "the approximation weights more heavily than baseline."
        )
    else:
        explanation = (
            "The fitted blend improves alignment with the committee's top 25 "
            "overall but still ranks Notre Dame above Miami, so it does not "
            "fully reproduce the committee's Miami-over-Notre-Dame ordering. "
            "That suggests this split may depend on factors outside the "
            "four-factor model (for example head-to-head context, best wins, "
            "or committee-specific judgment) or on a bubble-specific weighting."
        )
        if relative_gain > 0:
            explanation += (
                f" The fit does narrow the gap: Miami gains {relative_gain} "
                "positions on Notre Dame relative to the baseline."
            )

    def _entry(shift: TeamShift) -> Dict[str, Optional[int]]:
        return {
            "committee_rank": shift.committee_rank,
            "baseline_rank": shift.baseline_rank,
            "fitted_rank": shift.fitted_rank,
            "rank_delta": shift.rank_delta,
        }

    return {
        "committee_order": "Miami #10, Notre Dame #11 (Notre Dame first team out)",
        "reproduces_committee_order": reproduces,
        "fitted_shift": {
            "Miami": _entry(miami),
            "Notre Dame": _entry(notre_dame),
        },
        "baseline_delta_pp": fit.baseline_delta_pp.get("production", {}),
        "headline": fit.interpretation.headline,
        "explanation": explanation,
    }
