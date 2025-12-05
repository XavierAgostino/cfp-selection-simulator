"""
Data fetching utilities for CollegeFootballData.com API.
"""

import os
from typing import Set, List, Dict, Any

import pandas as pd
import requests
from dotenv import load_dotenv
import cfbd
from cfbd.rest import ApiException


def get_api_key() -> str:
    """Load and validate API key from environment."""
    load_dotenv()
    api_key = os.getenv('CFBD_API_KEY')

    if not api_key:
        raise ValueError("CFBD_API_KEY not found in environment variables")

    return api_key.strip().strip('"').strip("'")


def get_fbs_teams_list(year: int, teams_api: cfbd.TeamsApi) -> Set[str]:
    """
    Fetch list of FBS teams for filtering.

    Args:
        year: Season year
        teams_api: Configured CFBD TeamsApi instance

    Returns:
        Set of FBS team names
    """
    try:
        fbs_teams = teams_api.get_fbs_teams(year=year)
        return set([team.school for team in fbs_teams])
    except ApiException as e:
        raise Exception(f"Error fetching FBS teams: {e}")


def fetch_season_games(
    year: int,
    start_week: int = 1,
    fbs_teams: Set[str] = None,
    api_key: str = None
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
        configuration = cfbd.Configuration()
        configuration.api_key['Authorization'] = f'Bearer {api_key}'
        teams_api = cfbd.TeamsApi(cfbd.ApiClient(configuration))
        fbs_teams = get_fbs_teams_list(year, teams_api)

    base_url = "https://api.collegefootballdata.com/games"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "accept": "application/json"
    }

    all_games = []

    for week in range(start_week, 16):
        params = {
            "year": year,
            "week": week,
            "seasonType": "regular",
            "division": "fbs"
        }

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
        home_team = game.get('home_team') or game.get('homeTeam')
        away_team = game.get('away_team') or game.get('awayTeam')
        home_score = game.get('home_points') or game.get('homePoints')
        away_score = game.get('away_points') or game.get('awayPoints')

        if (home_team in fbs_teams and away_team in fbs_teams and
            home_score is not None and away_score is not None):
            games_data.append({
                'game_id': game.get('id') or game.get('gameId'),
                'week': game.get('week'),
                'home_team': home_team,
                'away_team': away_team,
                'home_score': int(home_score),
                'away_score': int(away_score),
                'home_conference': game.get('home_conference') or game.get('homeConference'),
                'away_conference': game.get('away_conference') or game.get('awayConference'),
                'neutral_site': game.get('neutral_site') or game.get('neutralSite', False),
                'date': game.get('start_date') or game.get('startDate')
            })

    return pd.DataFrame(games_data)
