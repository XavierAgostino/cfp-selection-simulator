"""
Baseline ranking models for comparison against composite model.

These are simple, well-established methods that serve as benchmarks:
- Home Field Baseline: Simple home team advantage
- Simple Elo: Basic Elo without MOV adjustments
- Simple SRS: Simple Rating System based on point differentials
"""

from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from scipy import linalg


class HomeFieldBaseline:
    """
    Simplest baseline: Home team wins by fixed margin (default 3-4 points).

    This represents the naive "always pick home team" strategy.
    """

    def __init__(self, home_advantage: float = 3.5):
        """
        Args:
            home_advantage: Points to add to home team score (default 3.5)
        """
        self.home_advantage = home_advantage

    def predict_game(
        self, home_team: str, away_team: str, is_neutral: bool = False
    ) -> Tuple[str, float]:
        """
        Predict game outcome.

        Returns:
            Tuple of (predicted_winner, predicted_margin)
        """
        if is_neutral:
            # Neutral site: pick team alphabetically (arbitrary tie-breaker)
            return (home_team if home_team < away_team else away_team, 0.0)
        else:
            return (home_team, self.home_advantage)

    def calculate_mae(self, games_df: pd.DataFrame) -> float:
        """
        Calculate Mean Absolute Error for game predictions.

        Args:
            games_df: DataFrame with game results

        Returns:
            Mean absolute error in points
        """
        errors = []
        for _, game in games_df.iterrows():
            predicted_winner, predicted_margin = self.predict_game(
                game["home_team"], game["away_team"], game.get("neutral_site", False)
            )

            actual_margin = game["home_score"] - game["away_score"]
            if predicted_winner != game["home_team"]:
                predicted_margin = -predicted_margin

            errors.append(abs(actual_margin - predicted_margin))

        return np.mean(errors) if errors else 0.0


class SimpleElo:
    """
    Basic Elo rating system without MOV multiplier.

    This is simpler than the full Elo implementation - no margin of victory
    adjustments, just basic win/loss updates.
    """

    def __init__(self, k_factor: int = 32, base_rating: float = 1500.0):
        """
        Args:
            k_factor: K-factor for rating updates (default 32)
            base_rating: Starting rating for all teams (default 1500)
        """
        self.k = k_factor
        self.base_rating = base_rating
        self.ratings = {}

    def initialize_ratings(self, teams: List[str]):
        """Initialize all teams to base rating."""
        self.ratings = {team: self.base_rating for team in teams}

    def expected_score(self, rating_a: float, rating_b: float) -> float:
        """Calculate expected score for team A."""
        return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))

    def update_game(
        self,
        home_team: str,
        away_team: str,
        home_score: int,
        away_score: int,
        is_neutral: bool = False,
    ):
        """Update ratings based on game result (no MOV adjustment)."""
        # Apply home field advantage (55 Elo points ≈ 3.75 points)
        hfa_bonus = 0 if is_neutral else 55
        home_rating = self.ratings[home_team] + hfa_bonus
        away_rating = self.ratings[away_team]

        home_expected = self.expected_score(home_rating, away_rating)

        # Actual score: 1 if home won, 0 if lost
        home_actual = 1.0 if home_score > away_score else 0.0

        # Update ratings
        self.ratings[home_team] += self.k * (home_actual - home_expected)
        self.ratings[away_team] += self.k * ((1 - home_actual) - (1 - home_expected))

    def process_season(self, games_df: pd.DataFrame) -> Dict[str, float]:
        """Process all games and return final ratings."""
        games_sorted = games_df.sort_values(["week", "date"]).copy()
        teams = sorted(
            set(games_sorted["home_team"].unique()) | set(games_sorted["away_team"].unique())
        )
        self.initialize_ratings(teams)

        for _, game in games_sorted.iterrows():
            is_neutral = game.get("neutral_site", False)
            self.update_game(
                game["home_team"],
                game["away_team"],
                game["home_score"],
                game["away_score"],
                is_neutral,
            )

        return self.ratings.copy()

    def predict_game(
        self, home_team: str, away_team: str, is_neutral: bool = False
    ) -> Tuple[str, float]:
        """
        Predict game outcome based on current ratings.

        Returns:
            Tuple of (predicted_winner, predicted_margin_in_points)
        """
        hfa_bonus = 0 if is_neutral else 55
        home_rating = self.ratings.get(home_team, self.base_rating) + hfa_bonus
        away_rating = self.ratings.get(away_team, self.base_rating)

        home_expected = self.expected_score(home_rating, away_rating)

        # Convert expected score to point margin (rough approximation)
        # Expected score of 0.5 = 0 point margin, 0.75 = ~14 point margin
        point_margin = (home_expected - 0.5) * 28  # Scale to ±14 points

        if home_expected > 0.5:
            return (home_team, point_margin)
        else:
            return (away_team, -point_margin)


class SimpleSRS:
    """
    Simple Rating System (SRS) - Average point differential adjusted for opponent strength.

    Solves: Rating[i] = AvgPointDiff[i] + AvgOpponentRating[i]
    This is a simplified version without iterative refinement.
    """

    def __init__(self):
        self.ratings = {}

    def calculate_ratings(self, games_df: pd.DataFrame) -> Dict[str, float]:
        """
        Calculate SRS ratings for all teams.

        Formula: Rating = Average Point Differential + Average Opponent Rating
        Solved as a system of linear equations.
        """
        teams = sorted(set(games_df["home_team"].unique()) | set(games_df["away_team"].unique()))
        n_teams = len(teams)
        team_idx = {team: i for i, team in enumerate(teams)}

        # Build system: R[i] = PD[i] + (1/n_opponents) * sum(R[opponents])
        # Rearranged: R[i] - (1/n_opponents) * sum(R[opponents]) = PD[i]

        A = np.zeros((n_teams, n_teams))
        b = np.zeros(n_teams)

        # Calculate point differentials and opponent counts
        point_diffs = {team: 0.0 for team in teams}
        opponent_counts = {team: 0 for team in teams}

        for _, game in games_df.iterrows():
            home_idx = team_idx[game["home_team"]]
            away_idx = team_idx[game["away_team"]]

            margin = game["home_score"] - game["away_score"]
            point_diffs[game["home_team"]] += margin
            point_diffs[game["away_team"]] -= margin
            opponent_counts[game["home_team"]] += 1
            opponent_counts[game["away_team"]] += 1

        # Build matrix system
        for i, team in enumerate(teams):
            # Diagonal: 1
            A[i, i] = 1.0

            # Find opponents and subtract their average rating
            team_games = games_df[(games_df["home_team"] == team) | (games_df["away_team"] == team)]

            if len(team_games) > 0:
                for _, game in team_games.iterrows():
                    if game["home_team"] == team:
                        opp_idx = team_idx[game["away_team"]]
                    else:
                        opp_idx = team_idx[game["home_team"]]

                    # Subtract (1/n_opponents) * R[opponent]
                    A[i, opp_idx] -= 1.0 / len(team_games)

            # Right-hand side: average point differential
            b[i] = point_diffs[team] / max(opponent_counts[team], 1)

        # Solve system
        try:
            ratings_array = linalg.solve(A, b)
            self.ratings = {teams[i]: ratings_array[i] for i in range(n_teams)}
        except Exception:
            # Fallback: use raw point differentials
            self.ratings = {
                team: point_diffs[team] / max(opponent_counts[team], 1) for team in teams
            }

        return self.ratings

    def predict_game(
        self, home_team: str, away_team: str, is_neutral: bool = False
    ) -> Tuple[str, float]:
        """
        Predict game outcome based on SRS ratings.

        Returns:
            Tuple of (predicted_winner, predicted_margin_in_points)
        """
        home_rating = self.ratings.get(home_team, 0.0)
        away_rating = self.ratings.get(away_team, 0.0)

        # Add home field advantage (3.5 points)
        if not is_neutral:
            home_rating += 3.5

        predicted_margin = home_rating - away_rating

        if predicted_margin > 0:
            return (home_team, predicted_margin)
        else:
            return (away_team, -predicted_margin)


def calculate_baseline_rankings(games_df: pd.DataFrame, method: str = "elo") -> pd.DataFrame:
    """
    Calculate rankings using a baseline method.

    Args:
        games_df: DataFrame with game results
        method: 'elo', 'srs', or 'home_field'

    Returns:
        DataFrame with 'team' and 'rating' columns, sorted by rating
    """
    teams = sorted(set(games_df["home_team"].unique()) | set(games_df["away_team"].unique()))

    if method == "elo":
        elo = SimpleElo()
        ratings = elo.process_season(games_df)
    elif method == "srs":
        srs = SimpleSRS()
        ratings = srs.calculate_ratings(games_df)
    elif method == "home_field":
        # Home field baseline doesn't produce ratings, use win percentage
        win_pcts = {}
        for team in teams:
            team_games = games_df[(games_df["home_team"] == team) | (games_df["away_team"] == team)]
            wins = 0
            total = 0
            for _, game in team_games.iterrows():
                if game["home_team"] == team:
                    wins += 1 if game["home_score"] > game["away_score"] else 0
                else:
                    wins += 1 if game["away_score"] > game["home_score"] else 0
                total += 1
            win_pcts[team] = wins / total if total > 0 else 0.0
        ratings = win_pcts
    else:
        raise ValueError(f"Unknown method: {method}")

    # Create DataFrame
    results = []
    for team in teams:
        results.append({"team": team, "rating": ratings.get(team, 0.0)})

    df = pd.DataFrame(results)
    df = df.sort_values("rating", ascending=False).reset_index(drop=True)
    df["rank"] = range(1, len(df) + 1)

    return df
