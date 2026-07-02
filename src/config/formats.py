"""
CFP playoff format definitions by season.

Official sources:
- 2024 12-team format: https://www.collegefootballplayoff.com/sports/2024/2/28/format.aspx
- 2025-26 seeding update: top four overall ranked teams receive byes; straight seeding
  by final committee ranking (five highest-ranked conference champions still guaranteed).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

SeedingMode = Literal["champion_byes", "straight"]
ByeRule = Literal["top_4_conference_champions", "top_4_overall"]

FORMAT_2024 = "2024"
FORMAT_2025_PLUS = "2025_plus"


@dataclass(frozen=True)
class PlayoffFormat:
    """CFP 12-team playoff format rules for a given era."""

    name: str
    auto_bids: int = 5
    at_large: int = 7
    seeding: SeedingMode = "straight"
    bye_rule: ByeRule = "top_4_overall"

    @property
    def total_teams(self) -> int:
        return self.auto_bids + self.at_large


FORMATS: dict[str, PlayoffFormat] = {
    FORMAT_2024: PlayoffFormat(
        name=FORMAT_2024,
        auto_bids=5,
        at_large=7,
        seeding="champion_byes",
        bye_rule="top_4_conference_champions",
    ),
    FORMAT_2025_PLUS: PlayoffFormat(
        name=FORMAT_2025_PLUS,
        auto_bids=5,
        at_large=7,
        seeding="straight",
        bye_rule="top_4_overall",
    ),
}


def get_format_for_year(year: int) -> PlayoffFormat:
    """
    Resolve the CFP playoff format for a given season year.

    2024: first 12-team field; top four conference champions receive byes.
    2025+: straight seeding by final ranking; top four overall receive byes.
    """
    if year <= 2023:
        raise ValueError(
            f"Year {year} used the 4-team CFP (2014-2023). "
            "12-team format rules apply from 2024 onward."
        )
    if year == 2024:
        return FORMATS[FORMAT_2024]
    return FORMATS[FORMAT_2025_PLUS]
