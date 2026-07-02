"""Tests for CFBD conference championship game fetching and labeling."""

from __future__ import annotations

import pandas as pd

from src.data.fetcher import is_fbs_conference_championship
from src.selection.conference_champions import champions_from_ccg_games


def test_is_fbs_conference_championship_filters_non_fbs():
    assert is_fbs_conference_championship({"notes": "SEC Championship"})
    assert not is_fbs_conference_championship({"notes": "FCS Championship - Semifinals"})
    assert not is_fbs_conference_championship({"notes": "SWAC Championship"})


def test_champions_from_ccg_games():
    ccg = pd.DataFrame(
        [
            {
                "home_team": "Georgia",
                "away_team": "Texas",
                "home_score": 28,
                "away_score": 14,
                "home_conference": "SEC",
                "away_conference": "SEC",
            },
            {
                "home_team": "Boise State",
                "away_team": "UNLV",
                "home_score": 21,
                "away_score": 17,
                "home_conference": "Mountain West",
                "away_conference": "Mountain West",
            },
        ]
    )
    champions = champions_from_ccg_games(ccg)
    assert champions["Georgia"] == "Yes (SEC)"
    assert champions["Boise State"] == "Yes (Mountain West)"
