"""Shared validation metrics (committee, selection, predictive)."""

from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from scipy.stats import spearmanr


def spearman_on_list(
    simulator_rankings: pd.DataFrame,
    reference_order: Sequence[str],
) -> Tuple[Optional[float], Optional[float]]:
    """Spearman correlation on teams present in both orderings."""
    common = [team for team in reference_order if team in simulator_rankings["team"].values]
    if len(common) < 2:
        return None, None

    sim_ranks: List[int] = []
    ref_ranks: List[int] = []
    for i, team in enumerate(reference_order):
        if team not in common:
            continue
        ref_ranks.append(i + 1)
        sim_rank = int(simulator_rankings.loc[simulator_rankings["team"] == team, "rank"].iloc[0])
        sim_ranks.append(sim_rank)

    correlation, p_value = spearmanr(sim_ranks, ref_ranks)
    return float(correlation), float(p_value)


def average_rank_error(
    simulator_rankings: pd.DataFrame,
    reference_order: Sequence[str],
) -> Optional[float]:
    """Mean absolute rank difference on common teams."""
    errors: List[int] = []
    for i, team in enumerate(reference_order):
        if team not in simulator_rankings["team"].values:
            continue
        sim_rank = int(simulator_rankings.loc[simulator_rankings["team"] == team, "rank"].iloc[0])
        errors.append(abs(sim_rank - (i + 1)))
    return float(np.mean(errors)) if errors else None


def field_overlap(
    simulated: Sequence[str],
    reference: Sequence[str],
) -> Dict[str, int | float | List[str]]:
    """Set overlap between simulated and reference playoff fields."""
    sim_set = set(simulated)
    ref_set = set(reference)
    matched = sorted(sim_set & ref_set)
    total = len(ref_set)
    correct = len(matched)
    return {
        "correct": correct,
        "total": total,
        "overlap_ratio": correct / total if total else 0.0,
        "overlap_label": f"{correct}/{total}",
        "false_positives": sorted(sim_set - ref_set),
        "false_negatives": sorted(ref_set - sim_set),
        "matched_teams": matched,
    }


def subset_overlap(
    simulator_rankings: pd.DataFrame,
    reference_order: Sequence[str],
    *,
    start_rank: int,
    end_rank: int,
) -> Dict[str, int | float | str]:
    """
    Overlap on a rank slice of the reference ordering (1-indexed, inclusive).

    Bubble watch uses committee ranks 10–12 by default.
    """
    slice_teams = reference_order[start_rank - 1 : end_rank]
    sim_top_n = simulator_rankings.nsmallest(end_rank, "rank")["team"].tolist()
    sim_slice = set(sim_top_n[start_rank - 1 : end_rank])
    ref_slice = set(slice_teams)
    correct = len(sim_slice & ref_slice)
    total = len(ref_slice)
    return {
        "correct": correct,
        "total": total,
        "overlap_ratio": correct / total if total else 0.0,
        "overlap_label": f"{correct}/{total}",
    }


def bid_overlap(simulated: Sequence[str], reference: Sequence[str]) -> Dict[str, int | float | str]:
    """Overlap for auto-bid or at-large subsets."""
    result = field_overlap(simulated, reference)
    return {
        "correct": result["correct"],
        "total": result["total"],
        "overlap_label": result["overlap_label"],
        "overlap_ratio": result["overlap_ratio"],
    }


# Backward-compatible names used by legacy backtest imports
calculate_spearman_correlation = spearman_on_list


def calculate_selection_accuracy(
    simulator_playoff_teams: List[str],
    cfp_playoff_teams: List[str],
) -> Dict[str, float | int]:
    """Deprecated name: use ``field_overlap`` for era-correct validation."""
    result = field_overlap(simulator_playoff_teams, cfp_playoff_teams)
    return {
        "accuracy": float(result["overlap_ratio"]),
        "correct_selections": int(result["correct"]),
        "total_selections": int(result["total"]),
        "false_positives": len(result["false_positives"]),
        "false_negatives": len(result["false_negatives"]),
    }


def calculate_seeding_accuracy(
    simulator_seeds: Dict[str, int],
    cfp_seeds: Dict[str, int],
) -> Dict[str, float]:
    """Diagnostic seed agreement (not a headline KPI)."""
    common_teams = set(simulator_seeds.keys()) & set(cfp_seeds.keys())
    if not common_teams:
        return {"exact_match": 0.0, "within_one": 0.0, "mae": 0.0, "rmse": 0.0}

    exact_matches = 0
    within_one = 0
    errors: List[int] = []

    for team in common_teams:
        sim_seed = simulator_seeds[team]
        cfp_seed = cfp_seeds[team]
        if sim_seed == cfp_seed:
            exact_matches += 1
        if abs(sim_seed - cfp_seed) <= 1:
            within_one += 1
        errors.append(abs(sim_seed - cfp_seed))

    n = len(common_teams)
    return {
        "exact_match": exact_matches / n,
        "within_one": within_one / n,
        "mae": float(np.mean(errors)),
        "rmse": float(np.sqrt(np.mean([e**2 for e in errors]))),
    }
