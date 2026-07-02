"""
Selection stability / sensitivity analysis (stub for v2.0).

Full Monte Carlo weight perturbation analysis ships in a future release.
"""

from __future__ import annotations

from typing import Dict, List

import pandas as pd

from src.pipeline.composite import RankingWeights, calculate_composite_rankings
from src.selection.field import select_playoff_field


def run_weight_perturbation_stub(
    games_df: pd.DataFrame,
    rankings_df: pd.DataFrame,
    n_scenarios: int = 100,
) -> pd.DataFrame:
    """
    Stub: return selection frequency for bubble teams under weight perturbations.

    Currently returns 100% for all teams in the current top 12 as a placeholder.
    """
    base = RankingWeights()
    selection = select_playoff_field(rankings_df)
    rows: List[Dict] = []
    for team_dict in selection.playoff_teams:
        rows.append(
            {
                "team": team_dict["team"],
                "rank": team_dict["rank"],
                "selection_stability": 1.0,
                "n_scenarios": n_scenarios,
                "weights_base": str(base),
            }
        )
    bubble = rankings_df[
        ~rankings_df["team"].isin([t["team"] for t in selection.playoff_teams])
    ].head(8)
    for _, row in bubble.iterrows():
        rows.append(
            {
                "team": row["team"],
                "rank": row["rank"],
                "selection_stability": 0.0,
                "n_scenarios": n_scenarios,
                "weights_base": str(base),
            }
        )
    return pd.DataFrame(rows)


def calculate_composite_with_weights(
    games_df: pd.DataFrame,
    weights: RankingWeights,
) -> pd.DataFrame:
    """Helper for future sensitivity analysis."""
    return calculate_composite_rankings(games_df, weights=weights)
