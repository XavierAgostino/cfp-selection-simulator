"""Displayed record game sets and metadata — separate from ranking model inputs."""

from __future__ import annotations

from typing import Literal, Optional

import pandas as pd

from src.config.simulator import SimulatorConfig
from src.data.fetcher import fetch_conference_championship_games
from src.pipeline.sample import SAMPLE_GAMES

RecordLabel = Literal["fbs_record", "demo_record", "model_window_record"]

# Columns shared by ranking games and CCG rows merged for display records.
_RECORD_GAME_COLUMNS = (
    "game_id",
    "week",
    "home_team",
    "away_team",
    "home_score",
    "away_score",
    "home_conference",
    "away_conference",
    "neutral_site",
)


def merge_ccg_games(
    games_df: pd.DataFrame,
    ccg_df: pd.DataFrame,
) -> pd.DataFrame:
    """Append CCG rows not already present in games_df (dedupe by game_id)."""
    if ccg_df.empty:
        return games_df.copy()

    base = games_df.copy()
    seen = set(base["game_id"].astype(str).tolist()) if "game_id" in base.columns else set()

    rows = []
    for _, game in ccg_df.iterrows():
        game_id = str(game.get("game_id", ""))
        if game_id in seen:
            continue
        row = {col: game.get(col) for col in _RECORD_GAME_COLUMNS if col in game.index}
        if not row.get("home_team") or not row.get("away_team"):
            continue
        rows.append(row)
        seen.add(game_id)

    if not rows:
        return base

    extra = pd.DataFrame(rows)
    for col in _RECORD_GAME_COLUMNS:
        if col not in extra.columns and col in base.columns:
            extra[col] = None
    cols = [c for c in _RECORD_GAME_COLUMNS if c in extra.columns]
    merged = pd.concat([base, extra[cols]], ignore_index=True)
    return merged.sort_values(["week", "game_id"]).reset_index(drop=True)


def build_record_games_df(
    ranking_games_df: pd.DataFrame,
    config: SimulatorConfig,
    *,
    use_sample: bool = False,
    api_key: Optional[str] = None,
) -> tuple[pd.DataFrame, bool]:
    """Build games used only for displayed records (may include CCG not in model set).

    Returns (record_games_df, includes_ccg).
    """
    record_df = ranking_games_df.copy()
    includes_ccg = False

    if use_sample or config.week < 14:
        return record_df, includes_ccg

    try:
        ccg_df = fetch_conference_championship_games(config.year, api_key=api_key)
        if not ccg_df.empty:
            ccg_df = ccg_df[ccg_df["week"] <= config.week]
        if not ccg_df.empty:
            before = len(record_df)
            record_df = merge_ccg_games(record_df, ccg_df)
            includes_ccg = len(record_df) > before
    except Exception:
        pass

    return record_df, includes_ccg


def record_start_week(games_df: pd.DataFrame, config: SimulatorConfig) -> int:
    if games_df.empty or "week" not in games_df.columns:
        return config.start_week
    return int(games_df["week"].min())


def derive_record_label(
    config: SimulatorConfig,
    *,
    use_sample: bool,
    record_start: int,
    includes_ccg: bool,
    ranking_game_count: int,
    record_game_count: int,
) -> RecordLabel:
    if use_sample:
        return "demo_record"
    if config.start_week > 1:
        return "model_window_record"
    if record_start > 1:
        return "model_window_record"
    if record_game_count != ranking_game_count and includes_ccg:
        # CCG-only difference still counts as FBS record through selected week.
        return "fbs_record"
    return "fbs_record"


def build_record_meta(
    config: SimulatorConfig,
    ranking_games_df: pd.DataFrame,
    record_games_df: pd.DataFrame,
    *,
    use_sample: bool,
    includes_ccg: bool,
) -> dict:
    record_start = record_start_week(record_games_df, config)
    is_demo_fixture = use_sample and SAMPLE_GAMES.exists()
    if is_demo_fixture and not record_games_df.empty:
        # Sample fixture intentionally starts mid-season (week 5+).
        is_demo_fixture = record_start >= 5

    label = derive_record_label(
        config,
        use_sample=use_sample,
        record_start=record_start,
        includes_ccg=includes_ccg,
        ranking_game_count=len(ranking_games_df),
        record_game_count=len(record_games_df),
    )

    return {
        "record_universe": "fbs",
        "record_game_scope": "display",
        "model_start_week": config.start_week,
        "record_start_week": record_start,
        "through_week": config.week,
        "includes_ccg": includes_ccg,
        "data_source": "sample" if use_sample else "cfbd",
        "is_demo_fixture": is_demo_fixture,
        "record_label": label,
    }
