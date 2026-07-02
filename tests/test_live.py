"""Tests for live CFBD enrichment helpers."""

from __future__ import annotations

import pandas as pd

from src.pipeline.live import (
    conference_leaders_from_records,
    enrich_live_rankings,
    filter_games_to_fbs,
    infer_conference_champions,
)


def test_filter_games_to_fbs():
    games = pd.DataFrame(
        [
            {
                "home_team": "Ohio State",
                "away_team": "Michigan",
                "home_conference": "Big Ten",
                "away_conference": "Big Ten",
            },
            {
                "home_team": "North Dakota State",
                "away_team": "Montana",
                "home_conference": "MVFC",
                "away_conference": "Big Sky",
            },
        ]
    )
    fbs = {"Ohio State", "Michigan", "Georgia", "Texas"}
    filtered = filter_games_to_fbs(games, 2025, fbs_teams=fbs)
    assert len(filtered) == 1
    assert filtered.iloc[0]["home_team"] == "Ohio State"


def test_infer_conference_champions():
    rankings = pd.DataFrame(
        [
            {"rank": 1, "team": "Ohio State", "conference": "Big Ten", "composite_score": 0.9},
            {"rank": 2, "team": "Michigan", "conference": "Big Ten", "composite_score": 0.8},
            {"rank": 3, "team": "Georgia", "conference": "SEC", "composite_score": 0.85},
        ]
    )
    enriched = infer_conference_champions(rankings)
    osu = enriched[enriched["team"] == "Ohio State"].iloc[0]
    michigan = enriched[enriched["team"] == "Michigan"].iloc[0]
    georgia = enriched[enriched["team"] == "Georgia"].iloc[0]
    assert "Yes" in osu["conf_champ"]
    assert michigan["conf_champ"] == "No"
    assert "Yes" in georgia["conf_champ"]


def test_conference_leaders_from_records_uses_conference_record():
    records = [
        {
            "team": "Ohio State",
            "conference": "Big Ten",
            "conferenceGames": {"games": 8, "wins": 7, "losses": 1},
            "total": {"wins": 11, "losses": 1},
        },
        {
            "team": "Michigan",
            "conference": "Big Ten",
            "conferenceGames": {"games": 8, "wins": 8, "losses": 0},
            "total": {"wins": 10, "losses": 2},
        },
        {
            "team": "Georgia",
            "conference": "SEC",
            "conferenceGames": {"games": 8, "wins": 7, "losses": 1},
            "total": {"wins": 11, "losses": 1},
        },
    ]
    leaders = conference_leaders_from_records(records)
    assert leaders["Michigan"] == "Yes (Big Ten)"
    assert leaders["Georgia"] == "Yes (SEC)"
    assert "Ohio State" not in leaders


def test_enrich_live_rankings_adds_conference():
    games = pd.DataFrame(
        [
            {
                "home_team": "Ohio State",
                "away_team": "Michigan",
                "home_conference": "Big Ten",
                "away_conference": "Big Ten",
                "home_score": 24,
                "away_score": 17,
            }
        ]
    )
    rankings = pd.DataFrame(
        [
            {"rank": 1, "team": "Ohio State", "composite_score": 0.9},
            {"rank": 2, "team": "Michigan", "composite_score": 0.8},
        ]
    )
    enriched, source = enrich_live_rankings(rankings, games)
    assert enriched.loc[enriched["team"] == "Ohio State", "conference"].iloc[0] == "Big Ten"
    assert source == "games_waterfall"
    assert "Yes" in enriched.loc[enriched["team"] == "Ohio State", "conf_champ"].iloc[0]
