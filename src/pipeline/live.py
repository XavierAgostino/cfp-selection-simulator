"""Live CFBD data enrichment: FBS filtering, conferences, champion labels."""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

from src.config.conferences import CFP_CONFERENCES, team_conference_map
from src.data.fetcher import (
    fetch_conference_championship_games,
    fetch_team_records,
    get_fbs_teams_list,
)
from src.selection.conference_champions import (
    apply_champion_labels,
    champions_from_ccg_games,
    champions_from_games,
    conference_leaders_with_tiebreaks,
)


def filter_games_to_fbs(
    games_df: pd.DataFrame,
    year: int,
    api_key: Optional[str] = None,
    fbs_teams: Optional[Set[str]] = None,
) -> pd.DataFrame:
    """Keep only games where both teams are FBS."""
    if games_df.empty:
        return games_df
    teams = fbs_teams or get_fbs_teams_list(year, api_key)
    mask = games_df["home_team"].isin(teams) & games_df["away_team"].isin(teams)
    return games_df[mask].copy()


def conference_leaders_from_records(records: List[Dict[str, Any]]) -> Dict[str, str]:
    """
    Map team name -> conf_champ label using CFBD conference-record leaders.

    Picks the team with the best conference win percentage in each CFP-eligible
    league. Ties break on total conference wins, then overall wins.

    For co-leaders at the top, use ``conference_leaders_with_tiebreaks`` instead.
    """
    grouped: Dict[str, List[Tuple[float, int, int, str]]] = defaultdict(list)
    for row in records:
        conf = row.get("conference")
        team = row.get("team")
        if not conf or not team or str(conf) not in CFP_CONFERENCES:
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
        grouped[str(conf)].append((pct, wins, total_wins, str(team)))

    leaders: Dict[str, str] = {}
    for conf, entries in grouped.items():
        entries.sort(key=lambda item: (-item[0], -item[1], -item[2]))
        leader_team = entries[0][3]
        leaders[leader_team] = f"Yes ({conf})"
    return leaders


def fetch_conference_leaders(
    year: int,
    api_key: Optional[str] = None,
) -> Dict[str, str]:
    """Fetch CFBD records and return conference-record leaders."""
    records = fetch_team_records(year, api_key=api_key)
    return conference_leaders_from_records(records)


def infer_conference_champions(
    rankings_df: pd.DataFrame,
    games_df: Optional[pd.DataFrame] = None,
) -> pd.DataFrame:
    """
    Label conference champions from game results and waterfall tiebreakers.

    Falls back to highest composite-ranked team per conference when games are
    unavailable (legacy behavior).
    """
    if games_df is not None and not games_df.empty:
        champion_map = champions_from_games(rankings_df, games_df)
        df = apply_champion_labels(rankings_df, champion_map)
        conf_map = team_conference_map(games_df)
        if "conference" in df.columns:
            df["conference"] = df["team"].map(conf_map).fillna(df["conference"])
        else:
            df["conference"] = df["team"].map(conf_map).fillna("Unknown")
        return df

    df = rankings_df.copy()
    if "conf_champ" not in df.columns:
        df["conf_champ"] = "No"
    if "conference" not in df.columns:
        df["conference"] = "Unknown"

    df["conf_champ"] = "No"
    for conf in sorted(df["conference"].dropna().unique()):
        conf_label = str(conf)
        if conf_label not in CFP_CONFERENCES and conf_label != "Unknown":
            continue
        conf_teams = df[df["conference"] == conf_label].sort_values("rank")
        if conf_teams.empty:
            continue
        champ_team = conf_teams.iloc[0]["team"]
        df.loc[df["team"] == champ_team, "conf_champ"] = f"Yes ({conf_label})"
    return df


def _records_have_coleaders(records: List[Dict[str, Any]]) -> bool:
    """True when any conference has multiple teams tied for the best conf record."""
    grouped: Dict[str, List[float]] = defaultdict(list)
    for row in records:
        conf = row.get("conference")
        if not conf:
            continue
        cg = row.get("conferenceGames") or {}
        games = int(cg.get("games") or 0)
        if games <= 0:
            continue
        pct = int(cg.get("wins") or 0) / games
        grouped[str(conf)].append(pct)

    for pcts in grouped.values():
        if not pcts:
            continue
        best = max(pcts)
        if sum(1 for pct in pcts if pct == best) > 1:
            return True
    return False


def enrich_live_rankings(
    rankings_df: pd.DataFrame,
    games_df: pd.DataFrame,
    *,
    year: Optional[int] = None,
    api_key: Optional[str] = None,
) -> tuple[pd.DataFrame, str]:
    """
    Attach conference metadata and champion labels for live pipeline runs.

    Returns (enriched_df, champion_source) where champion_source is one of:
    ``cfbd_ccg``, ``cfbd_records``, ``cfbd_records_tiebreak``, or ``games_waterfall``.
    """
    df = rankings_df.copy()
    conf_map = team_conference_map(games_df)
    df["conference"] = df["team"].map(conf_map).fillna("Unknown")

    if year is not None:
        try:
            ccg_df = fetch_conference_championship_games(year, api_key=api_key)
            ccg_champions = champions_from_ccg_games(ccg_df)
            if ccg_champions:
                return apply_champion_labels(df, ccg_champions), "cfbd_ccg"
        except Exception:
            pass

        try:
            records = fetch_team_records(year, api_key=api_key)
            if records:
                leaders = conference_leaders_with_tiebreaks(records, df, games_df)
                if leaders:
                    source = (
                        "cfbd_records_tiebreak"
                        if _records_have_coleaders(records)
                        else "cfbd_records"
                    )
                    return apply_champion_labels(df, leaders), source
        except Exception:
            pass

    return infer_conference_champions(df, games_df), "games_waterfall"
