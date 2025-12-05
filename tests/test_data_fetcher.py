"""
Tests for data fetching functionality.
"""

import pytest
import pandas as pd
from src.data.fetcher import get_api_key, fetch_season_games


def test_sample_games_fixture(sample_games_data):
    """Test that fixture provides valid game data."""
    assert isinstance(sample_games_data, pd.DataFrame)
    assert len(sample_games_data) == 2
    assert 'home_team' in sample_games_data.columns
    assert 'away_team' in sample_games_data.columns


# Add more tests as functionality is developed
