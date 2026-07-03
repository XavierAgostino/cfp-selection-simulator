"""
Selection Stability: Monte Carlo weight-perturbation analysis.

For each scenario, the four composite weights are independently perturbed by a
uniform relative factor (±``relative_range``), clamped at zero, and
renormalized to sum to 1.0. Component scores (resume/predictive/SOR/SOS) are
computed once by the ranking pipeline and reused — only the weighted composite
is recomputed per scenario — then the 5+7 field selection reruns and each
team's selection frequency is aggregated.

Fixed assumptions (documented in docs/research/sensitivity-analysis.md):
conference-champion labels are fixed for the run; alternate game outcomes and
championship changes are NOT simulated. Selection Stability varies model
weights only.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from src.config.formats import PlayoffFormat
from src.pipeline.composite import RankingWeights, calculate_composite_rankings
from src.selection.field import select_playoff_field

# Defaults exported into sensitivity.json for reproducibility.
DEFAULT_N_SCENARIOS = 1000
DEFAULT_RANDOM_SEED = 42
DEFAULT_RELATIVE_RANGE = 0.10
PERTURBATION_METHOD = "uniform_relative_weight_perturbation"

# Perturbation order is fixed so a given seed always draws the same factors.
WEIGHT_KEYS = ("resume", "predictive", "sor", "sos")
COMPONENT_COLUMNS = ("resume_score", "predictive_score", "sor", "sos")


def stability_status(frequency: float) -> str:
    """Map a 0–1 selection frequency to a status band (exhaustive, non-overlapping)."""
    if frequency >= 0.99:
        return "lock"
    if frequency >= 0.75:
        return "likely_in"
    if frequency >= 0.25:
        return "bubble"
    if frequency > 0.01:
        return "likely_out"
    return "out"


@dataclass
class TeamStability:
    """Aggregated Monte Carlo outcome for one team."""

    team: str
    selection_frequency: float
    in_field_count: int
    n_scenarios: int
    base_rank: int
    base_selected: bool
    base_status: str  # in_field | first_out | next_out | out
    status: str  # lock | likely_in | bubble | likely_out | out
    median_rank: int
    most_common_outcome: str  # in_field | first_out | out
    primary_risk: str  # none | weight_sensitivity | auto_bid_displacement | composite_gap


@dataclass
class SensitivityResult:
    """Full Monte Carlo result, ready for the sensitivity.json builder."""

    n_scenarios: int
    random_seed: int
    relative_range: float
    base_weights: Dict[str, float]
    base_field_cutoff: Dict[str, object]
    teams: List[TeamStability] = field(default_factory=list)


def _minmax(values: np.ndarray) -> np.ndarray:
    """Min-max normalize, matching the ranking pipeline's MinMaxScaler
    (constant columns normalize to 0)."""
    lo = values.min()
    hi = values.max()
    if hi <= lo:
        return np.zeros_like(values, dtype=float)
    return (values - lo) / (hi - lo)


def _perturbed_weights(
    base: np.ndarray, rng: np.random.Generator, relative_range: float
) -> np.ndarray:
    factors = rng.uniform(1.0 - relative_range, 1.0 + relative_range, size=base.shape)
    perturbed = np.clip(base * factors, 0.0, None)
    total = perturbed.sum()
    if total <= 0:  # degenerate draw; fall back to base weights
        return base / base.sum()
    return perturbed / total


def _base_status_lookup(
    rankings_df: pd.DataFrame, selection, n_next_out: int = 4
) -> Dict[str, str]:
    in_field = {t["team"] for t in selection.playoff_teams}
    first_out = {t["team"] for t in selection.first_four_out}
    next_out_pool = rankings_df[~rankings_df["team"].isin(in_field | first_out)].sort_values("rank")
    next_out = set(next_out_pool.head(n_next_out)["team"])
    lookup: Dict[str, str] = {}
    for team in rankings_df["team"]:
        if team in in_field:
            lookup[team] = "in_field"
        elif team in first_out:
            lookup[team] = "first_out"
        elif team in next_out:
            lookup[team] = "next_out"
        else:
            lookup[team] = "out"
    return lookup


def run_weight_perturbation(
    rankings_df: pd.DataFrame,
    *,
    base_weights: Optional[RankingWeights] = None,
    n_scenarios: int = DEFAULT_N_SCENARIOS,
    random_seed: int = DEFAULT_RANDOM_SEED,
    relative_range: float = DEFAULT_RELATIVE_RANGE,
    format_rules: Optional[PlayoffFormat] = None,
) -> SensitivityResult:
    """
    Monte Carlo Selection Stability over uniform relative weight perturbations.

    ``rankings_df`` must carry team/rank/conference/conf_champ plus the raw
    component columns (resume_score, predictive_score, sor, sos) produced by
    ``calculate_composite_rankings``. Components are NOT recomputed here.

    Per-scenario ranks come from a stable sort of the perturbed composite
    (rank-tie tiebreakers are skipped for speed; ties at full float precision
    are vanishingly rare and a stable sort keeps results reproducible).
    """
    weights = base_weights or RankingWeights()
    weights.validate()

    df = rankings_df.copy()
    if "conf_champ" not in df.columns:
        df["conf_champ"] = "No"
    if "conference" not in df.columns:
        df["conference"] = "Unknown"

    # --- base (deterministic) selection --------------------------------------
    base_selection = select_playoff_field(df, format_rules=format_rules)
    base_in_field = {t["team"] for t in base_selection.playoff_teams}
    base_status = _base_status_lookup(df, base_selection)

    at_large_by_rank = sorted(base_selection.at_large_bids, key=lambda t: t["rank"])
    final_at_large = at_large_by_rank[-1] if at_large_by_rank else None
    first_out = base_selection.first_four_out[0] if base_selection.first_four_out else None
    base_field_cutoff: Dict[str, object] = {
        "final_at_large_team": final_at_large["team"] if final_at_large else None,
        "final_at_large_score": (
            float(final_at_large["composite_score"]) if final_at_large else None
        ),
        "first_team_out": first_out["team"] if first_out else None,
        "first_team_out_score": float(first_out["composite_score"]) if first_out else None,
    }

    # Scope: base field + first/next four out + displaced (≈20 teams).
    scope = set(base_in_field)
    scope |= {t["team"] for t in base_selection.first_four_out}
    scope |= {team for team, status in base_status.items() if status == "next_out"}
    if base_selection.displaced_team is not None:
        scope.add(base_selection.displaced_team["team"])

    # --- precompute normalized components once -------------------------------
    df = df.reset_index(drop=True)
    teams = df["team"].tolist()
    components = np.column_stack(
        [_minmax(df[col].to_numpy(dtype=float)) for col in COMPONENT_COLUMNS]
    )
    base_w = np.array([getattr(weights, key) for key in WEIGHT_KEYS], dtype=float)
    total_field = len(base_selection.playoff_teams)

    in_counts: Dict[str, int] = {t: 0 for t in teams}
    first_out_counts: Dict[str, int] = {t: 0 for t in teams}
    displacement_miss_counts: Dict[str, int] = {t: 0 for t in teams}
    rank_history = np.empty((n_scenarios, len(teams)), dtype=np.int32)

    rng = np.random.default_rng(random_seed)
    scenario_df = df[["team", "conference", "conf_champ"]].copy()

    for scenario in range(n_scenarios):
        w = _perturbed_weights(base_w, rng, relative_range)
        composite = components @ w

        order = np.argsort(-composite, kind="stable")
        ranks = np.empty(len(teams), dtype=np.int32)
        ranks[order] = np.arange(1, len(teams) + 1)
        rank_history[scenario] = ranks

        scenario_df["composite_score"] = composite
        scenario_df["rank"] = ranks
        selection = select_playoff_field(scenario_df, format_rules=format_rules)

        selected = {t["team"] for t in selection.playoff_teams}
        for team in selected:
            in_counts[team] += 1
        for t in selection.first_four_out:
            first_out_counts[t["team"]] += 1
        # A miss despite ranking inside the field size = pushed out by an
        # auto-bid champion, not by composite score.
        for idx, team in enumerate(teams):
            if team not in selected and ranks[idx] <= total_field:
                displacement_miss_counts[team] += 1

    # --- aggregate ------------------------------------------------------------
    team_index = {team: idx for idx, team in enumerate(teams)}
    rank_by_team = {row["team"]: int(row["rank"]) for _, row in df.iterrows()}

    results: List[TeamStability] = []
    for team in sorted(scope, key=lambda t: rank_by_team.get(t, 10**6)):
        idx = team_index[team]
        in_count = in_counts[team]
        frequency = in_count / n_scenarios
        misses = n_scenarios - in_count

        if misses == 0:
            primary_risk = "none"
        elif displacement_miss_counts[team] / misses > 0.5:
            primary_risk = "auto_bid_displacement"
        elif in_count > 0:
            primary_risk = "weight_sensitivity"
        else:
            primary_risk = "composite_gap"

        fo_count = first_out_counts[team]
        out_count = n_scenarios - in_count - fo_count
        outcome_counts = {
            "in_field": in_count,
            "first_out": fo_count,
            "out": out_count,
        }
        most_common_outcome = max(outcome_counts, key=lambda k: outcome_counts[k])

        results.append(
            TeamStability(
                team=team,
                selection_frequency=frequency,
                in_field_count=in_count,
                n_scenarios=n_scenarios,
                base_rank=rank_by_team[team],
                base_selected=team in base_in_field,
                base_status=base_status[team],
                status=stability_status(frequency),
                median_rank=int(np.median(rank_history[:, idx])),
                most_common_outcome=most_common_outcome,
                primary_risk=primary_risk,
            )
        )

    return SensitivityResult(
        n_scenarios=n_scenarios,
        random_seed=random_seed,
        relative_range=relative_range,
        base_weights={key: float(getattr(weights, key)) for key in WEIGHT_KEYS},
        base_field_cutoff=base_field_cutoff,
        teams=results,
    )


def calculate_composite_with_weights(
    games_df: pd.DataFrame,
    weights: RankingWeights,
) -> pd.DataFrame:
    """Full pipeline rerun under alternate weights (Scenario Lab path — NOT
    used by the Monte Carlo above, which reuses precomputed components)."""
    return calculate_composite_rankings(games_df, weights=weights)
