"""Tests for CFBD games cache path and coverage validation."""

from __future__ import annotations

import pandas as pd

from src.config.simulator import SimulatorConfig
from src.pipeline.cache_paths import games_cache_covers, games_cache_write_path
from src.pipeline.run import load_games


def test_games_cache_covers_requires_full_window():
    partial = pd.DataFrame({"week": [5, 6, 7]})
    full = pd.DataFrame({"week": [1, 2, 3, 4, 5]})

    assert not games_cache_covers(partial, start_week=1, through_week=5)
    assert games_cache_covers(full, start_week=1, through_week=5)
    assert games_cache_covers(partial, start_week=5, through_week=7)


def test_games_cache_write_path_includes_start_week(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "src.pipeline.cache_paths.DATA_CACHE",
        tmp_path / "cache",
    )
    path = games_cache_write_path(2025, 15, 3)
    assert path.name == "games_w15_s3.parquet"


def test_load_games_rejects_partial_legacy_cache(tmp_path, monkeypatch):
    monkeypatch.setattr("src.pipeline.run.REPO_ROOT", tmp_path)
    monkeypatch.setattr("src.pipeline.cache_paths.DATA_CACHE", tmp_path / "cache")

    config = SimulatorConfig(year=2025, week=15, start_week=1)
    cache_dir = tmp_path / "cache" / "cfbd" / "2025"
    cache_dir.mkdir(parents=True)
    legacy = cache_dir / "games_w15.parquet"
    pd.DataFrame(
        {
            "week": [5, 6, 7],
            "home_team": ["A", "B", "C"],
            "away_team": ["D", "E", "F"],
        }
    ).to_parquet(legacy, index=False)

    fetched = pd.DataFrame(
        {
            "week": [1, 2, 15],
            "home_team": ["Alpha", "Beta", "Gamma"],
            "away_team": ["Beta", "Gamma", "Alpha"],
        }
    )

    def fake_fetch(year: int, start_week: int = 1, api_key=None, fbs_teams=None):
        assert start_week == 1
        return fetched.copy()

    def passthrough_filter(games_df, year, api_key=None, fbs_teams=None):
        return games_df

    monkeypatch.setattr("src.pipeline.run.fetch_season_games", fake_fetch)
    monkeypatch.setattr("src.pipeline.run.filter_games_to_fbs", passthrough_filter)

    games = load_games(config, api_key="test", use_sample=False)

    assert int(games["week"].min()) == 1
    assert (cache_dir / "games_w15_s1.parquet").exists()
