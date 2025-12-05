"""
Data fetching utilities for CollegeFootballData.com API.
"""

import os
from typing import Any, Dict, List, Set

import cfbd
import pandas as pd
import requests
from cfbd.rest import ApiException
from dotenv import load_dotenv


def get_api_key() -> str:
    """Load and validate API key from environment."""
    load_dotenv()
    api_key = os.getenv("CFBD_API_KEY")

    if not api_key:
        raise ValueError("CFBD_API_KEY not found in environment variables")

    return api_key.strip().strip('"').strip("'")


def get_fbs_teams_list(year: int, api_key: str = None) -> Set[str]:
    """
    Fetch list of FBS teams for filtering using requests library directly.
    This matches the approach used in notebook 01_data_pipeline.ipynb.

    Args:
        year: Season year
        api_key: API key (loaded from env if not provided)

    Returns:
        Set of FBS team names
    """
    if api_key is None:
        api_key = get_api_key()

    # Use requests library directly (same as notebook 01)
    url = "https://api.collegefootballdata.com/teams/fbs"
    headers = {"Authorization": f"Bearer {api_key}", "accept": "application/json"}
    params = {"year": year}

    try:
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            teams_data = response.json()
            fbs_team_names = set([team["school"] for team in teams_data])
            return fbs_team_names
        else:
            raise Exception(
                f"Error fetching FBS teams: Status {response.status_code} - {response.text[:200]}"
            )
    except Exception as e:
        raise Exception(f"Error fetching FBS teams: {e}")


def fetch_season_games(
    year: int, start_week: int = 1, fbs_teams: Set[str] = None, api_key: str = None
) -> pd.DataFrame:
    """
    Fetch all FBS vs FBS games for a season.

    Args:
        year: Season year
        start_week: Starting week number
        fbs_teams: Set of FBS team names (fetched if not provided)
        api_key: API key (loaded from env if not provided)

    Returns:
        DataFrame of game data
    """
    if api_key is None:
        api_key = get_api_key()

    if fbs_teams is None:
        # Use requests library directly (same as notebook 01)
        fbs_teams = get_fbs_teams_list(year, api_key)

    base_url = "https://api.collegefootballdata.com/games"
    headers = {"Authorization": f"Bearer {api_key}", "accept": "application/json"}

    all_games = []

    for week in range(start_week, 16):
        params = {"year": year, "week": week, "seasonType": "regular", "division": "fbs"}

        try:
            response = requests.get(base_url, headers=headers, params=params)
            if response.status_code == 200:
                all_games.extend(response.json())
        except Exception as e:
            print(f"Warning: Week {week} failed - {e}")
            continue

    # Filter and process games
    games_data = []
    for game in all_games:
        home_team = game.get("home_team") or game.get("homeTeam")
        away_team = game.get("away_team") or game.get("awayTeam")
        home_score = game.get("home_points") or game.get("homePoints")
        away_score = game.get("away_points") or game.get("awayPoints")

        if (
            home_team in fbs_teams
            and away_team in fbs_teams
            and home_score is not None
            and away_score is not None
        ):
            games_data.append(
                {
                    "game_id": game.get("id") or game.get("gameId"),
                    "week": game.get("week"),
                    "home_team": home_team,
                    "away_team": away_team,
                    "home_score": int(home_score),
                    "away_score": int(away_score),
                    "home_conference": game.get("home_conference") or game.get("homeConference"),
                    "away_conference": game.get("away_conference") or game.get("awayConference"),
                    "neutral_site": game.get("neutral_site") or game.get("neutralSite", False),
                    "date": game.get("start_date") or game.get("startDate"),
                }
            )

    return pd.DataFrame(games_data)
