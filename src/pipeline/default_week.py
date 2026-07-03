"""Default analysis week resolution for CFP-style selection runs."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

from src.pipeline.cache_paths import DATA_CACHE
from src.pipeline.sample import SAMPLE_GAMES

FINAL_SELECTION_WEEK = 16
PRE_FINAL_SELECTION_WEEK = 15
MAX_UI_WEEK = 16

_GAMES_WEEK_RE = re.compile(r"games_w(\d+)(?:_s\d+)?\.parquet$")


def week_option_suffix(week: int) -> Optional[str]:
    """Human label suffix for selection-relevant weeks."""
    if week == FINAL_SELECTION_WEEK:
        return "Final selection window"
    if week == PRE_FINAL_SELECTION_WEEK:
        return "Pre-final / championship window"
    return None


def week_option_label(week: int) -> str:
    suffix = week_option_suffix(week)
    if suffix:
        return f"Week {week} · {suffix}"
    return f"Week {week}"


def sample_max_available_week() -> int:
    """Highest week present in the bundled sample fixture."""
    if not SAMPLE_GAMES.exists():
        return PRE_FINAL_SELECTION_WEEK
    games = pd.read_csv(SAMPLE_GAMES, usecols=["week"])
    if games.empty:
        return PRE_FINAL_SELECTION_WEEK
    return int(games["week"].max())


def cfbd_max_cached_week(season: int) -> Optional[int]:
    """Highest week with a cached CFBD games parquet for the season, if any."""
    base = DATA_CACHE / "cfbd" / str(season)
    if not base.is_dir():
        legacy = DATA_CACHE / str(season)
        if not legacy.is_dir():
            return None
        base = legacy

    best: Optional[int] = None
    for path in base.iterdir():
        if not path.is_file():
            continue
        match = _GAMES_WEEK_RE.match(path.name)
        if not match:
            continue
        week = int(match.group(1))
        if best is None or week > best:
            best = week
    return best


def max_available_week(season: int, *, use_sample: bool) -> int:
    """Latest week the engine can analyze for this season and data source."""
    if use_sample:
        return min(MAX_UI_WEEK, sample_max_available_week())
    cached = cfbd_max_cached_week(season)
    if cached is not None:
        return min(MAX_UI_WEEK, cached)
    return FINAL_SELECTION_WEEK


def resolve_default_week(season: int, *, use_sample: bool) -> int:
    """Prefer the final selection window when data allows; else pre-final week."""
    available = max_available_week(season, use_sample=use_sample)
    if available >= FINAL_SELECTION_WEEK:
        return FINAL_SELECTION_WEEK
    if available >= PRE_FINAL_SELECTION_WEEK:
        return PRE_FINAL_SELECTION_WEEK
    return max(1, available)


def week_defaults_payload(season: int, *, use_sample: bool) -> Dict[str, Any]:
    """JSON-serializable defaults for Run Analysis and API consumers."""
    max_week = max_available_week(season, use_sample=use_sample)
    default_week = resolve_default_week(season, use_sample=use_sample)
    labels = {
        str(week): week_option_label(week)
        for week in (PRE_FINAL_SELECTION_WEEK, FINAL_SELECTION_WEEK)
        if week <= max_week
    }
    return {
        "season": season,
        "data_source": "sample" if use_sample else "cfbd",
        "default_week": default_week,
        "max_available_week": max_week,
        "week_labels": labels,
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Resolve default CFP analysis week")
    parser.add_argument("--season", type=int, required=True)
    parser.add_argument(
        "--data-source",
        choices=("sample", "cfbd"),
        required=True,
    )
    args = parser.parse_args()
    payload = week_defaults_payload(
        args.season,
        use_sample=args.data_source == "sample",
    )
    print(json.dumps(payload))


if __name__ == "__main__":
    main()
