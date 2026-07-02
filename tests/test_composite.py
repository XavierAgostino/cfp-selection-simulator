"""Tests for composite ranking pipeline."""

import pandas as pd

from src.pipeline.composite import RankingWeights, calculate_composite_rankings


def test_composite_rankings_from_sample_games(sample_games_path):
    games = pd.read_csv(sample_games_path)
    rankings = calculate_composite_rankings(games)

    assert len(rankings) > 0
    assert "rank" in rankings.columns
    assert "composite_score" in rankings.columns
    assert "resume_score" in rankings.columns
    assert "predictive_score" in rankings.columns
    assert rankings["rank"].is_monotonic_increasing


def test_ranking_weights_must_sum_to_one():
    try:
        RankingWeights(resume=0.5, predictive=0.5, sor=0.5, sos=0.5)
        assert False, "Should raise"
    except ValueError:
        pass
