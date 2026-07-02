"""Shared fixtures for playoff seeding tests."""

from __future__ import annotations

from typing import List


def make_team(
    rank: int,
    name: str,
    *,
    is_champ: bool = False,
    conference: str = "Test",
) -> dict:
    conf_champ = f"Yes ({conference})" if is_champ else "No"
    return {
        "rank": rank,
        "team": name,
        "wins": 12,
        "losses": 1,
        "conference": conference,
        "conf_champ": conf_champ,
        "composite_score": 100.0 - rank,
    }


def shared_playoff_fixture() -> tuple[List[dict], List[dict]]:
    """
    Twelve-team field for seeding tests.

    Rank 1: Team A (champ)
    Rank 2: Team B (not champ)
    Rank 3: Team C (champ)
    Rank 4: Team D (not champ)
    Rank 5: Team E (champ)
    Rank 6: Team F (champ)
    Rank 7-12: mix of champs and non-champs
    """
    playoff_teams = [
        make_team(1, "Team A", is_champ=True, conference="Big Ten"),
        make_team(2, "Team B", is_champ=False, conference="SEC"),
        make_team(3, "Team C", is_champ=True, conference="ACC"),
        make_team(4, "Team D", is_champ=False, conference="Big 12"),
        make_team(5, "Team E", is_champ=True, conference="SEC"),
        make_team(6, "Team F", is_champ=True, conference="Pac-12"),
        make_team(7, "Team G", is_champ=False, conference="Big Ten"),
        make_team(8, "Team H", is_champ=False, conference="ACC"),
        make_team(9, "Team I", is_champ=True, conference="Sun Belt"),
        make_team(10, "Team J", is_champ=False, conference="AAC"),
        make_team(11, "Team K", is_champ=True, conference="MAC"),
        make_team(12, "Team L", is_champ=False, conference="C-USA"),
    ]
    auto_bid_teams = [t for t in playoff_teams if "Yes" in t["conf_champ"]]
    return playoff_teams, auto_bid_teams
