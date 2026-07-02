"""
Backtesting harness for CFP Selection Simulator.

This module provides functions to validate the ranking and selection model
against historical CFP committee decisions.
"""

from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from src.config.formats import get_format_for_year
from src.data.fetcher import fetch_season_games, get_api_key
from src.pipeline.composite import calculate_composite_rankings
from src.rankings.baseline import (
    HomeFieldBaseline,
    SimpleElo,
    SimpleSRS,
    calculate_baseline_rankings,
)
from src.selection.field import select_playoff_field
from src.selection.seeding import seed_playoff_teams

# Historical CFP final rankings (top 12 teams)
HISTORICAL_CFP_RANKINGS = {
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
}


def calculate_spearman_correlation(
    simulator_rankings: pd.DataFrame, cfp_rankings: List[str]
) -> Tuple[float, float]:
    """
    Calculate Spearman correlation between simulator and CFP rankings.

    Args:
        simulator_rankings: DataFrame with 'team' and 'rank' columns
        cfp_rankings: List of teams in CFP ranking order

    Returns:
        Tuple of (correlation coefficient, p-value)
    """
    common_teams = [team for team in cfp_rankings if team in simulator_rankings["team"].values]

    if len(common_teams) < 2:
        return None, None

    sim_ranks = []
    cfp_ranks = []

    for i, team in enumerate(common_teams):
        cfp_ranks.append(i + 1)
        sim_rank = simulator_rankings[simulator_rankings["team"] == team]["rank"].iloc[0]
        sim_ranks.append(sim_rank)

    correlation, p_value = spearmanr(sim_ranks, cfp_ranks)
    return correlation, p_value


def calculate_selection_accuracy(
    simulator_playoff_teams: List[str], cfp_playoff_teams: List[str]
) -> Dict[str, float]:
    """
    Calculate selection accuracy metrics.

    Args:
        simulator_playoff_teams: List of teams selected by simulator
        cfp_playoff_teams: List of teams selected by CFP committee

    Returns:
        Dictionary with accuracy metrics
    """
    simulator_set = set(simulator_playoff_teams)
    cfp_set = set(cfp_playoff_teams)

    correct = len(simulator_set & cfp_set)
    total = len(cfp_set)

    accuracy = correct / total if total > 0 else 0.0

    false_positives = len(simulator_set - cfp_set)
    false_negatives = len(cfp_set - simulator_set)

    return {
        "accuracy": accuracy,
        "correct_selections": correct,
        "total_selections": total,
        "false_positives": false_positives,
        "false_negatives": false_negatives,
    }


def calculate_seeding_accuracy(
    simulator_seeds: Dict[str, int], cfp_seeds: Dict[str, int]
) -> Dict[str, float]:
    """
    Calculate seeding accuracy metrics.

    Args:
        simulator_seeds: Dict mapping team -> seed (1-12)
        cfp_seeds: Dict mapping team -> seed (1-12)

    Returns:
        Dictionary with accuracy metrics
    """
    common_teams = set(simulator_seeds.keys()) & set(cfp_seeds.keys())

    if len(common_teams) == 0:
        return {"exact_match": 0.0, "within_one": 0.0, "mae": 0.0}

    exact_matches = 0
    within_one = 0
    errors = []

    for team in common_teams:
        sim_seed = simulator_seeds[team]
        cfp_seed = cfp_seeds[team]

        if sim_seed == cfp_seed:
            exact_matches += 1
        if abs(sim_seed - cfp_seed) <= 1:
            within_one += 1

        errors.append(abs(sim_seed - cfp_seed))

    return {
        "exact_match": exact_matches / len(common_teams),
        "within_one": within_one / len(common_teams),
        "mae": np.mean(errors),
        "rmse": np.sqrt(np.mean([e**2 for e in errors])),
    }


def calculate_prediction_metrics(
    games_df: pd.DataFrame, rankings_df: pd.DataFrame, method: str = "composite"
) -> Dict[str, float]:
    """
    Calculate prediction metrics (MAE, RMSE, Brier score) for game predictions.

    Args:
        games_df: DataFrame with game results
        rankings_df: DataFrame with team rankings/ratings
        method: 'composite', 'elo', 'srs', or 'home_field'

    Returns:
        Dictionary with prediction metrics
    """
    if method == "composite":
        # Use composite scores for predictions
        team_ratings = dict(zip(rankings_df["team"], rankings_df["composite_score"]))
        base_rating = rankings_df["composite_score"].mean()

        def predict_margin(home_team, away_team, is_neutral):
            home_rating = team_ratings.get(home_team, base_rating)
            away_rating = team_ratings.get(away_team, base_rating)
            hfa = 0 if is_neutral else 3.5
            return (home_rating - away_rating) * 20 + hfa  # Scale to points

    elif method == "elo":
        elo = SimpleElo()
        elo.process_season(games_df)

        def predict_margin(home_team, away_team, is_neutral):
            _, margin = elo.predict_game(home_team, away_team, is_neutral)
            return margin

    elif method == "srs":
        srs = SimpleSRS()
        srs.calculate_ratings(games_df)

        def predict_margin(home_team, away_team, is_neutral):
            _, margin = srs.predict_game(home_team, away_team, is_neutral)
            return margin

    elif method == "home_field":
        baseline = HomeFieldBaseline()

        def predict_margin(home_team, away_team, is_neutral):
            _, margin = baseline.predict_game(home_team, away_team, is_neutral)
            return margin

    else:
        raise ValueError(f"Unknown method: {method}")

    # Calculate metrics
    errors = []
    squared_errors = []
    brier_scores = []

    for _, game in games_df.iterrows():
        home_team = game["home_team"]
        away_team = game["away_team"]
        is_neutral = game.get("neutral_site", False)

        predicted_margin = predict_margin(home_team, away_team, is_neutral)
        actual_margin = game["home_score"] - game["away_score"]

        error = predicted_margin - actual_margin
        errors.append(abs(error))
        squared_errors.append(error**2)

        # Brier score: probability of home win
        # Convert margin to probability (logistic function)
        prob_home_win = 1 / (1 + np.exp(-predicted_margin / 7))
        actual_home_win = 1.0 if actual_margin > 0 else 0.0
        brier_scores.append((prob_home_win - actual_home_win) ** 2)

    return {
        "mae": np.mean(errors) if errors else 0.0,
        "rmse": np.sqrt(np.mean(squared_errors)) if squared_errors else 0.0,
        "brier_score": np.mean(brier_scores) if brier_scores else 0.0,
    }


def run_season_backtest(
    year: int,
    max_week: Optional[int] = None,
    start_week: int = 5,
    api_key: Optional[str] = None,
    include_baselines: bool = True,
) -> Dict:
    """
    Run backtest for a single season, optionally including baseline comparisons.

    Args:
        year: Season year
        max_week: Maximum week to include (None = all weeks)
        start_week: Starting week (default 5)
        api_key: API key (loaded from env if not provided)
        include_baselines: Whether to run baseline model comparisons

    Returns:
        Dictionary with validation metrics for composite and baseline models
    """
    print(f"\n{'='*80}")
    print(f"Running backtest for {year} season")
    print(f"{'='*80}")

    # Fetch games data
    if api_key is None:
        api_key = get_api_key()

    print(f"Fetching games data (weeks {start_week} to {max_week or 15})...")
    games_df = fetch_season_games(year, start_week=start_week, api_key=api_key)

    if max_week:
        games_df = games_df[games_df["week"] <= max_week]

    if len(games_df) == 0:
        print(f"⚠️  No games found for {year}")
        return {"error": "No games data"}

    print(f"✅ Loaded {len(games_df)} games")

    # Get historical CFP rankings
    if year not in HISTORICAL_CFP_RANKINGS:
        print(f"⚠️  No historical CFP data for {year}")
        return {"error": "No historical CFP data"}

    cfp_rankings = HISTORICAL_CFP_RANKINGS[year]
    cfp_playoff_teams = cfp_rankings[:12]  # Top 12 are playoff teams

    # Calculate composite rankings
    print("Calculating composite rankings...")
    composite_rankings = calculate_composite_rankings(games_df)
    print(f"✅ Calculated composite rankings for {len(composite_rankings)} teams")

    spearman_corr, spearman_p = calculate_spearman_correlation(composite_rankings, cfp_rankings)
    composite_top12 = composite_rankings.head(12)["team"].tolist()
    cfp_seeds = {team: i + 1 for i, team in enumerate(cfp_playoff_teams)}

    # Format-aware field selection and seeding (2024+)
    if year >= 2024:
        rankings_for_sel = composite_rankings.copy()
        if "conf_champ" not in rankings_for_sel.columns:
            rankings_for_sel["conf_champ"] = "No"
        if "conference" not in rankings_for_sel.columns:
            rankings_for_sel["conference"] = "Unknown"

        fmt = get_format_for_year(year)
        selection = select_playoff_field(rankings_for_sel, format_rules=fmt)
        seeded = seed_playoff_teams(selection.playoff_teams, selection.auto_bids, fmt)
        sim_playoff = [t["team"] for t in selection.playoff_teams]
        sim_seeds = dict(zip(seeded["team"], seeded["seed"]))
    else:
        sim_playoff = composite_top12
        sim_seeds = {team: i + 1 for i, team in enumerate(composite_top12)}

    selection_metrics = calculate_selection_accuracy(sim_playoff, cfp_playoff_teams)
    seeding_metrics = calculate_seeding_accuracy(sim_seeds, cfp_seeds)
    prediction_metrics = calculate_prediction_metrics(games_df, composite_rankings, "composite")

    # Compile composite results
    results = {
        "year": year,
        "n_games": len(games_df),
        "n_teams": len(composite_rankings),
        "composite": {
            "spearman_correlation": spearman_corr,
            "spearman_p_value": spearman_p,
            "selection_accuracy": selection_metrics["accuracy"],
            "correct_selections": selection_metrics["correct_selections"],
            "seeding_exact_match": seeding_metrics["exact_match"],
            "seeding_within_one": seeding_metrics["within_one"],
            "seeding_mae": seeding_metrics["mae"],
            "seeding_rmse": seeding_metrics["rmse"],
            "prediction_mae": prediction_metrics["mae"],
            "prediction_rmse": prediction_metrics["rmse"],
            "brier_score": prediction_metrics["brier_score"],
            "top_12": sim_playoff,
            "ruleset": get_format_for_year(year).name if year >= 2024 else "4_team_era",
        },
    }

    # Run baseline models if requested
    if include_baselines:
        print("\nCalculating baseline model rankings...")

        # Elo baseline
        print("  - Elo baseline...")
        elo_rankings = calculate_baseline_rankings(games_df, "elo")
        elo_spearman, _ = calculate_spearman_correlation(elo_rankings, cfp_rankings)
        elo_top12 = elo_rankings.head(12)["team"].tolist()
        elo_selection = calculate_selection_accuracy(elo_top12, cfp_playoff_teams)
        elo_seeds = {team: i + 1 for i, team in enumerate(elo_top12)}
        elo_seeding = calculate_seeding_accuracy(elo_seeds, cfp_seeds)
        elo_prediction = calculate_prediction_metrics(games_df, elo_rankings, "elo")

        results["elo"] = {
            "spearman_correlation": elo_spearman,
            "selection_accuracy": elo_selection["accuracy"],
            "seeding_exact_match": elo_seeding["exact_match"],
            "seeding_within_one": elo_seeding["within_one"],
            "seeding_mae": elo_seeding["mae"],
            "prediction_mae": elo_prediction["mae"],
            "prediction_rmse": elo_prediction["rmse"],
            "brier_score": elo_prediction["brier_score"],
        }

        # SRS baseline
        print("  - SRS baseline...")
        srs_rankings = calculate_baseline_rankings(games_df, "srs")
        srs_spearman, _ = calculate_spearman_correlation(srs_rankings, cfp_rankings)
        srs_top12 = srs_rankings.head(12)["team"].tolist()
        srs_selection = calculate_selection_accuracy(srs_top12, cfp_playoff_teams)
        srs_seeds = {team: i + 1 for i, team in enumerate(srs_top12)}
        srs_seeding = calculate_seeding_accuracy(srs_seeds, cfp_seeds)
        srs_prediction = calculate_prediction_metrics(games_df, srs_rankings, "srs")

        results["srs"] = {
            "spearman_correlation": srs_spearman,
            "selection_accuracy": srs_selection["accuracy"],
            "seeding_exact_match": srs_seeding["exact_match"],
            "seeding_within_one": srs_seeding["within_one"],
            "seeding_mae": srs_seeding["mae"],
            "prediction_mae": srs_prediction["mae"],
            "prediction_rmse": srs_prediction["rmse"],
            "brier_score": srs_prediction["brier_score"],
        }

        # Home field baseline
        print("  - Home field baseline...")
        home_rankings = calculate_baseline_rankings(games_df, "home_field")
        home_spearman, _ = calculate_spearman_correlation(home_rankings, cfp_rankings)
        home_top12 = home_rankings.head(12)["team"].tolist()
        home_selection = calculate_selection_accuracy(home_top12, cfp_playoff_teams)
        home_seeds = {team: i + 1 for i, team in enumerate(home_top12)}
        home_seeding = calculate_seeding_accuracy(home_seeds, cfp_seeds)
        home_prediction = calculate_prediction_metrics(games_df, home_rankings, "home_field")

        results["home_field"] = {
            "spearman_correlation": home_spearman,
            "selection_accuracy": home_selection["accuracy"],
            "seeding_exact_match": home_seeding["exact_match"],
            "seeding_within_one": home_seeding["within_one"],
            "seeding_mae": home_seeding["mae"],
            "prediction_mae": home_prediction["mae"],
            "prediction_rmse": home_prediction["rmse"],
            "brier_score": home_prediction["brier_score"],
        }

        print("✅ Baseline models calculated")

    # Print summary
    if spearman_corr is not None:
        print(f"\n✅ Composite Spearman correlation: {spearman_corr:.4f} (p={spearman_p:.4f})")
        print(f"✅ Composite Selection accuracy: {selection_metrics['accuracy']:.2%}")
        print(f"✅ Composite Seeding accuracy (±1): {seeding_metrics['within_one']:.2%}")

    return results


def run_multiple_seasons_backtest(
    years: List[int],
    start_week: int = 5,
    api_key: Optional[str] = None,
    include_baselines: bool = True,
) -> pd.DataFrame:
    """
    Run backtest for multiple seasons and return summary DataFrame.

    Args:
        years: List of years to backtest
        start_week: Starting week (default 5)
        api_key: API key (loaded from env if not provided)
        include_baselines: Whether to run baseline comparisons

    Returns:
        DataFrame with metrics for each season and model
    """
    all_results = []

    for year in years:
        try:
            results = run_season_backtest(
                year, start_week=start_week, api_key=api_key, include_baselines=include_baselines
            )
            if "error" not in results:
                all_results.append(results)
        except Exception as e:
            print(f"❌ Error backtesting {year}: {e}")
            continue

    if not all_results:
        return pd.DataFrame()

    # Flatten nested structure into rows
    flattened_results = []
    for result in all_results:
        year = result["year"]

        # Composite model
        comp = result.get("composite", {})
        flattened_results.append(
            {
                "year": year,
                "model": "composite",
                "spearman_correlation": comp.get("spearman_correlation"),
                "selection_accuracy": comp.get("selection_accuracy"),
                "seeding_exact_match": comp.get("seeding_exact_match"),
                "seeding_within_one": comp.get("seeding_within_one"),
                "seeding_mae": comp.get("seeding_mae"),
                "seeding_rmse": comp.get("seeding_rmse"),
                "prediction_mae": comp.get("prediction_mae"),
                "prediction_rmse": comp.get("prediction_rmse"),
                "brier_score": comp.get("brier_score"),
            }
        )

        # Baseline models
        if include_baselines:
            for model_name in ["elo", "srs", "home_field"]:
                baseline = result.get(model_name, {})
                if baseline:
                    flattened_results.append(
                        {
                            "year": year,
                            "model": model_name,
                            "spearman_correlation": baseline.get("spearman_correlation"),
                            "selection_accuracy": baseline.get("selection_accuracy"),
                            "seeding_exact_match": baseline.get("seeding_exact_match"),
                            "seeding_within_one": baseline.get("seeding_within_one"),
                            "seeding_mae": baseline.get("seeding_mae"),
                            "seeding_rmse": baseline.get("seeding_rmse", 0.0),
                            "prediction_mae": baseline.get("prediction_mae"),
                            "prediction_rmse": baseline.get("prediction_rmse"),
                            "brier_score": baseline.get("brier_score"),
                        }
                    )

    df = pd.DataFrame(flattened_results)

    # Calculate summary statistics
    if not df.empty:
        print(f"\n{'='*80}")
        print("BACKTEST SUMMARY")
        print(f"{'='*80}")
        print(f"Seasons tested: {df['year'].nunique()}")

        # Summary by model
        for model in df["model"].unique():
            model_df = df[df["model"] == model]
            print(f"\n{model.upper()} Model:")
            print(f"  Average Spearman correlation: {model_df['spearman_correlation'].mean():.4f}")
            print(f"  Average selection accuracy: {model_df['selection_accuracy'].mean():.2%}")
            print(f"  Average seeding accuracy (±1): {model_df['seeding_within_one'].mean():.2%}")
            print(f"  Average prediction MAE: {model_df['prediction_mae'].mean():.2f}")
            print(f"  Average Brier score: {model_df['brier_score'].mean():.4f}")

    return df
