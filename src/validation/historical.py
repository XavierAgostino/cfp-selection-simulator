"""
Historical CFP committee data for validation.

Sources: CFP final rankings releases, official playoff brackets, ESPN/AP recap.
Team names match CFBD ``school`` identifiers where possible.
"""

from __future__ import annotations

from typing import Dict, List, Optional

# Final CFP committee top 25 (or best available) by season
HISTORICAL_CFP_TOP25: Dict[int, List[str]] = {
    2014: [
        "Alabama",
        "Oregon",
        "Florida State",
        "Ohio State",
        "Baylor",
        "TCU",
        "Michigan State",
        "Mississippi State",
        "Georgia Tech",
        "Ole Miss",
        "Arizona",
        "Kansas State",
    ],
    2015: [
        "Clemson",
        "Alabama",
        "Michigan State",
        "Oklahoma",
        "Iowa",
        "Stanford",
        "Ohio State",
        "Notre Dame",
        "Florida State",
        "North Carolina",
        "TCU",
        "Ole Miss",
    ],
    2016: [
        "Alabama",
        "Clemson",
        "Ohio State",
        "Washington",
        "Penn State",
        "Michigan",
        "Oklahoma",
        "Wisconsin",
        "USC",
        "Florida State",
        "Oklahoma State",
        "Colorado",
    ],
    2017: [
        "Clemson",
        "Oklahoma",
        "Georgia",
        "Alabama",
        "Ohio State",
        "Wisconsin",
        "Auburn",
        "USC",
        "Penn State",
        "Miami",
        "Washington",
        "UCF",
    ],
    2018: [
        "Clemson",
        "Alabama",
        "Notre Dame",
        "Oklahoma",
        "Georgia",
        "Ohio State",
        "Michigan",
        "UCF",
        "Florida",
        "LSU",
        "Washington",
        "Penn State",
    ],
    2019: [
        "LSU",
        "Ohio State",
        "Clemson",
        "Oklahoma",
        "Georgia",
        "Oregon",
        "Florida",
        "Alabama",
        "Penn State",
        "Utah",
        "Wisconsin",
        "Auburn",
    ],
    2020: [
        "Alabama",
        "Clemson",
        "Ohio State",
        "Notre Dame",
        "Texas A&M",
        "Florida",
        "Cincinnati",
        "Georgia",
        "Iowa State",
        "Miami",
        "North Carolina",
        "Indiana",
    ],
    2021: [
        "Alabama",
        "Michigan",
        "Georgia",
        "Cincinnati",
        "Notre Dame",
        "Ohio State",
        "Baylor",
        "Ole Miss",
        "Oklahoma State",
        "Michigan State",
        "Oklahoma",
        "Pittsburgh",
    ],
    2022: [
        "Georgia",
        "Michigan",
        "TCU",
        "Ohio State",
        "Alabama",
        "Tennessee",
        "Penn State",
        "Washington",
        "Clemson",
        "Kansas State",
        "Utah",
        "USC",
    ],
    2023: [
        "Michigan",
        "Washington",
        "Texas",
        "Alabama",
        "Georgia",
        "Florida State",
        "Oregon",
        "Ohio State",
        "Missouri",
        "Penn State",
        "Ole Miss",
        "Oklahoma",
    ],
    2024: [
        "Oregon",
        "Georgia",
        "Texas",
        "Penn State",
        "Notre Dame",
        "Ohio State",
        "Tennessee",
        "Indiana",
        "Boise State",
        "SMU",
        "Alabama",
        "Arizona State",
        "Miami",
        "Ole Miss",
        "South Carolina",
        "Clemson",
        "BYU",
        "Iowa State",
        "Missouri",
        "Illinois",
        "Syracuse",
        "Army",
        "Colorado",
        "UNLV",
        "Memphis",
    ],
}

# Backward-compatible alias (top 12 slice of published rankings)
HISTORICAL_CFP_RANKINGS: Dict[int, List[str]] = {
    year: teams[:12] for year, teams in HISTORICAL_CFP_TOP25.items()
}

# Actual 4-team playoff participants (2014–2023)
HISTORICAL_CFP_FOUR_TEAM: Dict[int, List[str]] = {
    2014: ["Alabama", "Oregon", "Florida State", "Ohio State"],
    2015: ["Clemson", "Alabama", "Michigan State", "Oklahoma"],
    2016: ["Alabama", "Clemson", "Ohio State", "Washington"],
    2017: ["Clemson", "Oklahoma", "Georgia", "Alabama"],
    2018: ["Clemson", "Alabama", "Notre Dame", "Oklahoma"],
    2019: ["LSU", "Ohio State", "Clemson", "Oklahoma"],
    2020: ["Alabama", "Clemson", "Ohio State", "Notre Dame"],
    2021: ["Alabama", "Michigan", "Georgia", "Cincinnati"],
    2022: ["Georgia", "Michigan", "TCU", "Ohio State"],
    2023: ["Michigan", "Washington", "Texas", "Alabama"],
}

# 12-team playoff participants by committee seed (2024 champion-bye era)
HISTORICAL_CFP_TWELVE_TEAM_FIELD: Dict[int, List[str]] = {
    2024: [
        "Oregon",
        "Georgia",
        "Boise State",
        "Arizona State",
        "Texas",
        "Penn State",
        "Notre Dame",
        "Ohio State",
        "Tennessee",
        "Indiana",
        "SMU",
        "Clemson",
    ],
}

# Conference champions receiving auto bids (2024)
HISTORICAL_CFP_AUTO_BIDS: Dict[int, List[str]] = {
    2024: ["Oregon", "Georgia", "Boise State", "Arizona State", "Clemson"],
}

# First / second team out of the field when documented
HISTORICAL_FIRST_TEAM_OUT: Dict[int, str] = {
    2014: "TCU",  # Baylor also debated; TCU highest-profile snub
    2024: "Alabama",
}

HISTORICAL_SECOND_TEAM_OUT: Dict[int, str] = {
    2024: "Miami",
}

# Case-study notes for validation reports
VALIDATION_NOTES: Dict[int, str] = {
    2014: "TCU/Baylor co-champions excluded; committee controversy",
    2017: "Alabama non-champion selected over Ohio State",
    2022: "Outlier year: low committee-formula agreement (TCU, Kansas State)",
    2023: "Florida State undefeated ACC champion ranked #4",
    2024: "First 12-team field; Clemson auto bid at rank #16; Alabama displaced",
}

OUTLIER_YEARS: frozenset[int] = frozenset({2022})


def historical_top25(year: int) -> Optional[List[str]]:
    return HISTORICAL_CFP_TOP25.get(year)


def historical_top12(year: int) -> Optional[List[str]]:
    teams = HISTORICAL_CFP_TOP25.get(year)
    return teams[:12] if teams else None


def historical_playoff_field(year: int) -> Optional[List[str]]:
    if year in HISTORICAL_CFP_FOUR_TEAM:
        return HISTORICAL_CFP_FOUR_TEAM[year]
    if year in HISTORICAL_CFP_TWELVE_TEAM_FIELD:
        return HISTORICAL_CFP_TWELVE_TEAM_FIELD[year]
    return None


def validation_note(year: int) -> str:
    return VALIDATION_NOTES.get(year, "")
