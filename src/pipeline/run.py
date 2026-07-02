"""End-to-end simulation pipeline with reproducibility manifest."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

from src import __version__
from src.config.formats import get_format_for_year
from src.config.simulator import SimulatorConfig
from src.data.fetcher import fetch_season_games, get_api_key
from src.pipeline.composite import calculate_composite_rankings
from src.playoff.bracket import create_bracket_matchups, visualize_bracket_html
from src.selection.field import select_playoff_field
from src.selection.seeding import seed_playoff_teams

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_CACHE = REPO_ROOT / "data" / "cache"
DATA_OUTPUT = REPO_ROOT / "data" / "output"
SAMPLE_GAMES = REPO_ROOT / "data" / "processed" / "sample" / "sample_games.csv"


def _output_dir(subdir: str) -> Path:
    path = DATA_OUTPUT / subdir
    path.mkdir(parents=True, exist_ok=True)
    return path


def load_games(
    config: SimulatorConfig,
    api_key: Optional[str] = None,
    use_sample: bool = False,
) -> pd.DataFrame:
    """Load games from cache, sample fixture, or CFBD API."""
    if use_sample and SAMPLE_GAMES.exists():
        games = pd.read_csv(SAMPLE_GAMES)
        return games[games["week"] <= config.week]

    cache_path = DATA_CACHE / str(config.year) / f"games_w{config.week}.parquet"
    if cache_path.exists():
        return pd.read_parquet(cache_path)

    key = api_key or get_api_key()
    games = fetch_season_games(config.year, start_week=config.start_week, api_key=key)
    games = games[games["week"] <= config.week]
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    games.to_parquet(cache_path, index=False)
    return games


def write_manifest(config: SimulatorConfig, extra: Optional[Dict[str, Any]] = None) -> Path:
    """Write run manifest JSON for reproducibility."""
    manifest = {
        "simulator_version": __version__,
        "ruleset": config.playoff_format.name if config.playoff_format else None,
        "data_source": "cfbd",
        "season": config.year,
        "week": config.week,
        "ranking_model": "composite_v1",
        "config_hash": config.config_hash,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        manifest.update(extra)

    out_dir = _output_dir("exports")
    path = out_dir / f"manifest_{config.year}_w{config.week}.json"
    with open(path, "w") as f:
        json.dump(manifest, f, indent=2)
    return path


def run_rank(config: SimulatorConfig, games_df: pd.DataFrame) -> tuple[pd.DataFrame, Path]:
    rankings = calculate_composite_rankings(games_df, weights=config.weights)
    out = _output_dir("rankings") / f"rankings_{config.year}_w{config.week}.csv"
    rankings.to_csv(out, index=False)
    return rankings, out


def run_select(config: SimulatorConfig, rankings_df: pd.DataFrame) -> Dict[str, Any]:
    if config.year < 2024:
        raise ValueError("12-team selection requires year >= 2024")

    fmt = config.playoff_format or get_format_for_year(config.year)
    if "conf_champ" not in rankings_df.columns:
        rankings_df = rankings_df.copy()
        rankings_df["conf_champ"] = "No"
    if "conference" not in rankings_df.columns:
        rankings_df["conference"] = "Unknown"

    selection = select_playoff_field(rankings_df, format_rules=fmt)
    seeded = seed_playoff_teams(selection.playoff_teams, selection.auto_bids, format_rules=fmt)
    first_round, _ = create_bracket_matchups(seeded)

    out_dir = _output_dir("brackets")
    seeded_path = out_dir / f"seeded_{config.year}_w{config.week}.csv"
    audit_path = out_dir / f"audit_{config.year}_w{config.week}.txt"
    seeded.to_csv(seeded_path, index=False)
    audit_path.write_text("\n".join(selection.audit_log))

    return {
        "selection": selection,
        "seeded": seeded,
        "first_round": first_round,
        "seeded_path": seeded_path,
        "audit_path": audit_path,
    }


def run_bracket_html(config: SimulatorConfig, seeded: pd.DataFrame, first_round) -> Path:
    html = visualize_bracket_html(seeded, first_round)
    out = _output_dir("brackets") / f"bracket_{config.year}_w{config.week}.html"
    out.write_text(html)
    return out


def run_pipeline(
    config: SimulatorConfig,
    api_key: Optional[str] = None,
    use_sample: bool = False,
    write_html: bool = True,
) -> Dict[str, Any]:
    """Run full fetch → rank → select → bracket pipeline."""
    games = load_games(config, api_key=api_key, use_sample=use_sample)
    rankings, rankings_path = run_rank(config, games)

    paths: Dict[str, Path] = {"rankings": rankings_path}
    result: Dict[str, Any] = {
        "games": games,
        "rankings": rankings,
        "paths": paths,
    }

    if config.year >= 2024:
        select_result = run_select(config, rankings)
        result["selection"] = select_result["selection"]
        result["seeded"] = select_result["seeded"]
        paths["audit"] = select_result["audit_path"]
        paths["seeded"] = select_result["seeded_path"]
        if write_html:
            paths["bracket"] = run_bracket_html(
                config, select_result["seeded"], select_result["first_round"]
            )

    paths["manifest"] = write_manifest(
        config,
        extra={"n_games": len(games), "n_teams": len(rankings)},
    )
    result["manifest"] = paths["manifest"]
    return result
