"""Colley, Massey, and Elo ranking algorithm implementations."""

from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd
from scipy import linalg


class ColleyMatrix:
    """Colley Matrix ranking implementation."""

    def __init__(self, games_df: pd.DataFrame):
        self.games = games_df.copy()
        self.teams = sorted(
            set(games_df["home_team"].unique()) | set(games_df["away_team"].unique())
        )
        self.n_teams = len(self.teams)
        self.team_idx = {team: i for i, team in enumerate(self.teams)}
        self.ratings: Dict[str, float] = {}

    def build_system(self):
        """Build Colley matrix C and vector b."""
        c = np.zeros((self.n_teams, self.n_teams))
        b = np.ones(self.n_teams)

        wins = {team: 0 for team in self.teams}
        losses = {team: 0 for team in self.teams}

        for _, game in self.games.iterrows():
            home_idx = self.team_idx[game["home_team"]]
            away_idx = self.team_idx[game["away_team"]]

            c[home_idx, home_idx] += 1
            c[away_idx, away_idx] += 1
            c[home_idx, away_idx] -= 1
            c[away_idx, home_idx] -= 1

            if game["home_score"] > game["away_score"]:
                wins[game["home_team"]] += 1
                losses[game["away_team"]] += 1
            else:
                wins[game["away_team"]] += 1
                losses[game["home_team"]] += 1

        np.fill_diagonal(c, c.diagonal() + 2)

        for i, team in enumerate(self.teams):
            b[i] = 1 + 0.5 * (wins[team] - losses[team])

        return c, b

    def solve(self) -> Dict[str, float]:
        """Solve Cr = b for ratings."""
        c, b = self.build_system()
        try:
            ratings = linalg.solve(c, b)
            self.ratings = {self.teams[i]: float(ratings[i]) for i in range(self.n_teams)}
            return self.ratings
        except Exception as e:
            print(f"Error solving Colley system: {e}")
            return {}


class MasseyRatings:
    """Massey Ratings implementation (Colleyized version)."""

    def __init__(self, games_df: pd.DataFrame, mov_cap: int = 28, hfa: float = 3.75):
        self.games = games_df.copy()
        self.mov_cap = mov_cap
        self.hfa = hfa
        self.teams = sorted(
            set(games_df["home_team"].unique()) | set(games_df["away_team"].unique())
        )
        self.n_teams = len(self.teams)
        self.team_idx = {team: i for i, team in enumerate(self.teams)}
        self.ratings: Dict[str, float] = {}

    def apply_adjustments(self) -> None:
        """Apply HFA and MOV cap."""
        adjusted_margins = []
        for _, game in self.games.iterrows():
            margin = game["home_score"] - game["away_score"]
            if not game.get("neutral_site", False):
                margin -= self.hfa
            capped_margin = np.clip(margin, -self.mov_cap, self.mov_cap)
            adjusted_margins.append(capped_margin)
        self.games["adj_margin"] = adjusted_margins

    def build_system(self):
        """Build Colleyized Massey system: Cr = p."""
        self.apply_adjustments()
        c = np.zeros((self.n_teams, self.n_teams))
        p = np.zeros(self.n_teams)

        for _, game in self.games.iterrows():
            home_idx = self.team_idx[game["home_team"]]
            away_idx = self.team_idx[game["away_team"]]
            margin = game["adj_margin"]

            c[home_idx, home_idx] += 1
            c[away_idx, away_idx] += 1
            c[home_idx, away_idx] -= 1
            c[away_idx, home_idx] -= 1

            p[home_idx] += margin
            p[away_idx] -= margin

        np.fill_diagonal(c, c.diagonal() + 2)
        return c, p

    def solve(self) -> Dict[str, float]:
        """Solve Cr = p for ratings."""
        c, p = self.build_system()
        try:
            ratings = linalg.solve(c, p)
            self.ratings = {self.teams[i]: float(ratings[i]) for i in range(self.n_teams)}
            return self.ratings
        except Exception as e:
            print(f"Error solving Massey system: {e}")
            return {}


class EloRatings:
    """Elo rating system implementation."""

    def __init__(
        self,
        k_factor: int = 85,
        hfa_points: float = 3.75,
        mov_scale: int = 17,
        mov_cap: int = 28,
    ):
        self.k = k_factor
        self.hfa_points = hfa_points
        self.mov_scale = mov_scale
        self.mov_cap = mov_cap
        self.ratings: Dict[str, float] = {}

    def initialize_ratings(self, teams: List[str], base_rating: float = 1505.0) -> None:
        """Initialize all teams to base rating."""
        self.ratings = {team: base_rating for team in teams}

    def expected_score(self, rating_a: float, rating_b: float) -> float:
        """Calculate expected score for team A."""
        return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))

    def mov_multiplier(self, score_diff: float, is_neutral: bool) -> float:
        """Calculate MOV-adjusted score."""
        hfa_adjusted_diff = score_diff - (0 if is_neutral else self.hfa_points)
        hfa_adjusted_diff = np.clip(hfa_adjusted_diff, -self.mov_cap, self.mov_cap)
        return 1 / (1 + 10 ** (-hfa_adjusted_diff / self.mov_scale))

    def update_game(
        self,
        home_team: str,
        away_team: str,
        home_score: int,
        away_score: int,
        is_neutral: bool,
    ) -> None:
        """Update ratings based on game result."""
        hfa_bonus = 0 if is_neutral else 55
        home_rating = self.ratings[home_team] + hfa_bonus
        away_rating = self.ratings[away_team]

        home_expected = self.expected_score(home_rating, away_rating)
        score_diff = home_score - away_score
        s_adj = self.mov_multiplier(score_diff, is_neutral)

        if score_diff > 0:
            home_actual = s_adj
            away_actual = 1 - s_adj
        else:
            home_actual = 1 - s_adj
            away_actual = s_adj

        self.ratings[home_team] += self.k * (home_actual - home_expected)
        self.ratings[away_team] += self.k * (away_actual - (1 - home_expected))

    def process_season(self, games_df: pd.DataFrame) -> Dict[str, float]:
        """Process all games in chronological order."""
        games_sorted = games_df.sort_values(["week", "date"]).copy()
        teams = sorted(
            set(games_sorted["home_team"].unique()) | set(games_sorted["away_team"].unique())
        )
        self.initialize_ratings(teams)

        for _, game in games_sorted.iterrows():
            is_neutral = bool(game.get("neutral_site", False))
            self.update_game(
                game["home_team"],
                game["away_team"],
                int(game["home_score"]),
                int(game["away_score"]),
                is_neutral,
            )

        return self.ratings
