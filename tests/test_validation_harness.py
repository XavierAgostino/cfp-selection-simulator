"""Tests for era-aware validation harness."""

from __future__ import annotations

import pandas as pd

from src.validation.era import get_era_spec, has_historical_field
from src.validation.metrics import (
    average_rank_error,
    field_overlap,
    spearman_on_list,
    subset_overlap,
)


def test_era_spec_four_team():
    spec = get_era_spec(2021)
    assert spec.era == "four_team"
    assert spec.field_size == 4
    assert spec.rule_target == "Top 4"


def test_era_spec_twelve_team_2024():
    spec = get_era_spec(2024)
    assert spec.era == "twelve_team_2024"
    assert spec.seeding_mode == "champion_byes"


def test_era_spec_twelve_team_2025():
    spec = get_era_spec(2025)
    assert spec.era == "twelve_team_2025_plus"
    assert spec.seeding_mode == "straight"


def test_has_historical_field():
    assert has_historical_field(2023)
    assert has_historical_field(2024)
    assert not has_historical_field(2030)


def test_field_overlap_four_team():
    result = field_overlap(
        ["Alabama", "Michigan", "Georgia", "Clemson"],
        ["Alabama", "Michigan", "Georgia", "Cincinnati"],
    )
    assert result["overlap_label"] == "3/4"


def test_spearman_perfect_agreement():
    teams = ["A", "B", "C", "D"]
    rankings = pd.DataFrame({"team": teams, "rank": [1, 2, 3, 4]})
    corr, _ = spearman_on_list(rankings, teams)
    assert corr == 1.0


def test_average_rank_error():
    rankings = pd.DataFrame({"team": ["A", "B", "C"], "rank": [1, 2, 3]})
    err = average_rank_error(rankings, ["A", "B", "C"])
    assert err == 0.0


def test_bubble_overlap():
    rankings = pd.DataFrame(
        {
            "team": [f"T{i}" for i in range(1, 14)],
            "rank": list(range(1, 14)),
        }
    )
    reference = [f"T{i}" for i in range(1, 26)]
    bubble = subset_overlap(rankings, reference, start_rank=10, end_rank=12)
    assert bubble["overlap_label"] == "3/3"


def test_simulate_four_team_field():
    rankings = pd.DataFrame(
        {
            "team": ["A", "B", "C", "D", "E"],
            "rank": [1, 2, 3, 4, 5],
        }
    )
    field = rankings.nsmallest(4, "rank")["team"].tolist()
    assert field == ["A", "B", "C", "D"]
