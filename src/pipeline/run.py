"""End-to-end simulation pipeline with reproducibility manifest."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from src import __version__
from src.api_contracts.export import export_run_api
from src.api_contracts.records import build_record_games_df, build_record_meta
from src.config.formats import get_format_for_year
from src.config.simulator import SimulatorConfig
from src.data.fetcher import fetch_season_games, get_api_key
from src.pipeline.cache_paths import (
    games_cache_candidates,
    games_cache_covers,
    games_cache_write_path,
)
from src.pipeline.composite import calculate_composite_rankings
from src.pipeline.live import enrich_live_rankings, filter_games_to_fbs
from src.pipeline.paths import (
    BASE_SCENARIO_ID,
    RunOutputPaths,
    build_run_label,
    component_weights,
    ensure_output_dirs,
    run_id,
)
from src.pipeline.sample import SAMPLE_GAMES, enrich_sample_rankings
from src.playoff.bracket import create_bracket_matchups, visualize_bracket_html
from src.selection.field import select_playoff_field
from src.selection.seeding import seed_playoff_teams

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_CACHE = REPO_ROOT / "data" / "cache"


def load_games(
    config: SimulatorConfig,
    api_key: Optional[str] = None,
    use_sample: bool = False,
) -> pd.DataFrame:
    """Load games from cache, sample fixture, or CFBD API."""
    if use_sample and SAMPLE_GAMES.exists():
        games = pd.read_csv(SAMPLE_GAMES)
        return games[games["week"] <= config.week]

    cache_path = None
    games: pd.DataFrame | None = None
    for candidate in games_cache_candidates(config.year, config.week, config.start_week):
        if not candidate.exists():
            continue
        cached = pd.read_parquet(candidate)
        if games_cache_covers(
            cached,
            start_week=config.start_week,
            through_week=config.week,
        ):
            games = cached
            cache_path = candidate
            break

    if games is None:
        key = api_key or get_api_key()
        games = fetch_season_games(config.year, start_week=config.start_week, api_key=key)
        games = games[games["week"] <= config.week]
        cache_path = games_cache_write_path(
            config.year,
            config.week,
            config.start_week,
        )
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        games.to_parquet(cache_path, index=False)

    games = games[(games["week"] >= config.start_week) & (games["week"] <= config.week)]

    if config.fbs_only:
        key = api_key or get_api_key()
        games = filter_games_to_fbs(games, config.year, api_key=key)
    return games


def write_manifest(
    config: SimulatorConfig,
    paths: RunOutputPaths,
    extra: Optional[Dict[str, Any]] = None,
    data_source: str = "cfbd",
) -> Path:
    """Write run manifest JSON for reproducibility."""
    rid = run_id(config.year, config.week)
    scenario_id = BASE_SCENARIO_ID
    manifest = {
        "simulator_version": __version__,
        "ruleset": config.playoff_format.name if config.playoff_format else None,
        "data_source": data_source,
        "season": config.year,
        "week": config.week,
        "stem": paths.stem,
        "run_id": rid,
        "scenario_id": scenario_id,
        "label": build_run_label(config.year, config.week, scenario_id),
        "weights": component_weights(config.weights),
        "ranking_model": "composite_v1",
        "config_hash": config.config_hash,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "outputs": {key: str(path) for key, path in paths.as_dict().items()},
    }
    if extra:
        manifest.update(extra)

    paths.manifest.parent.mkdir(parents=True, exist_ok=True)
    with open(paths.manifest, "w") as f:
        json.dump(manifest, f, indent=2)
    return paths.manifest


def run_rank(
    config: SimulatorConfig,
    games_df: pd.DataFrame,
    paths: RunOutputPaths,
    use_sample: bool = False,
    api_key: Optional[str] = None,
) -> tuple[pd.DataFrame, Path, str]:
    rankings = calculate_composite_rankings(games_df, weights=config.weights)
    champion_source = "sample_fixture"
    if use_sample:
        rankings = enrich_sample_rankings(rankings)
    else:
        rankings, champion_source = enrich_live_rankings(
            rankings,
            games_df,
            year=config.year,
            api_key=api_key,
        )
    paths.rankings.parent.mkdir(parents=True, exist_ok=True)
    rankings.to_csv(paths.rankings, index=False)
    return rankings, paths.rankings, champion_source


def _field_rows(selection) -> pd.DataFrame:
    rows = []
    auto_names = {t["team"] for t in selection.auto_bids}
    for team in selection.playoff_teams:
        rows.append(
            {
                "rank": team["rank"],
                "team": team["team"],
                "composite_score": team.get("composite_score", 0.0),
                "conference": team.get("conference", ""),
                "conf_champ": team.get("conf_champ", "No"),
                "bid_type": "AUTO" if team["team"] in auto_names else "AT-LARGE",
            }
        )
    return pd.DataFrame(rows)


def _write_audit_json(paths: RunOutputPaths, selection, config: SimulatorConfig) -> Path:
    payload = {
        "season": config.year,
        "week": config.week,
        "ruleset": config.playoff_format.name if config.playoff_format else None,
        "steps": [
            {"step": entry.step.value, "message": entry.message}
            for entry in selection.audit.entries
        ],
        "log": selection.audit_log,
        "displaced_team": selection.displaced_team,
        "first_four_out": selection.first_four_out,
    }
    paths.audit.parent.mkdir(parents=True, exist_ok=True)
    paths.audit.write_text(json.dumps(payload, indent=2))
    return paths.audit


def run_select(
    config: SimulatorConfig,
    rankings_df: pd.DataFrame,
    paths: RunOutputPaths,
) -> Dict[str, Any]:
    if config.year < 2024:
        raise ValueError("12-team selection requires year >= 2024")

    fmt = config.playoff_format or get_format_for_year(config.year)
    if "conf_champ" not in rankings_df.columns:
        rankings_df = rankings_df.copy()
        rankings_df["conf_champ"] = "No"
    if "conference" not in rankings_df.columns:
        rankings_df = rankings_df.copy()
        rankings_df["conference"] = "Unknown"

    selection = select_playoff_field(rankings_df, format_rules=fmt)
    seeded = seed_playoff_teams(selection.playoff_teams, selection.auto_bids, format_rules=fmt)
    first_round, _ = create_bracket_matchups(seeded)

    field_df = _field_rows(selection)
    paths.field.parent.mkdir(parents=True, exist_ok=True)
    paths.bracket.parent.mkdir(parents=True, exist_ok=True)
    field_df.to_csv(paths.field, index=False)
    seeded.to_csv(paths.bracket, index=False)
    audit_path = _write_audit_json(paths, selection, config)

    return {
        "selection": selection,
        "seeded": seeded,
        "first_round": first_round,
        "field_path": paths.field,
        "bracket_path": paths.bracket,
        "audit_path": audit_path,
    }


def run_bracket_html(
    config: SimulatorConfig,
    seeded: pd.DataFrame,
    first_round,
    paths: RunOutputPaths,
) -> Path:
    html = visualize_bracket_html(seeded, first_round)
    paths.bracket_html.parent.mkdir(parents=True, exist_ok=True)
    paths.bracket_html.write_text(html)
    return paths.bracket_html


def run_pipeline(
    config: SimulatorConfig,
    api_key: Optional[str] = None,
    use_sample: bool = False,
    write_html: bool = True,
    select_field: bool = True,
    export_api: bool = True,
) -> Dict[str, Any]:
    """Run full fetch → rank → select → bracket pipeline."""
    ensure_output_dirs()
    paths = RunOutputPaths(year=config.year, week=config.week)
    data_source = "sample" if use_sample else "cfbd"
    steps: List[str] = []

    games = load_games(config, api_key=api_key, use_sample=use_sample)
    ranking_games_df = games
    record_games_df, includes_ccg = build_record_games_df(
        ranking_games_df,
        config,
        use_sample=use_sample,
        api_key=api_key,
    )
    record_meta = build_record_meta(
        config,
        ranking_games_df,
        record_games_df,
        use_sample=use_sample,
        includes_ccg=includes_ccg,
    )
    steps.append(f"Loaded {len(ranking_games_df)} games")

    rankings, _, champion_source = run_rank(
        config, ranking_games_df, paths, use_sample=use_sample, api_key=api_key
    )
    steps.append(f"Generated rankings for {len(rankings)} teams")
    if not use_sample:
        steps.append(f"Conference auto-bid labels: {champion_source}")

    result: Dict[str, Any] = {
        "config": config,
        "games": ranking_games_df,
        "record_games": record_games_df,
        "record_meta": record_meta,
        "rankings": rankings,
        "paths": paths.as_dict(),
        "data_source": data_source,
        "champion_source": champion_source,
        "steps": steps,
    }

    if config.year >= 2024 and select_field:
        select_result = run_select(config, rankings, paths)
        result["selection"] = select_result["selection"]
        result["seeded"] = select_result["seeded"]
        steps.append(f"Selected {len(select_result['selection'].playoff_teams)}-team field")
        seeding_label = (
            "2024 champion-bye seeding"
            if config.playoff_format and config.playoff_format.seeding == "champion_byes"
            else "2025+ straight seeding"
        )
        steps.append(f"Applied {seeding_label}")
        if write_html:
            run_bracket_html(config, select_result["seeded"], select_result["first_round"], paths)
            steps.append("Generated bracket HTML")

    write_manifest(
        config,
        paths,
        extra={
            "n_games": len(ranking_games_df),
            "n_teams": len(rankings),
            "champion_source": champion_source if not use_sample else "sample_fixture",
            "record_meta": record_meta,
        },
        data_source=data_source,
    )
    steps.append("Wrote manifest")
    result["manifest"] = paths.manifest

    if export_api:
        api_paths = export_run_api(config, result, paths)
        steps.append("Exported JSON API")
        result["api_paths"] = api_paths

    result["steps"] = steps
    return result
