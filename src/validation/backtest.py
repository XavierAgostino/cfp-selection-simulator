"""
Backtesting harness for CFP Selection Simulator.

This module provides functions to validate the ranking and selection model
against historical CFP committee decisions.
"""

# Import existing modules
import sys
from pathlib import Path
from pathlib import Path as PathLib
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import linalg
from scipy.stats import spearmanr
from sklearn.preprocessing import MinMaxScaler

sys.path.insert(0, str(PathLib(__file__).parent.parent.parent))

from src.data.fetcher import fetch_season_games, get_api_key
from src.playoff.bracket import select_playoff_field
from src.rankings.baseline import (
    HomeFieldBaseline,
    SimpleElo,
    SimpleSRS,
    calculate_baseline_rankings,
)
from src.utils.metrics import calculate_sor, calculate_sos

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


class ColleyMatrix:
    """Colley Matrix ranking implementation."""

    def __init__(self, games_df: pd.DataFrame):
        self.games = games_df.copy()
        self.teams = sorted(
            set(games_df["home_team"].unique()) | set(games_df["away_team"].unique())
        )
        self.n_teams = len(self.teams)
        self.team_idx = {team: i for i, team in enumerate(self.teams)}
        self.ratings = {}

    def build_system(self):
        """Build Colley matrix C and vector b."""
        C = np.zeros((self.n_teams, self.n_teams))
        b = np.ones(self.n_teams)

        wins = {team: 0 for team in self.teams}
        losses = {team: 0 for team in self.teams}

        for _, game in self.games.iterrows():
            home_idx = self.team_idx[game["home_team"]]
            away_idx = self.team_idx[game["away_team"]]

            C[home_idx, home_idx] += 1
            C[away_idx, away_idx] += 1
            C[home_idx, away_idx] -= 1
            C[away_idx, home_idx] -= 1

            if game["home_score"] > game["away_score"]:
                wins[game["home_team"]] += 1
                losses[game["away_team"]] += 1
            else:
                wins[game["away_team"]] += 1
                losses[game["home_team"]] += 1

        np.fill_diagonal(C, C.diagonal() + 2)

        for i, team in enumerate(self.teams):
            b[i] = 1 + 0.5 * (wins[team] - losses[team])

        return C, b

    def solve(self):
        """Solve Cr = b for ratings."""
        C, b = self.build_system()
        try:
            ratings = linalg.solve(C, b)
            self.ratings = {self.teams[i]: ratings[i] for i in range(self.n_teams)}
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
        self.ratings = {}

    def apply_adjustments(self):
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
        C = np.zeros((self.n_teams, self.n_teams))
        p = np.zeros(self.n_teams)

        for _, game in self.games.iterrows():
            home_idx = self.team_idx[game["home_team"]]
            away_idx = self.team_idx[game["away_team"]]
            margin = game["adj_margin"]

            C[home_idx, home_idx] += 1
            C[away_idx, away_idx] += 1
            C[home_idx, away_idx] -= 1
            C[away_idx, home_idx] -= 1

            p[home_idx] += margin
            p[away_idx] -= margin

        np.fill_diagonal(C, C.diagonal() + 2)
        return C, p

    def solve(self):
        """Solve Cr = p for ratings."""
        C, p = self.build_system()
        try:
            ratings = linalg.solve(C, p)
            self.ratings = {self.teams[i]: ratings[i] for i in range(self.n_teams)}
            return self.ratings
        except Exception as e:
            print(f"Error solving Massey system: {e}")
            return {}


class EloRatings:
    """Elo rating system implementation."""

    def __init__(
        self, k_factor: int = 85, hfa_points: float = 3.75, mov_scale: int = 17, mov_cap: int = 28
    ):
        self.k = k_factor
        self.hfa_points = hfa_points
        self.mov_scale = mov_scale
        self.mov_cap = mov_cap
        self.ratings = {}

    def initialize_ratings(self, teams: List[str], base_rating: float = 1505.0):
        """Initialize all teams to base rating."""
        self.ratings = {team: base_rating for team in teams}

    def expected_score(self, rating_a: float, rating_b: float) -> float:
        """Calculate expected score for team A."""
        return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))

    def mov_multiplier(self, score_diff: float, is_neutral: bool) -> float:
        """Calculate MOV-adjusted score."""
        hfa_adjusted_diff = score_diff - (0 if is_neutral else self.hfa_points)
        hfa_adjusted_diff = np.clip(hfa_adjusted_diff, -self.mov_cap, self.mov_cap)
        s_adj = 1 / (1 + 10 ** (-hfa_adjusted_diff / self.mov_scale))
        return s_adj

    def update_game(
        self, home_team: str, away_team: str, home_score: int, away_score: int, is_neutral: bool
    ):
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

    def process_season(self, games_df: pd.DataFrame):
        """Process all games in chronological order."""
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

        return self.ratings


def calculate_composite_rankings(games_df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate composite rankings from games data.

    This is a simplified version that runs the full ranking pipeline.
    """
    # Calculate component rankings
    colley = ColleyMatrix(games_df)
    colley_ratings = colley.solve()

    massey = MasseyRatings(games_df)
    massey_ratings = massey.solve()

    elo = EloRatings()
    elo_ratings = elo.process_season(games_df)

    # Calculate win percentages
    teams = sorted(set(games_df["home_team"].unique()) | set(games_df["away_team"].unique()))
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

    # Normalize all components
    scaler = MinMaxScaler()

    colley_values = np.array([[colley_ratings.get(t, 0)] for t in teams])
    massey_values = np.array([[massey_ratings.get(t, 0)] for t in teams])
    elo_values = np.array([[elo_ratings.get(t, 0)] for t in teams])
    win_pct_values = np.array([[win_pcts.get(t, 0)] for t in teams])

    colley_norm = scaler.fit_transform(colley_values).flatten()
    massey_norm = scaler.fit_transform(massey_values).flatten()
    elo_norm = scaler.fit_transform(elo_values).flatten()
    win_pct_norm = win_pct_values.flatten()  # Already 0-1, ensure 1-D

    # Calculate resume and predictive scores
    resume_scores = {
        teams[i]: float(0.6 * colley_norm[i] + 0.4 * win_pct_norm[i]) for i in range(len(teams))
    }
    predictive_scores = {
        teams[i]: float(0.5 * massey_norm[i] + 0.5 * elo_norm[i]) for i in range(len(teams))
    }

    # ---- Full SOR/SOS implementation ----
    # First, build a provisional composite (resume + predictive only) to rate opponents on 0-1 scale
    # Updated weights: 50% resume, 30% predictive (matches CFP emphasis on wins/losses)
    provisional_scores = {}
    for team in teams:
        provisional_scores[team] = float(
            0.50 * resume_scores[team] + 0.30 * predictive_scores[team]
        )

    # Normalize provisional scores to 0-1 for opponent ratings
    scaler_provisional = MinMaxScaler()
    prov_vals = np.array([[provisional_scores[t]] for t in teams])
    prov_norm = scaler_provisional.fit_transform(prov_vals).flatten()
    opponent_rating_lookup = {teams[i]: prov_norm[i] for i in range(len(teams))}

    # Helper to compute team record
    def get_team_record(team: str) -> Dict[str, int]:
        tg = games_df[(games_df["home_team"] == team) | (games_df["away_team"] == team)]
        wins = ((tg["home_team"] == team) & (tg["home_score"] > tg["away_score"])).sum() + (
            (tg["away_team"] == team) & (tg["away_score"] > tg["home_score"])
        ).sum()
        losses = len(tg) - wins
        return {"wins": int(wins), "losses": int(losses)}

    # Build opponent records (excluding head-to-head to avoid circular dependency)
    def get_opponent_records(team: str):
        opponents = []
        opponents_records = []
        opponents_opp_records = []

        team_games = games_df[(games_df["home_team"] == team) | (games_df["away_team"] == team)]
        for _, game in team_games.iterrows():
            opp = game["away_team"] if game["home_team"] == team else game["home_team"]
            opponents.append(opp)

            # Opponent record excluding the game vs this team
            opp_games = games_df[(games_df["home_team"] == opp) | (games_df["away_team"] == opp)]
            opp_w = 0
            opp_l = 0
            for _, g in opp_games.iterrows():
                if (g["home_team"] == team and g["away_team"] == opp) or (
                    g["home_team"] == opp and g["away_team"] == team
                ):
                    continue  # exclude head-to-head
                if g["home_team"] == opp:
                    opp_w += 1 if g["home_score"] > g["away_score"] else 0
                else:
                    opp_w += 1 if g["away_score"] > g["home_score"] else 0
            opp_l = len(opp_games) - opp_w
            opponents_records.append((opp_w, opp_l))

            # Opponent's opponents records (exclude this team when opp is playing)
            opp_opp_records = []
            for _, gg in opp_games.iterrows():
                opp_opp = gg["away_team"] if gg["home_team"] == opp else gg["home_team"]
                if opp_opp == team:
                    continue
                if gg["home_team"] == opp:
                    w = 1 if gg["home_score"] > gg["away_score"] else 0
                    l = 1 - w
                else:
                    w = 1 if gg["away_score"] > gg["home_score"] else 0
                    l = 1 - w
                opp_opp_records.append((w, l))
            opponents_opp_records.append(opp_opp_records)

        return opponents, opponents_records, opponents_opp_records

    # Calculate SOR and SOS
    sor_scores = {}
    sos_scores = {}
    for team in teams:
        opponents, opp_records, opp_opp_records = get_opponent_records(team)

        # Opponent ratings for SOR
        opp_ratings = [opponent_rating_lookup.get(o, 0.5) for o in opponents]
        sor_scores[team] = calculate_sor(get_team_record(team), opp_ratings)

        # SOS using opponent and opponent's opponent records
        sos_scores[team] = calculate_sos(
            opp_records, opp_opp_records, include_oor=True, oor_weight=0.33
        )

    # Normalize all components
    scaler = MinMaxScaler()
    resume_arr = np.array([[resume_scores[t]] for t in teams])
    predictive_arr = np.array([[predictive_scores[t]] for t in teams])
    sor_arr = np.array([[sor_scores[t]] for t in teams])
    sos_arr = np.array([[sos_scores[t]] for t in teams])

    resume_norm = scaler.fit_transform(resume_arr).flatten()
    predictive_norm = scaler.fit_transform(predictive_arr).flatten()
    sor_norm = scaler.fit_transform(sor_arr).flatten()  # higher sor_score = better
    sos_norm = scaler.fit_transform(sos_arr).flatten()  # higher sos_score = tougher

    # Calculate composite score with updated weights
    # Updated: 50% resume, 30% predictive, 10% SOR, 10% SOS
    # This better reflects CFP committee's emphasis on wins/losses over predictive power
    composite_scores = {}
    for i, team in enumerate(teams):
        composite_scores[team] = (
            0.50 * resume_norm[i]
            + 0.30 * predictive_norm[i]
            + 0.10 * sor_norm[i]
            + 0.10 * sos_norm[i]
        )

    # Create DataFrame
    results = []
    for i, team in enumerate(teams):
        results.append(
            {
                "team": team,
                "composite_score": composite_scores[team],
                "resume_score": resume_scores[team],
                "predictive_score": predictive_scores[team],
                "sor": sor_scores[team],
                "sos": sos_scores[team],
                "colley_rating": colley_ratings.get(team, 0),
                "massey_rating": massey_ratings.get(team, 0),
                "elo_rating": elo_ratings.get(team, 0),
                "win_pct": win_pcts[team],
            }
        )

    df = pd.DataFrame(results)
    df = df.sort_values("composite_score", ascending=False).reset_index(drop=True)
    df["rank"] = range(1, len(df) + 1)

    return df


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

    # Calculate metrics for composite model
    spearman_corr, spearman_p = calculate_spearman_correlation(composite_rankings, cfp_rankings)
    composite_top12 = composite_rankings.head(12)["team"].tolist()
    selection_metrics = calculate_selection_accuracy(composite_top12, cfp_playoff_teams)
    composite_seeds = {team: i + 1 for i, team in enumerate(composite_top12)}
    cfp_seeds = {team: i + 1 for i, team in enumerate(cfp_playoff_teams)}
    seeding_metrics = calculate_seeding_accuracy(composite_seeds, cfp_seeds)
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
            "top_12": composite_top12,
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
