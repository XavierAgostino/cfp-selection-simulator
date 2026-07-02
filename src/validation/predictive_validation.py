"""Predictive validation: game outcome forecasting vs baselines."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Literal

import numpy as np
import pandas as pd

from src.rankings.baseline import (
    HomeFieldBaseline,
    SimpleElo,
    SimpleSRS,
    calculate_baseline_rankings,
)

PredictiveMethod = Literal["composite", "elo", "srs", "home_field"]


@dataclass
class PredictiveMetrics:
    year: int
    model: str
    brier_score: float
    win_accuracy: float
    margin_mae: float
    margin_rmse: float


def _predict_margin_factory(
    games_df: pd.DataFrame,
    rankings_df: pd.DataFrame,
    method: PredictiveMethod,
):
    if method == "composite":
        team_ratings = dict(zip(rankings_df["team"], rankings_df["composite_score"]))
        base_rating = float(rankings_df["composite_score"].mean())

        def predict_margin(home_team: str, away_team: str, is_neutral: bool) -> float:
            home_rating = team_ratings.get(home_team, base_rating)
            away_rating = team_ratings.get(away_team, base_rating)
            hfa = 0 if is_neutral else 3.5
            return (home_rating - away_rating) * 20 + hfa

        return predict_margin

    if method == "elo":
        elo = SimpleElo()
        elo.process_season(games_df)

        def predict_margin(home_team: str, away_team: str, is_neutral: bool) -> float:
            _, margin = elo.predict_game(home_team, away_team, is_neutral)
            return margin

        return predict_margin

    if method == "srs":
        srs = SimpleSRS()
        srs.calculate_ratings(games_df)

        def predict_margin(home_team: str, away_team: str, is_neutral: bool) -> float:
            _, margin = srs.predict_game(home_team, away_team, is_neutral)
            return margin

        return predict_margin

    if method == "home_field":
        baseline = HomeFieldBaseline()

        def predict_margin(home_team: str, away_team: str, is_neutral: bool) -> float:
            _, margin = baseline.predict_game(home_team, away_team, is_neutral)
            return margin

        return predict_margin

    raise ValueError(f"Unknown method: {method}")


def calculate_prediction_metrics(
    games_df: pd.DataFrame,
    rankings_df: pd.DataFrame,
    method: PredictiveMethod = "composite",
) -> Dict[str, float]:
    """Legacy dict return for backward compatibility."""
    metrics = evaluate_predictive(games_df, rankings_df, method=method, year=0)
    return {
        "mae": metrics.margin_mae,
        "rmse": metrics.margin_rmse,
        "brier_score": metrics.brier_score,
        "win_accuracy": metrics.win_accuracy,
    }


def evaluate_predictive(
    games_df: pd.DataFrame,
    rankings_df: pd.DataFrame,
    *,
    method: PredictiveMethod = "composite",
    year: int,
) -> PredictiveMetrics:
    """Compute predictive metrics for one model on one season."""
    predict_margin = _predict_margin_factory(games_df, rankings_df, method)

    errors: list[float] = []
    squared_errors: list[float] = []
    brier_scores: list[float] = []
    win_correct = 0
    win_total = 0

    for _, game in games_df.iterrows():
        home_team = game["home_team"]
        away_team = game["away_team"]
        is_neutral = bool(game.get("neutral_site", False))

        predicted_margin = predict_margin(home_team, away_team, is_neutral)
        actual_margin = int(game["home_score"]) - int(game["away_score"])

        error = predicted_margin - actual_margin
        errors.append(abs(error))
        squared_errors.append(error**2)

        prob_home_win = 1 / (1 + np.exp(-predicted_margin / 7))
        actual_home_win = 1.0 if actual_margin > 0 else 0.0
        brier_scores.append((prob_home_win - actual_home_win) ** 2)

        predicted_home_win = predicted_margin > 0
        actual_home_win_bool = actual_margin > 0
        if predicted_home_win == actual_home_win_bool:
            win_correct += 1
        win_total += 1

    return PredictiveMetrics(
        year=year,
        model=method,
        brier_score=float(np.mean(brier_scores)) if brier_scores else 0.0,
        win_accuracy=win_correct / win_total if win_total else 0.0,
        margin_mae=float(np.mean(errors)) if errors else 0.0,
        margin_rmse=float(np.sqrt(np.mean(squared_errors))) if squared_errors else 0.0,
    )


def evaluate_predictive_baselines(
    games_df: pd.DataFrame,
    composite_rankings: pd.DataFrame,
    year: int,
) -> list[PredictiveMetrics]:
    """Composite plus Elo/SRS/home-field baselines."""
    results = [
        evaluate_predictive(games_df, composite_rankings, method="composite", year=year),
    ]
    for method in ("elo", "srs", "home_field"):
        baseline_rankings = calculate_baseline_rankings(games_df, method)
        results.append(evaluate_predictive(games_df, baseline_rankings, method=method, year=year))
    return results
