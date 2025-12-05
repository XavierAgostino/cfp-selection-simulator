"""
Conference strength and grouping utilities.

This module provides functions to calculate conference strength and apply
appropriate weighting to account for the quality gap between Power 5 and
Group of 5 conferences.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Set


# Conference groupings (updated for 2024+ realignment)
POWER_CONFERENCES = {
    'SEC',
    'Big Ten',
    'Big 12',
    'ACC',
    'Pac-12'  # Historical, deprecated after 2023
}

AUTONOMOUS_CONFERENCES = {
    'American Athletic',
    'Mountain West',
    'Sun Belt',
    'Mid-American',
    'Conference USA'
}

INDEPENDENT = {'FBS Independents', 'Independent'}


def is_power_conference(conference: str) -> bool:
    """
    Check if conference is Power 5.

    Args:
        conference: Conference name

    Returns:
        True if Power 5 conference
    """
    if pd.isna(conference):
        return False
    return conference in POWER_CONFERENCES


def get_conference_tier(conference: str) -> str:
    """
    Get conference tier classification.

    Args:
        conference: Conference name

    Returns:
        'P5', 'G5', or 'IND'
    """
    if pd.isna(conference):
        return 'IND'

    if conference in POWER_CONFERENCES:
        return 'P5'
    elif conference in AUTONOMOUS_CONFERENCES:
        return 'G5'
    else:
        return 'IND'


def calculate_conference_strength(games_df: pd.DataFrame) -> Dict[str, float]:
    """
    Calculate conference strength based on non-conference performance.

    Uses win percentage in non-conference games, weighted by opponent strength.

    Args:
        games_df: DataFrame with game results

    Returns:
        Dictionary mapping conference name to strength rating (0-1 scale)
    """
    conference_stats = {}

    for conf in games_df['home_conference'].dropna().unique():
        conf_games = games_df[
            ((games_df['home_conference'] == conf) &
             (games_df['away_conference'] != conf)) |
            ((games_df['away_conference'] == conf) &
             (games_df['home_conference'] != conf))
        ]

        if len(conf_games) == 0:
            conference_stats[conf] = 0.5
            continue

        wins = 0
        losses = 0

        for _, game in conf_games.iterrows():
            if game['home_conference'] == conf:
                if game['home_score'] > game['away_score']:
                    wins += 1
                else:
                    losses += 1
            else:
                if game['away_score'] > game['home_score']:
                    wins += 1
                else:
                    losses += 1

        total = wins + losses
        win_pct = wins / total if total > 0 else 0.5
        conference_stats[conf] = win_pct

    return conference_stats


def apply_conference_adjustment(
    team_score: float,
    conference: str,
    games_df: pd.DataFrame,
    p5_boost: float = 1.05,
    g5_penalty: float = 0.95
) -> float:
    """
    Apply conference strength adjustment to team score.

    Power 5 teams receive a small boost, Group of 5 teams receive a small penalty.
    This reflects CFP committee's historical preference for P5 teams.

    Args:
        team_score: Raw team score (0-1)
        conference: Team's conference
        games_df: Game results for dynamic strength calculation
        p5_boost: Multiplier for P5 teams (default 1.05 = 5% boost)
        g5_penalty: Multiplier for G5 teams (default 0.95 = 5% penalty)

    Returns:
        Adjusted score
    """
    tier = get_conference_tier(conference)

    if tier == 'P5':
        return min(team_score * p5_boost, 1.0)
    elif tier == 'G5':
        return team_score * g5_penalty
    else:
        return team_score


def get_conference_champions(
    rankings_df: pd.DataFrame,
    conf_champ_col: str = 'conf_champ'
) -> pd.DataFrame:
    """
    Extract conference champions from rankings.

    Args:
        rankings_df: Rankings DataFrame
        conf_champ_col: Column name for conference champion status

    Returns:
        DataFrame of conference champions only
    """
    return rankings_df[
        rankings_df[conf_champ_col].astype(str).str.contains('Yes', na=False)
    ].copy()


def calculate_conference_depth(games_df: pd.DataFrame, top_n: int = 25) -> Dict[str, int]:
    """
    Calculate number of top-N teams by conference.

    Args:
        games_df: Game results
        top_n: Threshold for "top" teams

    Returns:
        Dictionary of conference -> count of top teams
    """
    # This would need team rankings passed in
    # Placeholder for future implementation
    return {}


def format_conference_name(conf_champ_value: str) -> str:
    """
    Extract clean conference name from conf_champ column.

    Args:
        conf_champ_value: Value from conf_champ column (e.g., "Yes (SEC)")

    Returns:
        Clean conference name or None
    """
    if pd.isna(conf_champ_value):
        return None

    if 'Yes (' in str(conf_champ_value):
        return str(conf_champ_value).split('(')[1].split(')')[0]

    return None


def add_conference_tiers(df: pd.DataFrame, conference_col: str = 'conference') -> pd.DataFrame:
    """
    Add conference tier column to DataFrame.

    Args:
        df: DataFrame with conference column
        conference_col: Name of conference column

    Returns:
        DataFrame with added 'conf_tier' column
    """
    df = df.copy()
    df['conf_tier'] = df[conference_col].apply(get_conference_tier)
    return df
