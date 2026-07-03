"""Tests for displayed record game sets vs ranking model inputs."""

from __future__ import annotations

import json

import pandas as pd
import pytest

from src.api_contracts.build import team_records_from_games
from src.api_contracts.records import (
    build_record_games_df,
    build_record_meta,
    merge_ccg_games,
)
from src.config.simulator import SimulatorConfig
from src.pipeline.composite import calculate_composite_rankings
from src.pipeline.paths import API_ROOT
from src.pipeline.run import run_pipeline


def _games_fixture() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "game_id": "1",
                "week": 1,
                "home_team": "Alpha",
                "away_team": "Beta",
                "home_score": 28,
                "away_score": 14,
                "home_conference": "A",
                "away_conference": "B",
                "neutral_site": False,
            },
            {
                "game_id": "2",
                "week": 2,
                "home_team": "Gamma",
                "away_team": "Alpha",
                "home_score": 10,
                "away_score": 17,
                "home_conference": "C",
                "away_conference": "A",
                "neutral_site": False,
            },
        ]
    )


def test_team_records_from_games_counts():
    records = team_records_from_games(_games_fixture())
    assert records["Alpha"] == {"wins": 2, "losses": 0}
    assert records["Beta"] == {"wins": 0, "losses": 1}
    assert records["Gamma"] == {"wins": 0, "losses": 1}


def test_merge_ccg_games_dedupes_by_game_id():
    base = _games_fixture()
    ccg = pd.DataFrame(
        [
            {
                "game_id": "1",
                "week": 15,
                "home_team": "Alpha",
                "away_team": "Beta",
                "home_score": 21,
                "away_score": 17,
                "home_conference": "A",
                "away_conference": "B",
                "neutral_site": True,
            },
            {
                "game_id": "ccg-1",
                "week": 15,
                "home_team": "Alpha",
                "away_team": "Delta",
                "home_score": 31,
                "away_score": 24,
                "home_conference": "A",
                "away_conference": "D",
                "neutral_site": True,
            },
        ]
    )
    merged = merge_ccg_games(base, ccg)
    assert len(merged) == 3
    assert set(merged["game_id"].astype(str)) == {"1", "2", "ccg-1"}


def test_sample_pipeline_record_meta_demo():
    config = SimulatorConfig(year=2025, week=15)
    result = run_pipeline(config, use_sample=True)
    meta = result["record_meta"]
    assert meta["record_label"] == "demo_record"
    assert meta["is_demo_fixture"] is True
    assert meta["record_start_week"] >= 5
    assert meta["includes_ccg"] is False

    records = team_records_from_games(result["record_games"])
    rankings_path = API_ROOT / "rankings.json"
    payload = json.loads(rankings_path.read_text())
    for team in payload["teams"]:
        expected = records[team["team"]]
        assert team["record"]["wins"] == expected["wins"]
        assert team["record"]["losses"] == expected["losses"]


def test_ranking_invariance_when_record_games_include_ccg(monkeypatch):
    config = SimulatorConfig(year=2025, week=15)
    result = run_pipeline(config, use_sample=True)
    ranking_games = result["games"]
    base_rankings = calculate_composite_rankings(ranking_games, weights=config.weights)

    ccg = pd.DataFrame(
        [
            {
                "game_id": "ccg-test",
                "week": 15,
                "home_team": ranking_games.iloc[0]["home_team"],
                "away_team": ranking_games.iloc[1]["away_team"],
                "home_score": 24,
                "away_score": 21,
                "home_conference": "Test",
                "away_conference": "Test",
                "neutral_site": True,
            }
        ]
    )
    record_games = merge_ccg_games(ranking_games, ccg)
    assert len(record_games) > len(ranking_games)

    unchanged = calculate_composite_rankings(ranking_games, weights=config.weights)
    assert list(unchanged["team"]) == list(base_rankings["team"])
    assert list(unchanged["rank"]) == list(base_rankings["rank"])

    record_only = team_records_from_games(record_games)
    ranking_only = team_records_from_games(ranking_games)
    assert record_only != ranking_only


def test_build_record_games_df_fetches_ccg_when_live(monkeypatch):
    config = SimulatorConfig(year=2025, week=15)
    ranking = _games_fixture()

    ccg = pd.DataFrame(
        [
            {
                "game_id": "ccg-live",
                "week": 15,
                "home_team": "Alpha",
                "away_team": "Beta",
                "home_score": 35,
                "away_score": 28,
                "home_conference": "A",
                "away_conference": "B",
                "neutral_site": True,
            }
        ]
    )

    monkeypatch.setattr(
        "src.api_contracts.records.fetch_conference_championship_games",
        lambda *_args, **_kwargs: ccg,
    )

    record_df, includes_ccg = build_record_games_df(
        ranking, config, use_sample=False, api_key="test"
    )
    assert includes_ccg is True
    assert len(record_df) == len(ranking) + 1
    meta = build_record_meta(
        config, ranking, record_df, use_sample=False, includes_ccg=includes_ccg
    )
    assert meta["includes_ccg"] is True
    assert meta["record_label"] == "fbs_record"


def test_model_window_record_label_when_start_week_gt_one():
    config = SimulatorConfig(year=2025, week=10, start_week=5)
    games = _games_fixture()
    meta = build_record_meta(config, games, games, use_sample=False, includes_ccg=False)
    assert meta["record_label"] == "model_window_record"
