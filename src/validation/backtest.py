"""Orchestrate era-aware validation across seasons."""

from __future__ import annotations

from typing import List, Literal, Optional

import pandas as pd

from src.data.fetcher import fetch_season_games, get_api_key
from src.pipeline.composite import calculate_composite_rankings
from src.validation.committee_validation import validate_committee_replication
from src.validation.era import ValidationTarget, get_era_spec, has_historical_rankings

# Re-export historical fixtures for backward compatibility
from src.validation.historical import HISTORICAL_CFP_RANKINGS  # noqa: F401
from src.validation.metrics import (  # noqa: F401
    calculate_seeding_accuracy,
    calculate_selection_accuracy,
    calculate_spearman_correlation,
)
from src.validation.predictive_validation import calculate_prediction_metrics  # noqa: F401
from src.validation.predictive_validation import evaluate_predictive_baselines
from src.validation.reports import print_validation_summary, write_validation_outputs
from src.validation.selection_validation import validate_selection


def run_season_validation(
    year: int,
    *,
    target: ValidationTarget = "all",
    start_week: int = 1,
    max_week: Optional[int] = 15,
    api_key: Optional[str] = None,
    verbose: bool = True,
) -> dict:
    """Run selected validation tracks for one season."""
    if not has_historical_rankings(year):
        return {"year": year, "error": "No historical CFP data"}

    key = api_key or get_api_key()
    if verbose:
        era = get_era_spec(year)
        print(f"\n{'=' * 80}")
        print(f"Validating {year} ({era.era}, target: {era.rule_target})")
        print(f"{'=' * 80}")

    games_df = fetch_season_games(year, start_week=start_week, api_key=key)
    if max_week is not None:
        games_df = games_df[games_df["week"] <= max_week]
    if games_df.empty:
        return {"year": year, "error": "No games data"}

    if verbose:
        print(f"Loaded {len(games_df)} games")

    rankings_df = calculate_composite_rankings(games_df)
    if verbose:
        print(f"Ranked {len(rankings_df)} teams")

    result: dict = {"year": year, "n_games": len(games_df), "n_teams": len(rankings_df)}

    if target in ("all", "committee"):
        committee = validate_committee_replication(year, rankings_df)
        if committee:
            result["committee"] = committee
            if verbose and committee.spearman_top12 is not None:
                print(
                    f"  Committee: top-12 Spearman {committee.spearman_top12:.4f}, "
                    f"top-12 overlap {committee.top12_overlap_label}"
                )

    if target in ("all", "selection"):
        selection = validate_selection(year, rankings_df, games_df, api_key=key)
        if selection:
            result["selection"] = selection
            if verbose:
                print(
                    f"  Selection: field overlap {selection.field_overlap_label} "
                    f"({selection.rule_target})"
                )

    if target in ("all", "predictive"):
        predictive = evaluate_predictive_baselines(games_df, rankings_df, year)
        result["predictive"] = predictive
        if verbose:
            composite = next(p for p in predictive if p.model == "composite")
            print(
                f"  Predictive: Brier {composite.brier_score:.4f}, "
                f"win acc {composite.win_accuracy:.1%}"
            )

    return result


def run_era_validation(
    years: List[int],
    *,
    target: ValidationTarget = "all",
    start_week: int = 1,
    max_week: Optional[int] = 15,
    api_key: Optional[str] = None,
    output_dir: Optional[str] = None,
) -> pd.DataFrame:
    """
    Run era-aware validation and write CSV/Markdown outputs.

    Returns a flattened selection validation DataFrame (primary KPI table).
    """
    from pathlib import Path

    committee_results = []
    selection_results = []
    predictive_results = []

    for year in years:
        try:
            season = run_season_validation(
                year,
                target=target,
                start_week=start_week,
                max_week=max_week,
                api_key=api_key,
            )
        except Exception as exc:
            print(f"Error validating {year}: {exc}")
            continue

        if "error" in season:
            print(f"Skipped {year}: {season['error']}")
            continue

        if "committee" in season:
            committee_results.append(season["committee"])
        if "selection" in season:
            selection_results.append(season["selection"])
        if "predictive" in season:
            predictive_results.extend(season["predictive"])

    out_dir = Path(output_dir) if output_dir else Path("data/output/validation")
    paths = write_validation_outputs(
        out_dir,
        committee=committee_results,
        selection=selection_results,
        predictive=predictive_results,
        years=years,
        target=target,
    )

    print_validation_summary(committee_results, selection_results, predictive_results)
    print(f"\nValidation outputs written to {out_dir}/")
    for name, path in paths.items():
        print(f"  {name}: {path.name}")

    if selection_results:
        from src.validation.selection_validation import selection_result_to_row

        return pd.DataFrame([selection_result_to_row(r) for r in selection_results])
    if committee_results:
        from src.validation.committee_validation import committee_result_to_row

        return pd.DataFrame([committee_result_to_row(r) for r in committee_results])
    return pd.DataFrame()
