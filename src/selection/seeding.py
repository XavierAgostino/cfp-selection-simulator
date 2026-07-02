"""
CFP playoff seeding under format-specific rules.

2024: top four conference champions receive seeds 1-4 and byes.
2025+: seeds 1-12 follow final ranking; top four overall receive byes.
"""

from __future__ import annotations

from typing import Dict, List, Optional

import pandas as pd

from src.config.formats import FORMAT_2024, FORMATS, PlayoffFormat


def _team_row(team: Dict, seed: int, is_bye: bool, auto_bid_names: set[str]) -> Dict:
    is_champ = team["team"] in auto_bid_names
    return {
        "seed": seed,
        "team": team["team"],
        "rank": team["rank"],
        "wins": team.get("wins", 0),
        "losses": team.get("losses", 0),
        "conference": team.get("conference", ""),
        "conf_champ": team.get("conf_champ", "") if is_champ else "No",
        "is_bye": is_bye,
        "composite_score": team.get("composite_score", 0.0),
    }


def seed_champion_byes(
    playoff_teams: List[Dict],
    auto_bid_teams: List[Dict],
) -> pd.DataFrame:
    """
    2024 seeding: top four conference champions get seeds 1-4 and byes.

    Remaining eight teams fill seeds 5-12 in rank order.
    """
    auto_bid_names = {team["team"] for team in auto_bid_teams}
    sorted_teams = sorted(playoff_teams, key=lambda x: x["rank"])

    champs_in_playoff = [t for t in sorted_teams if t["team"] in auto_bid_names]
    top_4_champs = champs_in_playoff[:4]
    top_4_names = {t["team"] for t in top_4_champs}

    seeded: List[Dict] = []
    seed = 1
    for team in top_4_champs:
        seeded.append(_team_row(team, seed, is_bye=True, auto_bid_names=auto_bid_names))
        seed += 1

    remaining = [t for t in sorted_teams if t["team"] not in top_4_names]
    for team in remaining:
        seeded.append(_team_row(team, seed, is_bye=False, auto_bid_names=auto_bid_names))
        seed += 1

    return pd.DataFrame(seeded)


def seed_straight(
    playoff_teams: List[Dict],
    auto_bid_teams: List[Dict],
) -> pd.DataFrame:
    """
    2025+ seeding: seeds 1-12 follow final ranking order.

    Top four overall ranked teams receive byes regardless of conference champion status.
    """
    auto_bid_names = {team["team"] for team in auto_bid_teams}
    sorted_teams = sorted(playoff_teams, key=lambda x: x["rank"])

    seeded: List[Dict] = []
    for seed, team in enumerate(sorted_teams, start=1):
        is_bye = seed <= 4
        seeded.append(_team_row(team, seed, is_bye=is_bye, auto_bid_names=auto_bid_names))

    return pd.DataFrame(seeded)


def seed_playoff_teams(
    playoff_teams: List[Dict],
    auto_bid_teams: List[Dict],
    format_rules: Optional[PlayoffFormat] = None,
) -> pd.DataFrame:
    """
    Seed a 12-team playoff field using the rules for the given format.

    Parameters
    ----------
    playoff_teams
        Selected playoff teams with rank and team metadata.
    auto_bid_teams
        Conference champion teams that received automatic bids.
    format_rules
        PlayoffFormat instance. Defaults to 2024 rules for backward compatibility.
    """
    rules = format_rules or FORMATS[FORMAT_2024]

    if rules.seeding == "champion_byes":
        return seed_champion_byes(playoff_teams, auto_bid_teams)
    if rules.seeding == "straight":
        return seed_straight(playoff_teams, auto_bid_teams)

    raise ValueError(f"Unknown seeding mode: {rules.seeding!r}")


__all__ = [
    "seed_playoff_teams",
    "seed_champion_byes",
    "seed_straight",
]
