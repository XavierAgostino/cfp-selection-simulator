"""Tests for committee-style tiebreakers."""

from __future__ import annotations

import pandas as pd

from src.selection.tiebreakers import (
    apply_tiebreaker,
    common_opponents_comparison,
    head_to_head_winner,
    resolve_rank_ties,
)


def _games(rows: list[dict]) -> pd.DataFrame:
    return pd.DataFrame(rows)


def test_head_to_head_winner():
    games = _games(
        [
            {
                "home_team": "Team A",
                "away_team": "Team B",
                "home_score": 28,
                "away_score": 14,
            }
        ]
    )
    assert head_to_head_winner("Team A", "Team B", games) == "Team A"
    assert head_to_head_winner("Team B", "Team A", games) == "Team A"


def test_common_opponents_comparison():
    games = _games(
        [
            {"home_team": "Team A", "away_team": "Common", "home_score": 35, "away_score": 10},
            {"home_team": "Team B", "away_team": "Common", "home_score": 14, "away_score": 21},
            {"home_team": "Team A", "away_team": "Other", "home_score": 10, "away_score": 3},
            {"home_team": "Team B", "away_team": "Other", "home_score": 7, "away_score": 3},
        ]
    )
    assert common_opponents_comparison("Team A", "Team B", games) == "Team A"


def test_apply_tiebreaker_uses_h2h_before_sos():
    games = _games(
        [
            {"home_team": "Ohio State", "away_team": "Michigan", "home_score": 24, "away_score": 17},
        ]
    )
    team_a = {"team": "Michigan", "composite_score": 0.91}
    team_b = {"team": "Ohio State", "composite_score": 0.90}
    sos = {"Ohio State": 1, "Michigan": 2}
    sor = {"Ohio State": 1, "Michigan": 2}
    winner, reason = apply_tiebreaker(team_a, team_b, games, sos, sor, tolerance=0.05)
    assert winner == "Ohio State"
    assert "Head-to-head" in reason


def test_resolve_rank_ties_reorders_close_scores():
    games = _games(
        [
            {"home_team": "Alpha", "away_team": "Beta", "home_score": 10, "away_score": 3},
        ]
    )
    rankings = pd.DataFrame(
        [
            {"team": "Beta", "composite_score": 0.500, "sos": 0.4, "sor": 0.6},
            {"team": "Alpha", "composite_score": 0.501, "sos": 0.5, "sor": 0.5},
        ]
    )
    resolved = resolve_rank_ties(rankings, games, tolerance=0.01)
    assert resolved.iloc[0]["team"] == "Alpha"
    assert resolved.iloc[0]["rank"] == 1
