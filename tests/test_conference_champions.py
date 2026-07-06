"""Tests for conference champion waterfall logic."""

from __future__ import annotations

import pandas as pd

from src.selection.conference_champions import (
    champions_from_cached_ccgs,
    champions_from_games,
    pool_record,
    resolve_conference_seeds,
    resolve_tied_record_leaders,
)


def _games(rows: list[dict]) -> pd.DataFrame:
    base = {
        "home_conference": "Test Conf",
        "away_conference": "Test Conf",
        "week": 10,
    }
    return pd.DataFrame([{**base, **row} for row in rows])


def test_pool_record_sweeper():
    games = _games(
        [
            {"home_team": "A", "away_team": "B", "home_score": 21, "away_score": 14},
            {"home_team": "A", "away_team": "C", "home_score": 28, "away_score": 10},
            {"home_team": "B", "away_team": "C", "home_score": 17, "away_score": 20},
        ]
    )
    pct, played, wins = pool_record("A", ["A", "B", "C"], games, ["B", "C"])
    assert wins == 2
    assert played == 2
    assert pct == 1.0


def test_resolve_conference_seeds_sweeper_wins():
    games = _games(
        [
            {"home_team": "A", "away_team": "B", "home_score": 21, "away_score": 14},
            {"home_team": "A", "away_team": "C", "home_score": 28, "away_score": 10},
            {"home_team": "B", "away_team": "C", "home_score": 17, "away_score": 20},
        ]
    )
    teams = [
        {"team": "A", "win_pct": 1.0, "rank": 1},
        {"team": "B", "win_pct": 1.0, "rank": 3},
        {"team": "C", "win_pct": 1.0, "rank": 5},
    ]
    opps = {"A": ["B", "C"], "B": ["A", "C"], "C": ["A", "B"]}
    records = {
        "A": {"wins": 2, "losses": 0},
        "B": {"wins": 1, "losses": 1},
        "C": {"wins": 0, "losses": 2},
    }
    top = resolve_conference_seeds(teams, games, opps, records)
    assert top[0]["team"] == "A"


def test_champions_from_games_labels_one_per_conference():
    games = pd.DataFrame(
        [
            {
                "home_team": "Ohio State",
                "away_team": "Michigan",
                "home_score": 24,
                "away_score": 17,
                "home_conference": "Big Ten",
                "away_conference": "Big Ten",
                "week": 12,
            },
            {
                "home_team": "Georgia",
                "away_team": "Alabama",
                "home_score": 21,
                "away_score": 14,
                "home_conference": "SEC",
                "away_conference": "SEC",
                "week": 12,
            },
        ]
    )
    rankings = pd.DataFrame(
        [
            {"team": "Ohio State", "rank": 1, "composite_score": 0.9, "predictive_score": 0.8},
            {"team": "Michigan", "rank": 2, "composite_score": 0.85, "predictive_score": 0.75},
            {"team": "Georgia", "rank": 3, "composite_score": 0.88, "predictive_score": 0.82},
            {"team": "Alabama", "rank": 4, "composite_score": 0.84, "predictive_score": 0.78},
        ]
    )
    champions = champions_from_games(rankings, games, simulate_ccg=False)
    assert champions["Ohio State"] == "Yes (Big Ten)"
    assert champions["Georgia"] == "Yes (SEC)"


def test_resolve_tied_record_leaders():
    games = _games(
        [
            {"home_team": "A", "away_team": "B", "home_score": 21, "away_score": 14},
        ]
    )
    rankings = pd.DataFrame(
        [
            {"team": "A", "rank": 2, "composite_score": 0.9, "predictive_score": 0.7},
            {"team": "B", "rank": 5, "composite_score": 0.85, "predictive_score": 0.8},
        ]
    )
    winner = resolve_tied_record_leaders(["A", "B"], "Test Conf", rankings, games)
    assert winner == "B"


def test_champions_from_cached_ccgs_uses_real_title_game_result():
    # Title week (15) intra-conference slate: the actual game winner is the
    # champion, even if it upset the higher-ranked team. Indiana beat Ohio State
    # in the Big Ten title game, so Indiana is champion despite a weaker resume.
    games = pd.DataFrame(
        [
            {
                "week": 15,
                "home_team": "Ohio State",
                "away_team": "Indiana",
                "home_conference": "Big Ten",
                "away_conference": "Big Ten",
                "home_score": 10,
                "away_score": 13,
            },
            {
                "week": 15,
                "home_team": "Alabama",
                "away_team": "Georgia",
                "home_conference": "SEC",
                "away_conference": "SEC",
                "home_score": 7,
                "away_score": 28,
            },
        ]
    )
    champions = champions_from_cached_ccgs(games)
    assert champions["Indiana"] == "Yes (Big Ten)"
    assert champions["Georgia"] == "Yes (SEC)"
    assert "Ohio State" not in champions


def test_champions_from_cached_ccgs_skips_non_title_and_ambiguous_weeks():
    # Pre-championship week (< 14): not a title slate.
    early = pd.DataFrame(
        [
            {
                "week": 10,
                "home_team": "Ohio State",
                "away_team": "Indiana",
                "home_conference": "Big Ten",
                "away_conference": "Big Ten",
                "home_score": 24,
                "away_score": 17,
            }
        ]
    )
    assert champions_from_cached_ccgs(early) == {}

    # Rivalry week 14: two intra-conference games for one league is not a title
    # slate (each conference plays exactly one championship game).
    rivalry = pd.DataFrame(
        [
            {
                "week": 14,
                "home_team": "Ohio State",
                "away_team": "Michigan",
                "home_conference": "Big Ten",
                "away_conference": "Big Ten",
                "home_score": 20,
                "away_score": 17,
            },
            {
                "week": 14,
                "home_team": "Indiana",
                "away_team": "Purdue",
                "home_conference": "Big Ten",
                "away_conference": "Big Ten",
                "home_score": 31,
                "away_score": 10,
            },
        ]
    )
    assert champions_from_cached_ccgs(rivalry) == {}
