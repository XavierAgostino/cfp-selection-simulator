"""
Committee-style tiebreakers for comparable teams.

Order (per CFP protocol and project research):
1. Head-to-head
2. Common opponents
3. Strength of schedule
4. Strength of record
5. Composite score
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import pandas as pd


def _team_won_game(game: pd.Series, team: str) -> bool:
    if game["home_team"] == team:
        return int(game["home_score"]) > int(game["away_score"])
    return int(game["away_score"]) > int(game["home_score"])


def head_to_head_winner(
    team_a: str,
    team_b: str,
    games_df: pd.DataFrame,
) -> Optional[str]:
    """Return the winner of a direct matchup, or None if no game exists."""
    matchups = games_df[
        ((games_df["home_team"] == team_a) & (games_df["away_team"] == team_b))
        | ((games_df["home_team"] == team_b) & (games_df["away_team"] == team_a))
    ]
    if matchups.empty:
        return None

    wins: Dict[str, int] = {team_a: 0, team_b: 0}
    for _, game in matchups.iterrows():
        if _team_won_game(game, team_a):
            wins[team_a] += 1
        elif _team_won_game(game, team_b):
            wins[team_b] += 1

    if wins[team_a] > wins[team_b]:
        return team_a
    if wins[team_b] > wins[team_a]:
        return team_b
    return None


def common_opponents_win_pct(
    team: str,
    opponents: List[str],
    games_df: pd.DataFrame,
) -> float:
    """Win percentage against a set of common opponents."""
    wins = 0
    games = 0
    for opp in opponents:
        matchups = games_df[
            ((games_df["home_team"] == team) & (games_df["away_team"] == opp))
            | ((games_df["home_team"] == opp) & (games_df["away_team"] == team))
        ]
        for _, game in matchups.iterrows():
            games += 1
            if _team_won_game(game, team):
                wins += 1
    return wins / games if games else 0.0


def common_opponents_comparison(
    team_a: str,
    team_b: str,
    games_df: pd.DataFrame,
) -> Optional[str]:
    """
    Compare teams by record vs common opponents.

    Returns the team with the better win percentage, or None if inconclusive.
    """
    opps_a = set()
    opps_b = set()
    for _, game in games_df.iterrows():
        if game["home_team"] == team_a:
            opps_a.add(game["away_team"])
        elif game["away_team"] == team_a:
            opps_a.add(game["home_team"])
        if game["home_team"] == team_b:
            opps_b.add(game["away_team"])
        elif game["away_team"] == team_b:
            opps_b.add(game["home_team"])

    common = (opps_a & opps_b) - {team_a, team_b}
    if not common:
        return None

    pct_a = common_opponents_win_pct(team_a, sorted(common), games_df)
    pct_b = common_opponents_win_pct(team_b, sorted(common), games_df)
    if pct_a > pct_b:
        return team_a
    if pct_b > pct_a:
        return team_b
    return None


def apply_tiebreaker(
    team_a: Dict,
    team_b: Dict,
    games_df: pd.DataFrame,
    sos_ranks: Dict[str, int],
    sor_ranks: Dict[str, int],
    tolerance: float = 0.01,
) -> Tuple[str, str]:
    """
    Apply committee-style tie-breaker logic between two teams.

    Returns (winning team name, reason string).
    """
    team_a_name = team_a["team"]
    team_b_name = team_b["team"]
    score_diff = abs(team_a["composite_score"] - team_b["composite_score"])

    if score_diff >= tolerance:
        winner = (
            team_a_name if team_a["composite_score"] > team_b["composite_score"] else team_b_name
        )
        return winner, f"Composite score difference ({score_diff:.3f})"

    h2h = head_to_head_winner(team_a_name, team_b_name, games_df)
    if h2h is not None:
        return h2h, f"Head-to-head: {h2h} defeated opponent"

    common = common_opponents_comparison(team_a_name, team_b_name, games_df)
    if common is not None:
        return common, f"Common opponents: {common} had better record"

    sos_a = sos_ranks.get(team_a_name, 999)
    sos_b = sos_ranks.get(team_b_name, 999)
    if sos_a != sos_b:
        winner = team_a_name if sos_a < sos_b else team_b_name
        return (
            winner,
            f"Strength of schedule (SOS rank {min(sos_a, sos_b)} vs {max(sos_a, sos_b)})",
        )

    sor_a = sor_ranks.get(team_a_name, 999)
    sor_b = sor_ranks.get(team_b_name, 999)
    if sor_a != sor_b:
        winner = team_a_name if sor_a < sor_b else team_b_name
        return (
            winner,
            f"Strength of record (SOR rank {min(sor_a, sor_b)} vs {max(sor_a, sor_b)})",
        )

    winner = team_a_name if team_a["composite_score"] >= team_b["composite_score"] else team_b_name
    return winner, "Composite score (marginal difference)"


def _metric_ranks(df: pd.DataFrame) -> Tuple[Dict[str, int], Dict[str, int]]:
    sos_order = df.sort_values("sos", ascending=False).reset_index(drop=True)
    sos_ranks = {row["team"]: i + 1 for i, row in sos_order.iterrows()}
    sor_order = df.sort_values("sor", ascending=True).reset_index(drop=True)
    sor_ranks = {row["team"]: i + 1 for i, row in sor_order.iterrows()}
    return sos_ranks, sor_ranks


def sort_tie_group(
    teams: List[Dict],
    games_df: pd.DataFrame,
    sos_ranks: Dict[str, int],
    sor_ranks: Dict[str, int],
) -> List[Dict]:
    """Sort a group of comparable teams using pairwise tiebreakers."""
    ordered = list(teams)
    changed = True
    while changed:
        changed = False
        for i in range(len(ordered) - 1):
            winner, _ = apply_tiebreaker(
                ordered[i],
                ordered[i + 1],
                games_df,
                sos_ranks,
                sor_ranks,
                tolerance=float("inf"),
            )
            if winner == ordered[i + 1]["team"]:
                ordered[i], ordered[i + 1] = ordered[i + 1], ordered[i]
                changed = True
    return ordered


def resolve_rank_ties(
    rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
    tolerance: float = 0.01,
) -> pd.DataFrame:
    """
    Re-order teams with near-identical composite scores using committee tiebreakers.
    """
    df = rankings_df.sort_values("composite_score", ascending=False).reset_index(drop=True)
    if df.empty:
        return df

    sos_ranks, sor_ranks = _metric_ranks(df)
    rows: List[Dict] = df.to_dict("records")
    resolved: List[Dict] = []
    idx = 0

    while idx < len(rows):
        group = [rows[idx]]
        j = idx + 1
        while (
            j < len(rows)
            and abs(rows[idx]["composite_score"] - rows[j]["composite_score"]) < tolerance
        ):
            group.append(rows[j])
            j += 1

        if len(group) > 1:
            group = sort_tie_group(group, games_df, sos_ranks, sor_ranks)
        resolved.extend(group)
        idx = j

    out = pd.DataFrame(resolved)
    out["rank"] = range(1, len(out) + 1)
    return out
