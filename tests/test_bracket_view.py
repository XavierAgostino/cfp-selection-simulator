"""Tests for bracket pod data model."""

from __future__ import annotations

import pandas as pd
import pytest

from src.config.formats import get_format_for_year
from src.playoff.bracket_view import build_bracket_pods, build_bracket_rounds
from src.selection.seeding import seed_playoff_teams
from tests.fixtures.seeding import shared_playoff_fixture


def _seeded_field() -> pd.DataFrame:
    playoff_teams, auto_bid_teams = shared_playoff_fixture()
    fmt = get_format_for_year(2025)
    return seed_playoff_teams(playoff_teams, auto_bid_teams, fmt)


def test_build_bracket_pods_four_pods():
    seeded = _seeded_field()
    pods = build_bracket_pods(seeded)
    assert len(pods) == 4
    assert [p["pod_id"] for p in pods] == ["top_1", "top_2", "bottom_1", "bottom_2"]


def test_build_bracket_pods_first_round_pairings():
    seeded = _seeded_field()
    pods = build_bracket_pods(seeded)
    pairings = [(int(p["first_round"][0]["seed"]), int(p["first_round"][1]["seed"])) for p in pods]
    assert pairings == [(8, 9), (5, 12), (6, 11), (7, 10)]


def test_build_bracket_pods_bye_seeds():
    seeded = _seeded_field()
    pods = build_bracket_pods(seeded)
    bye_seeds = [int(p["bye"]["seed"]) for p in pods]
    assert bye_seeds == [1, 4, 3, 2]


def test_build_bracket_pods_semifinal_sides():
    seeded = _seeded_field()
    pods = build_bracket_pods(seeded)
    assert pods[0]["semifinal_side"] == "top"
    assert pods[1]["semifinal_side"] == "top"
    assert pods[2]["semifinal_side"] == "bottom"
    assert pods[3]["semifinal_side"] == "bottom"


def test_build_bracket_rounds_structure():
    seeded = _seeded_field()
    pods = build_bracket_pods(seeded)
    rounds = build_bracket_rounds(pods)
    assert len(rounds["first_round"]) == 4
    assert len(rounds["quarterfinals"]) == 4
    assert len(rounds["semifinals"]) == 2
    assert rounds["championship"]["label"] == "National Championship"


def test_build_bracket_pods_requires_twelve_teams():
    df = pd.DataFrame([{"seed": 1, "team": "Only One"}])
    with pytest.raises(ValueError, match="Expected 12"):
        build_bracket_pods(df)
