"""Era-correct CFP field selection validation."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import pandas as pd

from src.config.formats import PlayoffFormat, get_format_for_year
from src.pipeline.live import enrich_live_rankings
from src.selection.field import select_playoff_field
from src.selection.seeding import seed_playoff_teams
from src.validation.era import EraSpec, get_era_spec
from src.validation.historical import (
    HISTORICAL_CFP_AUTO_BIDS,
    HISTORICAL_FIRST_TEAM_OUT,
    historical_playoff_field,
)
from src.validation.metrics import bid_overlap, field_overlap


@dataclass
class SelectionValidationResult:
    year: int
    era: str
    ruleset: str
    rule_target: str
    field_overlap_label: str
    field_overlap_ratio: float
    correct_field_size: bool
    sim_field: List[str]
    ref_field: List[str]
    false_positives: List[str] = field(default_factory=list)
    false_negatives: List[str] = field(default_factory=list)
    auto_bids_label: Optional[str] = None
    at_large_label: Optional[str] = None
    first_team_out_match: Optional[bool] = None
    first_team_out_ref: Optional[str] = None
    first_team_out_sim: Optional[str] = None
    displacement_count: int = 0
    seeding_exact_match: Optional[float] = None
    seeding_within_one: Optional[float] = None
    notes: str = ""


def _simulate_four_team_field(rankings_df: pd.DataFrame) -> List[str]:
    return rankings_df.nsmallest(4, "rank")["team"].tolist()


def _simulate_twelve_team_field(
    rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
    year: int,
    fmt: PlayoffFormat,
    api_key: Optional[str],
) -> tuple[List[str], object]:
    enriched, _source = enrich_live_rankings(
        rankings_df.copy(),
        games_df,
        year=year,
        api_key=api_key,
    )
    selection = select_playoff_field(enriched, format_rules=fmt)
    field_teams = [t["team"] for t in selection.playoff_teams]
    return field_teams, selection


def validate_selection(
    year: int,
    rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
    *,
    api_key: Optional[str] = None,
) -> Optional[SelectionValidationResult]:
    """Validate simulated field against era-correct historical field."""
    ref_field = historical_playoff_field(year)
    if ref_field is None:
        return None

    era = get_era_spec(year)
    sim_field: List[str]
    selection = None

    if era.era == "four_team":
        sim_field = _simulate_four_team_field(rankings_df)
    else:
        fmt = get_format_for_year(year)
        sim_field, selection = _simulate_twelve_team_field(
            rankings_df, games_df, year, fmt, api_key
        )

    overlap = field_overlap(sim_field, ref_field)

    result = SelectionValidationResult(
        year=year,
        era=era.era,
        ruleset=era.ruleset,
        rule_target=era.rule_target,
        field_overlap_label=str(overlap["overlap_label"]),
        field_overlap_ratio=float(overlap["overlap_ratio"]),
        correct_field_size=len(sim_field) == era.field_size,
        sim_field=sim_field,
        ref_field=list(ref_field),
        false_positives=list(overlap["false_positives"]),
        false_negatives=list(overlap["false_negatives"]),
    )

    if selection is not None and year >= 2024:
        ref_auto = HISTORICAL_CFP_AUTO_BIDS.get(year, [])
        sim_auto = [t["team"] for t in selection.auto_bids]
        sim_at_large = [t["team"] for t in selection.at_large_bids]
        ref_at_large = [t for t in ref_field if t not in ref_auto]

        auto_metrics = bid_overlap(sim_auto, ref_auto)
        at_large_metrics = bid_overlap(sim_at_large, ref_at_large)
        result.auto_bids_label = str(auto_metrics["overlap_label"])
        result.at_large_label = str(at_large_metrics["overlap_label"])
        result.displacement_count = 1 if selection.champ_pulled_in else 0

        if selection.first_four_out:
            result.first_team_out_sim = selection.first_four_out[0]["team"]
        ref_first_out = HISTORICAL_FIRST_TEAM_OUT.get(year)
        if ref_first_out:
            result.first_team_out_ref = ref_first_out
            result.first_team_out_match = result.first_team_out_sim == ref_first_out

        ref_seeds = {team: i + 1 for i, team in enumerate(ref_field)}
        seeded = seed_playoff_teams(
            selection.playoff_teams, selection.auto_bids, get_format_for_year(year)
        )
        sim_seeds = dict(zip(seeded["team"], seeded["seed"]))
        from src.validation.metrics import calculate_seeding_accuracy

        seeding = calculate_seeding_accuracy(sim_seeds, ref_seeds)
        result.seeding_exact_match = seeding["exact_match"]
        result.seeding_within_one = seeding["within_one"]

    return result


def selection_result_to_row(result: SelectionValidationResult) -> Dict[str, object]:
    """Flat dict for CSV export."""
    return {
        "year": result.year,
        "era": result.era,
        "rule_target": result.rule_target,
        "ruleset": result.ruleset,
        "field_overlap": result.field_overlap_label,
        "field_overlap_ratio": result.field_overlap_ratio,
        "correct_field_size": result.correct_field_size,
        "auto_bids": result.auto_bids_label or "",
        "at_large": result.at_large_label or "",
        "first_team_out_ref": result.first_team_out_ref or "",
        "first_team_out_sim": result.first_team_out_sim or "",
        "first_team_out_match": result.first_team_out_match,
        "displacements": result.displacement_count,
        "seeding_exact_match": result.seeding_exact_match,
        "seeding_within_one": result.seeding_within_one,
        "false_positives": ";".join(result.false_positives),
        "false_negatives": ";".join(result.false_negatives),
        "notes": result.notes,
    }
