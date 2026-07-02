"""Tests for 2024 CFP champion-bye seeding."""

from src.config.formats import get_format_for_year
from src.selection.seeding import seed_playoff_teams
from tests.fixtures.seeding import shared_playoff_fixture


def test_2024_top_four_seeds_are_conference_champions():
    playoff_teams, auto_bid_teams = shared_playoff_fixture()
    fmt = get_format_for_year(2024)
    seeded = seed_playoff_teams(playoff_teams, auto_bid_teams, fmt)

    top_four = seeded[seeded["seed"] <= 4]
    assert list(top_four["team"]) == ["Team A", "Team C", "Team E", "Team F"]
    assert top_four["is_bye"].all()


def test_2024_non_champion_ranked_second_does_not_get_bye():
    playoff_teams, auto_bid_teams = shared_playoff_fixture()
    fmt = get_format_for_year(2024)
    seeded = seed_playoff_teams(playoff_teams, auto_bid_teams, fmt)

    team_b = seeded[seeded["team"] == "Team B"].iloc[0]
    assert team_b["rank"] == 2
    assert team_b["is_bye"] == False
    assert team_b["seed"] > 4


def test_2024_remaining_teams_fill_seeds_five_through_twelve_by_rank():
    playoff_teams, auto_bid_teams = shared_playoff_fixture()
    fmt = get_format_for_year(2024)
    seeded = seed_playoff_teams(playoff_teams, auto_bid_teams, fmt)

    bottom_eight = seeded[seeded["seed"] >= 5].sort_values("seed")
    expected_order = [
        "Team B",
        "Team D",
        "Team G",
        "Team H",
        "Team I",
        "Team J",
        "Team K",
        "Team L",
    ]
    assert list(bottom_eight["team"]) == expected_order


def test_2024_champion_outside_top_four_byes_has_no_bye():
    playoff_teams, auto_bid_teams = shared_playoff_fixture()
    fmt = get_format_for_year(2024)
    seeded = seed_playoff_teams(playoff_teams, auto_bid_teams, fmt)

    team_i = seeded[seeded["team"] == "Team I"].iloc[0]
    assert team_i["rank"] == 9
    assert team_i["is_bye"] == False


def test_bracket_shim_defaults_to_2024_without_format_rules():
    from src.playoff.bracket import seed_playoff_teams as bracket_seed

    playoff_teams, auto_bid_teams = shared_playoff_fixture()
    seeded = bracket_seed(playoff_teams, auto_bid_teams)

    top_four = seeded[seeded["seed"] <= 4]
    assert list(top_four["team"]) == ["Team A", "Team C", "Team E", "Team F"]
