"""Tests for 2025+ CFP straight seeding."""

from src.config.formats import get_format_for_year
from src.selection.seeding import seed_playoff_teams
from tests.fixtures.seeding import shared_playoff_fixture


def test_2025_seeds_follow_ranking_order():
    playoff_teams, auto_bid_teams = shared_playoff_fixture()
    fmt = get_format_for_year(2025)
    seeded = seed_playoff_teams(playoff_teams, auto_bid_teams, fmt)

    assert list(seeded.sort_values("seed")["team"]) == [
        "Team A",
        "Team B",
        "Team C",
        "Team D",
        "Team E",
        "Team F",
        "Team G",
        "Team H",
        "Team I",
        "Team J",
        "Team K",
        "Team L",
    ]


def test_2025_top_four_overall_get_byes():
    playoff_teams, auto_bid_teams = shared_playoff_fixture()
    fmt = get_format_for_year(2025)
    seeded = seed_playoff_teams(playoff_teams, auto_bid_teams, fmt)

    top_four = seeded[seeded["seed"] <= 4]
    assert list(top_four["team"]) == ["Team A", "Team B", "Team C", "Team D"]
    assert top_four["is_bye"].all()


def test_2025_non_champion_ranked_second_gets_bye():
    playoff_teams, auto_bid_teams = shared_playoff_fixture()
    fmt = get_format_for_year(2025)
    seeded = seed_playoff_teams(playoff_teams, auto_bid_teams, fmt)

    team_b = seeded[seeded["team"] == "Team B"].iloc[0]
    assert team_b["seed"] == 2
    assert team_b["is_bye"] == True


def test_2025_champion_ranked_fifth_or_lower_does_not_get_bye():
    playoff_teams, auto_bid_teams = shared_playoff_fixture()
    fmt = get_format_for_year(2025)
    seeded = seed_playoff_teams(playoff_teams, auto_bid_teams, fmt)

    for name in ("Team E", "Team F", "Team I"):
        row = seeded[seeded["team"] == name].iloc[0]
        assert row["is_bye"] == False


def test_get_format_for_year_2026_uses_2025_plus_rules():
    fmt = get_format_for_year(2026)
    assert fmt.name == "2025_plus"
    assert fmt.seeding == "straight"
    assert fmt.bye_rule == "top_4_overall"
