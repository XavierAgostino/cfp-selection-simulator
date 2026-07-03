"""Shared cache path helpers for game and asset data."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_CACHE = REPO_ROOT / "data" / "cache"


def games_cache_candidates(year: int, week: int, start_week: int = 1) -> list[Path]:
    """Return candidate parquet paths for cached games, newest convention first."""
    base = DATA_CACHE / "cfbd" / str(year)
    legacy = DATA_CACHE / str(year)
    return [
        base / f"games_w{week}_s{start_week}.parquet",
        base / f"games_w{week}.parquet",
        base / f"games_week{week}.parquet",
        legacy / f"games_w{week}.parquet",
        legacy / f"games_week{week}.parquet",
    ]


def games_cache_write_path(year: int, week: int, start_week: int = 1) -> Path:
    """Canonical write path for cached FBS games."""
    return DATA_CACHE / "cfbd" / str(year) / f"games_w{week}_s{start_week}.parquet"


def games_cache_covers(
    games_df,
    *,
    start_week: int,
    through_week: int,
) -> bool:
    """True when cached games include the requested week window."""
    if games_df.empty or "week" not in games_df.columns:
        return False
    min_week = int(games_df["week"].min())
    max_week = int(games_df["week"].max())
    return min_week <= start_week and max_week >= through_week
