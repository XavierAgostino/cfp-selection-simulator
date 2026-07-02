"""Composite ranking pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

from src.rankings.algorithms import ColleyMatrix, EloRatings, MasseyRatings
from src.utils.metrics import calculate_sor, calculate_sos


@dataclass
class RankingWeights:
    resume: float = 0.50
    predictive: float = 0.30
    sor: float = 0.10
    sos: float = 0.10

    def validate(self) -> None:
        total = self.resume + self.predictive + self.sor + self.sos
        if not np.isclose(total, 1.0, atol=0.01):
            raise ValueError(f"Ranking weights must sum to 1.0, got {total:.4f}")

    def __post_init__(self) -> None:
        self.validate()


def _win_percentages(games_df: pd.DataFrame, teams: List[str]) -> Dict[str, float]:
    win_pcts: Dict[str, float] = {}
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
    return win_pcts


def _get_team_record(games_df: pd.DataFrame, team: str) -> Dict[str, int]:
    tg = games_df[(games_df["home_team"] == team) | (games_df["away_team"] == team)]
    wins = ((tg["home_team"] == team) & (tg["home_score"] > tg["away_score"])).sum() + (
        (tg["away_team"] == team) & (tg["away_score"] > tg["home_score"])
    ).sum()
    return {"wins": int(wins), "losses": int(len(tg) - wins)}


def _get_opponent_records(games_df: pd.DataFrame, team: str):
    opponents: List[str] = []
    opponents_records: List[tuple[int, int]] = []
    opponents_opp_records: List[List[tuple[int, int]]] = []

    team_games = games_df[(games_df["home_team"] == team) | (games_df["away_team"] == team)]
    for _, game in team_games.iterrows():
        opp = game["away_team"] if game["home_team"] == team else game["home_team"]
        opponents.append(opp)

        opp_games = games_df[(games_df["home_team"] == opp) | (games_df["away_team"] == opp)]
        opp_w = 0
        for _, g in opp_games.iterrows():
            if (g["home_team"] == team and g["away_team"] == opp) or (
                g["home_team"] == opp and g["away_team"] == team
            ):
                continue
            if g["home_team"] == opp:
                opp_w += 1 if g["home_score"] > g["away_score"] else 0
            else:
                opp_w += 1 if g["away_score"] > g["home_score"] else 0
        opp_l = len(opp_games) - opp_w
        opponents_records.append((opp_w, opp_l))

        opp_opp_records: List[tuple[int, int]] = []
        for _, gg in opp_games.iterrows():
            opp_opp = gg["away_team"] if gg["home_team"] == opp else gg["home_team"]
            if opp_opp == team:
                continue
            if gg["home_team"] == opp:
                w = 1 if gg["home_score"] > gg["away_score"] else 0
            else:
                w = 1 if gg["away_score"] > gg["home_score"] else 0
            opp_opp_records.append((w, 1 - w))
        opponents_opp_records.append(opp_opp_records)

    return opponents, opponents_records, opponents_opp_records


def calculate_composite_rankings(
    games_df: pd.DataFrame,
    weights: Optional[RankingWeights] = None,
) -> pd.DataFrame:
    """
    Calculate composite rankings from game data.

    Combines resume (Colley + win%), predictive (Massey + Elo), SOR, and SOS
    into a single committee-style composite score.
    """
    w = weights or RankingWeights()
    w.validate()

    colley_ratings = ColleyMatrix(games_df).solve()
    massey_ratings = MasseyRatings(games_df).solve()
    elo_ratings = EloRatings().process_season(games_df)

    teams = sorted(set(games_df["home_team"].unique()) | set(games_df["away_team"].unique()))
    win_pcts = _win_percentages(games_df, teams)

    scaler = MinMaxScaler()
    colley_norm = scaler.fit_transform(
        np.array([[colley_ratings.get(t, 0)] for t in teams])
    ).flatten()
    massey_norm = scaler.fit_transform(
        np.array([[massey_ratings.get(t, 0)] for t in teams])
    ).flatten()
    elo_norm = scaler.fit_transform(np.array([[elo_ratings.get(t, 0)] for t in teams])).flatten()
    win_pct_norm = np.array([win_pcts.get(t, 0) for t in teams])

    resume_scores = {
        teams[i]: float(0.6 * colley_norm[i] + 0.4 * win_pct_norm[i]) for i in range(len(teams))
    }
    predictive_scores = {
        teams[i]: float(0.5 * massey_norm[i] + 0.5 * elo_norm[i]) for i in range(len(teams))
    }

    provisional_scores = {
        t: float(0.50 * resume_scores[t] + 0.30 * predictive_scores[t]) for t in teams
    }
    prov_norm = scaler.fit_transform(np.array([[provisional_scores[t]] for t in teams])).flatten()
    opponent_rating_lookup = {teams[i]: prov_norm[i] for i in range(len(teams))}

    sor_scores: Dict[str, float] = {}
    sos_scores: Dict[str, float] = {}
    for team in teams:
        opponents, opp_records, opp_opp_records = _get_opponent_records(games_df, team)
        opp_ratings = [opponent_rating_lookup.get(o, 0.5) for o in opponents]
        sor_scores[team] = calculate_sor(_get_team_record(games_df, team), opp_ratings)
        sos_scores[team] = calculate_sos(
            opp_records, opp_opp_records, include_oor=True, oor_weight=0.33
        )

    resume_norm = scaler.fit_transform(np.array([[resume_scores[t]] for t in teams])).flatten()
    predictive_norm = scaler.fit_transform(
        np.array([[predictive_scores[t]] for t in teams])
    ).flatten()
    sor_norm = scaler.fit_transform(np.array([[sor_scores[t]] for t in teams])).flatten()
    sos_norm = scaler.fit_transform(np.array([[sos_scores[t]] for t in teams])).flatten()

    results = []
    for i, team in enumerate(teams):
        composite = (
            w.resume * resume_norm[i]
            + w.predictive * predictive_norm[i]
            + w.sor * sor_norm[i]
            + w.sos * sos_norm[i]
        )
        results.append(
            {
                "team": team,
                "composite_score": composite,
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
