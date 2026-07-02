"""Conference constants and helpers shared across pipeline and selection."""

from __future__ import annotations

from typing import Dict

import pandas as pd

# Conferences eligible for CFP automatic-bid champion consideration
CFP_CONFERENCES = frozenset(
    {
        "SEC",
        "Big Ten",
        "Big 12",
        "ACC",
        "Pac-12",
        "American Athletic",
        "Mountain West",
        "Sun Belt",
        "Mid-American",
        "Conference USA",
        "FBS Independents",
        "Independent",
    }
)

# Not eligible for conference-champion auto bids
INDEPENDENT_CONFERENCES = frozenset({"FBS Independents", "Independent", "Notre Dame"})


def team_conference_map(games_df: pd.DataFrame) -> Dict[str, str]:
    """Most frequent conference for each team from game rows."""
    counts: Dict[str, Dict[str, int]] = {}
    for _, game in games_df.iterrows():
        for team, conf_key in (
            (game["home_team"], "home_conference"),
            (game["away_team"], "away_conference"),
        ):
            conf = game.get(conf_key)
            if pd.isna(conf) or not str(conf).strip():
                continue
            counts.setdefault(str(team), {})
            label = str(conf)
            counts[str(team)][label] = counts[str(team)].get(label, 0) + 1
    return {team: max(conf_map, key=conf_map.get) for team, conf_map in counts.items()}
