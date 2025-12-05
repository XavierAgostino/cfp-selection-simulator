"""
Pytest configuration and shared fixtures.
"""

from typing import Any, Dict

import pandas as pd
import pytest


@pytest.fixture
def sample_games_data() -> pd.DataFrame:
    """Sample FBS game data for testing."""
    return pd.DataFrame(
        [
            {
                "game_id": 1,
                "week": 5,
                "home_team": "Alabama",
                "away_team": "Georgia",
                "home_score": 27,
                "away_score": 24,
                "home_conference": "SEC",
                "away_conference": "SEC",
                "neutral_site": False,
                "date": "2025-09-20",
            },
            {
                "game_id": 2,
                "week": 5,
                "home_team": "Ohio State",
                "away_team": "Michigan",
                "home_score": 31,
                "away_score": 28,
                "home_conference": "Big Ten",
                "away_conference": "Big Ten",
                "neutral_site": False,
                "date": "2025-09-20",
            },
        ]
    )


@pytest.fixture
def api_config() -> Dict[str, Any]:
    """Mock API configuration."""
    return {"api_key": "test_api_key_12345", "base_url": "https://api.collegefootballdata.com"}
