"""Shared cache path helpers for game and asset data."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_CACHE = REPO_ROOT / "data" / "cache"


def games_cache_candidates(year: int, week: int) -> list[Path]:
    """Return candidate parquet paths for cached games, newest convention first."""
    base = DATA_CACHE / "cfbd" / str(year)
    legacy = DATA_CACHE / str(year)
    return [
        base / f"games_w{week}.parquet",
        base / f"games_week{week}.parquet",
        legacy / f"games_w{week}.parquet",
        legacy / f"games_week{week}.parquet",
    ]


def games_cache_write_path(year: int, week: int) -> Path:
    """Canonical write path for cached FBS games."""
    return DATA_CACHE / "cfbd" / str(year) / f"games_w{week}.parquet"
