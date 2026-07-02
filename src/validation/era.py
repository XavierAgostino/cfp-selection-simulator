"""Map seasons to era-appropriate validation targets."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

ValidationTarget = Literal["committee", "selection", "predictive", "all"]

EraKind = Literal["four_team", "twelve_team_2024", "twelve_team_2025_plus", "unknown"]


@dataclass(frozen=True)
class EraSpec:
    """Validation configuration for a CFP season."""

    year: int
    era: EraKind
    field_size: int
    ruleset: str
    rule_target: str
    seeding_mode: Optional[str] = None


def get_era_spec(year: int) -> EraSpec:
    """Resolve era-correct validation target for a season year."""
    if year <= 2023:
        return EraSpec(
            year=year,
            era="four_team",
            field_size=4,
            ruleset="four_team_cfp",
            rule_target="Top 4",
            seeding_mode=None,
        )
    if year == 2024:
        return EraSpec(
            year=year,
            era="twelve_team_2024",
            field_size=12,
            ruleset="2024",
            rule_target="5+7 champion-byes",
            seeding_mode="champion_byes",
        )
    return EraSpec(
        year=year,
        era="twelve_team_2025_plus",
        field_size=12,
        ruleset="2025_plus",
        rule_target="5+7 straight seeding",
        seeding_mode="straight",
    )


def has_historical_field(year: int) -> bool:
    """True when we have a documented committee field for validation."""
    from src.validation.historical import (
        HISTORICAL_CFP_FOUR_TEAM,
        HISTORICAL_CFP_TWELVE_TEAM_FIELD,
    )

    return year in HISTORICAL_CFP_FOUR_TEAM or year in HISTORICAL_CFP_TWELVE_TEAM_FIELD


def has_historical_rankings(year: int) -> bool:
    from src.validation.historical import HISTORICAL_CFP_TOP25

    return year in HISTORICAL_CFP_TOP25
