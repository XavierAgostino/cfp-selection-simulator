"""CFBD PPA data for the component-substitution experiment (v2.3, research-only).

Per-team PPA scores are aggregated from CFBD ``/ppa/games`` over regular-season
weeks 1-15 — the same selection-time game window the ranking pipeline uses — so
the substituted predictive component never sees postseason results. The
season-aggregate ``/ppa/teams`` endpoint is deliberately not used: it ignores
week bounds and folds bowl/playoff results into its averages, which would leak
future information into selection-time rankings.

Everything here is optional and research-only. Nothing in the production
pipeline or the default ``sroom calibrate`` run imports this module's network
path; PPA data is fetched only when the substitution experiment is explicitly
requested (``--include-ppa``), and responses are cached under
``data/cache/cfbd/{year}/`` alongside the game data.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd

from src.data.fetcher import _get_with_retry, get_api_key
from src.pipeline.cache_paths import DATA_CACHE

PPA_GAMES_URL = "https://api.collegefootballdata.com/ppa/games"
THROUGH_WEEK = 15  # selection-time window; matches the games pipeline cutoff


def ppa_cache_path(year: int, through_week: int = THROUGH_WEEK) -> Path:
    """Canonical cache path for raw /ppa/games responses (mirrors games cache)."""
    return DATA_CACHE / "cfbd" / str(year) / f"ppa_games_w{through_week}.json"


def fetch_season_ppa_games(year: int, *, api_key: Optional[str] = None) -> List[dict]:
    """Fetch raw per-game team PPA rows for a season from CFBD /ppa/games."""
    key = api_key or get_api_key()
    headers = {"Authorization": f"Bearer {key}", "accept": "application/json"}
    response = _get_with_retry(PPA_GAMES_URL, headers=headers, params={"year": year}, timeout=60)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, list):
        raise ValueError(f"Unexpected CFBD /ppa/games response for {year}")
    return payload


def load_season_ppa_games(
    year: int, *, api_key: Optional[str] = None, allow_network: bool = True
) -> List[dict]:
    """Cache-first load of raw per-game PPA rows for a season."""
    path = ppa_cache_path(year)
    if path.exists():
        return json.loads(path.read_text())
    if not allow_network:
        raise FileNotFoundError(f"No cached PPA data at {path} and network fetch is disabled")
    rows = fetch_season_ppa_games(year, api_key=api_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows))
    return rows


def ppa_scores_from_games(
    rows: List[dict], *, through_week: int = THROUGH_WEEK
) -> Dict[str, float]:
    """Per-team PPA score: mean offensive PPA minus mean defensive PPA per game.

    Only regular-season games through ``through_week`` count; postseason rows
    and games with missing overall PPA are dropped, never imputed.
    """
    offense: Dict[str, List[float]] = {}
    defense: Dict[str, List[float]] = {}
    for row in rows:
        if row.get("seasonType") != "regular":
            continue
        week = row.get("week")
        if not isinstance(week, int) or week > through_week:
            continue
        team = row.get("team")
        off = (row.get("offense") or {}).get("overall")
        dfn = (row.get("defense") or {}).get("overall")
        if not team or off is None or dfn is None:
            continue
        offense.setdefault(team, []).append(float(off))
        defense.setdefault(team, []).append(float(dfn))
    return {
        team: sum(offense[team]) / len(offense[team]) - sum(defense[team]) / len(defense[team])
        for team in offense
    }


def load_season_ppa_scores(
    year: int, *, api_key: Optional[str] = None, allow_network: bool = True
) -> Dict[str, float]:
    """Per-team PPA scores for a season (cache-first; see ppa_scores_from_games)."""
    rows = load_season_ppa_games(year, api_key=api_key, allow_network=allow_network)
    return ppa_scores_from_games(rows)


def apply_ppa_substitution(
    base_rankings_df: pd.DataFrame,
    ppa_scores: Optional[Dict[str, float]],
) -> Tuple[Optional[pd.DataFrame], str]:
    """Swap the predictive component for PPA scores; degrade explicitly on gaps.

    Returns ``(substituted_df, "")`` only when every ranked team has a PPA
    score. Any gap returns ``(None, note)`` so the season is marked unavailable
    for the experiment — missing data is never silently filled.
    """
    if not ppa_scores:
        return None, "PPA substitution unavailable: no PPA data for this season."
    teams = base_rankings_df["team"].tolist()
    missing = [team for team in teams if team not in ppa_scores]
    if missing:
        preview = ", ".join(sorted(missing)[:5])
        suffix = "" if len(missing) <= 5 else f", … ({len(missing) - 5} more)"
        return None, (
            f"PPA substitution unavailable: missing PPA for {len(missing)} of "
            f"{len(teams)} ranked teams ({preview}{suffix})."
        )
    df = base_rankings_df.copy()
    df["predictive_score"] = [float(ppa_scores[team]) for team in teams]
    return df, ""
