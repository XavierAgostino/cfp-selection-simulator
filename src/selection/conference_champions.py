"""
Conference champion determination with waterfall tiebreakers and CCG simulation.

Ports the notebook waterfall protocol into production code. When CFBD conference
records identify a single leader, that team is labeled. When multiple teams tie
at the top of conference standings, we apply pool H2H / conference SOS logic and
optionally simulate a championship game between the top two seeds.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

from src.config.conferences import CFP_CONFERENCES, INDEPENDENT_CONFERENCES, team_conference_map


def _eligible_conference(conf: str) -> bool:
    return (
        conf in CFP_CONFERENCES
        and conf not in INDEPENDENT_CONFERENCES
        and conf not in {"Pac-12", "Unknown"}
    )


def conference_record(
    team: str,
    conference: str,
    games_df: pd.DataFrame,
    conf_map: Dict[str, str],
) -> Tuple[int, int, float, List[str]]:
    """Conference wins, losses, win pct, and list of conference opponents played."""
    if "home_score" not in games_df.columns or "away_score" not in games_df.columns:
        return 0, 0, 0.0, []

    wins = 0
    losses = 0
    opponents: List[str] = []

    team_games = games_df[
        (games_df["home_team"] == team) | (games_df["away_team"] == team)
    ]
    for _, game in team_games.iterrows():
        opp = game["away_team"] if game["home_team"] == team else game["home_team"]
        if conf_map.get(opp) != conference:
            continue
        opponents.append(str(opp))
        home_won = int(game["home_score"]) > int(game["away_score"])
        if game["home_team"] == team:
            wins += 1 if home_won else 0
            losses += 0 if home_won else 1
        else:
            wins += 0 if home_won else 1
            losses += 1 if home_won else 0

    total = wins + losses
    pct = wins / total if total else 0.0
    return wins, losses, pct, opponents


def pool_record(
    team: str,
    pool_teams: List[str],
    games_df: pd.DataFrame,
    conf_opponents: List[str],
) -> Tuple[float, int, int]:
    """Record within a tied pool (round-robin among pool members)."""
    pool_set = set(pool_teams)
    pool_wins = 0
    pool_games = 0

    for opp in conf_opponents:
        if opp not in pool_set or opp == team:
            continue
        matchups = games_df[
            ((games_df["home_team"] == team) & (games_df["away_team"] == opp))
            | ((games_df["home_team"] == opp) & (games_df["away_team"] == team))
        ]
        for _, game in matchups.iterrows():
            pool_games += 1
            home_won = int(game["home_score"]) > int(game["away_score"])
            if game["home_team"] == team and home_won:
                pool_wins += 1
            elif game["away_team"] == team and not home_won:
                pool_wins += 1

    pct = pool_wins / pool_games if pool_games else 0.0
    return pct, pool_games, pool_wins


def conference_sos(
    team: str,
    conf_opponents: List[str],
    team_records: Dict[str, Dict[str, int]],
) -> float:
    """Conference opponents' cumulative win percentage."""
    total_wins = 0
    total_games = 0
    for opp in conf_opponents:
        rec = team_records.get(opp)
        if not rec:
            continue
        total_wins += rec["wins"]
        total_games += rec["wins"] + rec["losses"]
    return total_wins / total_games if total_games else 0.0


def resolve_conference_seeds(
    teams: List[Dict[str, Any]],
    games_df: pd.DataFrame,
    team_opponents: Dict[str, List[str]],
    team_records: Dict[str, Dict[str, int]],
) -> List[Dict[str, Any]]:
    """
    Return top two teams in a conference using waterfall tiebreakers.

    Balanced pool: pool win pct, then conference SOS, then composite rank.
    Unbalanced pool (>2 teams, unequal pool games): skip H2H, use SOS first.
    Sweeper (beat everyone in pool): automatic top seed.
    """
    df = pd.DataFrame(teams).sort_values("win_pct", ascending=False)
    final_order: List[Dict[str, Any]] = []

    for _, group in df.groupby("win_pct", sort=False):
        if len(final_order) >= 2:
            break

        group_teams = group.to_dict("records")
        if len(group_teams) == 1:
            final_order.append(group_teams[0])
            continue

        pool_names = [t["team"] for t in group_teams]
        for entry in group_teams:
            pct, games, wins = pool_record(
                entry["team"], pool_names, games_df, team_opponents.get(entry["team"], [])
            )
            entry["pool_pct"] = pct
            entry["pool_games"] = games
            entry["pool_wins"] = wins
            entry["conf_sos"] = conference_sos(
                entry["team"], team_opponents.get(entry["team"], []), team_records
            )

        game_counts = [t["pool_games"] for t in group_teams]
        is_balanced = len(set(game_counts)) == 1 and game_counts[0] > 0

        sweeper: Optional[str] = None
        for entry in group_teams:
            if entry["pool_wins"] == len(group_teams) - 1 and entry["pool_games"] > 0:
                sweeper = entry["team"]
                break

        if sweeper:
            sorted_group = sorted(
                group_teams, key=lambda x: (x["team"] != sweeper, -x["conf_sos"])
            )
        elif is_balanced:
            sorted_group = sorted(
                group_teams,
                key=lambda x: (-x["pool_pct"], -x["conf_sos"], x["rank"]),
            )
        else:
            sorted_group = sorted(
                group_teams,
                key=lambda x: (-x["conf_sos"], -x["pool_pct"], x["rank"]),
            )

        final_order.extend(sorted_group)

    return final_order[:2]


def simulate_championship_game(
    team_a: Dict[str, Any],
    team_b: Dict[str, Any],
    *,
    upset_threshold: float = 0.0,
) -> str:
    """
    Pick a conference champion from the top two seeds using predictive scores.

    Lower-ranked seed can win when predictive scores are within upset_threshold.
    """
    spread = team_a.get("predictive", 0.5) - team_b.get("predictive", 0.5)
    if spread > upset_threshold:
        return team_a["team"]
    if spread < -upset_threshold:
        return team_b["team"]
    return team_b["team"] if team_b["rank"] < team_a["rank"] else team_a["team"]


def champions_from_games(
    rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
    *,
    simulate_ccg: bool = True,
) -> Dict[str, str]:
    """
    Determine one champion per eligible conference from game results.

    Returns mapping of team name -> ``Yes (Conference)`` label.
    """
    conf_map = team_conference_map(games_df)
    rank_lookup = dict(zip(rankings_df["team"], rankings_df["rank"]))
    predictive_lookup = dict(
        zip(rankings_df["team"], rankings_df.get("predictive_score", pd.Series(dtype=float)))
    )

    champions: Dict[str, str] = {}
    conferences = sorted({c for c in conf_map.values() if _eligible_conference(c)})

    for conf in conferences:
        conf_teams = [t for t, c in conf_map.items() if c == conf and t in rank_lookup]
        if not conf_teams:
            continue

        team_opponents: Dict[str, List[str]] = {}
        team_records: Dict[str, Dict[str, int]] = {}
        conf_data: List[Dict[str, Any]] = []

        for team in conf_teams:
            wins, losses, pct, opps = conference_record(team, conf, games_df, conf_map)
            if wins + losses == 0:
                continue
            entry = {
                "team": team,
                "conference": conf,
                "wins": wins,
                "losses": losses,
                "win_pct": pct,
                "rank": int(rank_lookup[team]),
                "predictive": float(predictive_lookup.get(team, 0.5) or 0.5),
            }
            conf_data.append(entry)
            team_opponents[team] = opps
            team_records[team] = {"wins": wins, "losses": losses}

        if not conf_data:
            continue

        top_two = resolve_conference_seeds(
            conf_data, games_df, team_opponents, team_records
        )
        if not top_two:
            continue

        if simulate_ccg and len(top_two) == 2:
            winner = simulate_championship_game(top_two[0], top_two[1])
        else:
            winner = top_two[0]["team"]

        champions[winner] = f"Yes ({conf})"

    return champions


def resolve_tied_record_leaders(
    tied_teams: List[str],
    conference: str,
    rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
) -> str:
    """Break a tie among CFBD conference-record co-leaders."""
    conf_map = team_conference_map(games_df)
    rank_lookup = dict(zip(rankings_df["team"], rankings_df["rank"]))
    predictive_lookup = dict(
        zip(rankings_df["team"], rankings_df.get("predictive_score", pd.Series(dtype=float)))
    )

    conf_data: List[Dict[str, Any]] = []
    team_opponents: Dict[str, List[str]] = {}
    team_records: Dict[str, Dict[str, int]] = {}

    for team in tied_teams:
        if team not in rank_lookup:
            continue
        wins, losses, pct, opps = conference_record(team, conference, games_df, conf_map)
        entry = {
            "team": team,
            "conference": conference,
            "wins": wins,
            "losses": losses,
            "win_pct": pct,
            "rank": int(rank_lookup[team]),
            "predictive": float(predictive_lookup.get(team, 0.5) or 0.5),
        }
        conf_data.append(entry)
        team_opponents[team] = opps
        team_records[team] = {"wins": wins, "losses": losses}

    if not conf_data:
        return tied_teams[0]

    top_two = resolve_conference_seeds(conf_data, games_df, team_opponents, team_records)
    if len(top_two) >= 2:
        return simulate_championship_game(top_two[0], top_two[1])
    return top_two[0]["team"]


def champions_from_ccg_games(ccg_df: pd.DataFrame) -> Dict[str, str]:
    """
    Map conference championship game winners to auto-bid labels.

    Uses the winner's conference from game metadata. Skips ineligible leagues.
    """
    if ccg_df.empty:
        return {}

    champions: Dict[str, str] = {}
    for _, game in ccg_df.iterrows():
        home_score = int(game["home_score"])
        away_score = int(game["away_score"])
        if home_score == away_score:
            continue

        if home_score > away_score:
            winner = str(game["home_team"])
            conf = str(game.get("home_conference") or "")
        else:
            winner = str(game["away_team"])
            conf = str(game.get("away_conference") or "")

        if not _eligible_conference(conf):
            continue
        champions[winner] = f"Yes ({conf})"

    return champions


def conference_leaders_with_tiebreaks(
    records: List[Dict[str, Any]],
    rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
) -> Dict[str, str]:
    """
    Label champions from CFBD records, resolving co-leaders with waterfall logic.
    """
    grouped: Dict[str, List[Tuple[float, int, int, str]]] = {}
    for row in records:
        conf = row.get("conference")
        team = row.get("team")
        if not conf or not team or not _eligible_conference(str(conf)):
            continue
        conf_games = row.get("conferenceGames") or {}
        games = int(conf_games.get("games") or 0)
        if games <= 0:
            continue
        wins = int(conf_games.get("wins") or 0)
        losses = int(conf_games.get("losses") or 0)
        pct = wins / games if games else 0.0
        total = row.get("total") or {}
        total_wins = int(total.get("wins") or 0)
        grouped.setdefault(str(conf), []).append((pct, wins, total_wins, str(team)))

    leaders: Dict[str, str] = {}
    for conf, entries in grouped.items():
        entries.sort(key=lambda item: (-item[0], -item[1], -item[2]))
        best_pct = entries[0][0]
        tied = [team for pct, _, _, team in entries if pct == best_pct]
        if len(tied) == 1:
            leaders[tied[0]] = f"Yes ({conf})"
        else:
            winner = resolve_tied_record_leaders(tied, conf, rankings_df, games_df)
            leaders[winner] = f"Yes ({conf})"

    return leaders


def apply_champion_labels(
    rankings_df: pd.DataFrame,
    champion_map: Dict[str, str],
) -> pd.DataFrame:
    """Attach champion labels; independents never receive auto-bid champion status."""
    df = rankings_df.copy()
    df["conf_champ"] = df["team"].map(champion_map).fillna("No")
    if "conference" in df.columns:
        independent_mask = df["conference"].isin(INDEPENDENT_CONFERENCES)
        df.loc[independent_mask, "conf_champ"] = "No"
    return df
