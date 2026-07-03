"""Typer CLI for Selection Room."""

from __future__ import annotations

import json
import shutil
import webbrowser
from pathlib import Path
from typing import Optional

import typer

from src.api_contracts.export import export_run_api, regenerate_runs_index
from src.assets.logos import refresh_team_assets_cache
from src.cli.console import print_doctor_report, print_latest_outputs, print_run_summary
from src.cli.doctor import run_doctor_checks
from src.cli.store_commands import store_app
from src.config.simulator import SimulatorConfig
from src.data.fetcher import fetch_season_games, get_api_key
from src.pipeline.cache_paths import games_cache_write_path
from src.pipeline.paths import (
    BASE_SCENARIO_ID,
    DATA_OUTPUT,
    RunOutputPaths,
    find_latest_manifest,
    paths_from_manifest,
    weights_scenario_id,
)
from src.pipeline.run import REPO_ROOT, run_pipeline
from src.pipeline.weights import parse_weight_overrides
from src.validation.backtest import run_era_validation

app = typer.Typer(
    name="sroom",
    help=(
        "Selection Room — transparent decision-support simulator for College Football "
        "Playoff selection."
    ),
    no_args_is_help=True,
)
app.add_typer(store_app, name="store")


def _resolve_config(
    year: Optional[int],
    week: Optional[int],
    config_path: Optional[Path],
    start_week: int = 1,
) -> SimulatorConfig:
    if config_path:
        cfg = SimulatorConfig.from_yaml(config_path)
        if year is not None:
            cfg.year = year
        if week is not None:
            cfg.week = week
        return cfg
    if year is None or week is None:
        raise typer.BadParameter("Provide --year and --week, or pass --config")
    return SimulatorConfig(year=year, week=week, start_week=start_week)


def _run_and_report(
    cfg: SimulatorConfig,
    *,
    sample: bool,
    write_html: bool = True,
    scenario_id: str = BASE_SCENARIO_ID,
) -> dict:
    result = run_pipeline(
        cfg, use_sample=sample, write_html=write_html, scenario_id=scenario_id
    )
    print_run_summary(
        cfg,
        data_source=result["data_source"],
        steps=result["steps"],
        paths=result["paths"],
        sample=sample,
    )
    return result


@app.command()
def doctor() -> None:
    """Check environment readiness for local runs."""
    checks = run_doctor_checks()
    print_doctor_report(checks)
    typer.echo("Ready to run:")
    typer.echo("  sroom run --year 2025 --week 15 --sample")
    typer.echo("  make demo")


@app.command()
def fetch(
    year: int = typer.Option(..., help="Season year"),
    start_week: int = typer.Option(1, help="First week to fetch"),
    end_week: int = typer.Option(15, help="Last week to fetch"),
) -> None:
    """Fetch FBS game data from CFBD into data/cache/."""
    api_key = get_api_key()
    games_df = fetch_season_games(year, start_week=start_week, api_key=api_key)
    games_df = games_df[games_df["week"] <= end_week]
    cache_dir = REPO_ROOT / "data" / "cache" / "cfbd" / str(year)
    cache_dir.mkdir(parents=True, exist_ok=True)
    out = games_cache_write_path(year, end_week, start_week)
    games_df.to_parquet(out, index=False)
    typer.echo(f"Saved {len(games_df)} games to {out}")


@app.command("fetch-assets")
def fetch_assets(
    year: int = typer.Option(2025, help="Season year for FBS team metadata"),
) -> None:
    """Fetch FBS team logos/colors from CFBD into data/cache/team_assets.json."""
    assets = refresh_team_assets_cache(year)
    typer.echo(f"Cached {len(assets)} FBS team assets.")


@app.command()
def rank(
    year: Optional[int] = typer.Option(None, help="Season year"),
    week: Optional[int] = typer.Option(None, help="Analysis week"),
    config: Optional[Path] = typer.Option(None, "--config", help="YAML config file"),
    sample: bool = typer.Option(False, help="Use bundled sample dataset"),
) -> None:
    """Compute composite rankings."""
    cfg = _resolve_config(year, week, config)
    result = run_pipeline(cfg, use_sample=sample, write_html=False, select_field=False)
    typer.echo(f"Rankings written to {result['paths']['rankings']}")


@app.command()
def select(
    year: Optional[int] = typer.Option(None, help="Season year"),
    week: Optional[int] = typer.Option(None, help="Analysis week"),
    config: Optional[Path] = typer.Option(None, "--config", help="YAML config file"),
    sample: bool = typer.Option(False, help="Use bundled sample dataset"),
) -> None:
    """Select playoff field and seed teams."""
    cfg = _resolve_config(year, week, config)
    result = run_pipeline(cfg, use_sample=sample, write_html=False, select_field=True)
    sel = result["selection"]
    typer.echo(f"Selected {len(sel.playoff_teams)} teams.")
    typer.echo(f"Field:  {result['paths']['field']}")
    typer.echo(f"Audit:  {result['paths']['audit']}")


@app.command()
def bracket(
    year: Optional[int] = typer.Option(None, help="Season year"),
    week: Optional[int] = typer.Option(None, help="Analysis week"),
    config: Optional[Path] = typer.Option(None, "--config", help="YAML config file"),
    sample: bool = typer.Option(False, help="Use bundled sample dataset"),
    html: bool = typer.Option(False, "--html", help="Write HTML bracket visualization"),
) -> None:
    """Generate bracket outputs (CSV; optional HTML)."""
    cfg = _resolve_config(year, week, config)
    result = run_pipeline(cfg, use_sample=sample, write_html=html)
    typer.echo(f"Bracket CSV:  {result['paths']['bracket']}")
    if html and result["paths"].get("bracket_html"):
        typer.echo(f"Bracket HTML: {result['paths']['bracket_html']}")


@app.command(name="run")
def run_cmd(
    year: Optional[int] = typer.Option(None, help="Season year"),
    week: Optional[int] = typer.Option(None, help="Analysis week"),
    config: Optional[Path] = typer.Option(None, "--config", help="YAML config file"),
    sample: bool = typer.Option(False, help="Use bundled sample dataset"),
    html: bool = typer.Option(True, "--html/--no-html", help="Write HTML bracket"),
    weights: Optional[str] = typer.Option(
        None,
        "--weights",
        help=(
            "Scenario weight overrides, e.g. "
            "'resume=0.45,predictive=0.25,sor=0.20,sos=0.10'. Routes output to a "
            "scenario stem; base artifacts and latest.json are untouched."
        ),
    ),
    scenario_id: Optional[str] = typer.Option(
        None,
        "--scenario-id",
        help="Override the derived scenario id (advanced; normally inferred from --weights).",
    ),
) -> None:
    """Run full pipeline with manifest. Pass --weights to produce a scenario run."""
    cfg = _resolve_config(year, week, config)

    resolved_scenario = BASE_SCENARIO_ID
    if weights is not None:
        try:
            cfg.weights = parse_weight_overrides(weights, cfg.weights)
        except ValueError as exc:
            raise typer.BadParameter(str(exc), param_hint="--weights") from exc
        resolved_scenario = weights_scenario_id(cfg.weights)
    if scenario_id is not None:
        resolved_scenario = scenario_id

    _run_and_report(cfg, sample=sample, write_html=html, scenario_id=resolved_scenario)


@app.command()
def validate(
    years: str = typer.Option("2014:2024", help="Year range e.g. 2014:2024"),
    target: str = typer.Option(
        "all",
        help="Validation track: all, committee, selection, or predictive",
    ),
) -> None:
    """Run era-aware historical validation (committee, selection, predictive)."""
    if ":" in years:
        start, end = years.split(":")
        year_list = list(range(int(start), int(end) + 1))
    else:
        year_list = [int(y) for y in years.split(",")]

    allowed = {"all", "committee", "selection", "predictive"}
    if target not in allowed:
        typer.echo(f"Invalid target '{target}'. Choose from: {', '.join(sorted(allowed))}")
        raise typer.Exit(code=1)

    out_dir = DATA_OUTPUT / "validation"
    df = run_era_validation(
        year_list,
        target=target,  # type: ignore[arg-type]
        output_dir=str(out_dir),
    )
    if len(df):
        typer.echo("\nPrimary selection validation table:")
        typer.echo(df.to_string(index=False))


@app.command()
def reproduce(
    season: int = typer.Option(..., help="Season to reproduce"),
    week: int = typer.Option(15, help="Final week"),
    sample: bool = typer.Option(False, help="Use bundled sample dataset"),
) -> None:
    """Reproduce a season run with archived config snapshot."""
    cfg = SimulatorConfig(year=season, week=week)
    _run_and_report(cfg, sample=sample, write_html=True)


@app.command()
def outputs(
    latest: bool = typer.Option(True, "--latest/--all", help="Show latest run outputs"),
) -> None:
    """List output files from recent runs."""
    manifest_path = find_latest_manifest()
    if manifest_path is None:
        typer.echo("No runs found. Try: sroom run --year 2025 --week 15 --sample")
        raise typer.Exit(code=1)

    data = json.loads(manifest_path.read_text())
    paths = paths_from_manifest(manifest_path)
    if paths is None:
        typer.echo(f"Could not parse manifest: {manifest_path}")
        raise typer.Exit(code=1)

    print_latest_outputs(
        season=int(data["season"]),
        week=int(data["week"]),
        ruleset=data.get("ruleset"),
        generated_at=data.get("generated_at"),
        paths=paths.as_dict(),
    )

    if not latest:
        runs_dir = DATA_OUTPUT / "runs"
        typer.echo("\nAll manifests:")
        for path in sorted(runs_dir.glob("*_manifest.json"), reverse=True):
            typer.echo(f"  {path.name}")


@app.command(name="export")
def export_cmd(
    year: Optional[int] = typer.Option(None, help="Season year (default: latest run)"),
    week: Optional[int] = typer.Option(None, help="Analysis week (default: latest run)"),
    sample: bool = typer.Option(False, help="Use bundled sample dataset"),
    index_only: bool = typer.Option(
        False, "--index-only", help="Only regenerate runs.json from existing manifests"
    ),
) -> None:
    """(Re-)export the JSON API for a run, or just refresh runs.json."""
    if index_only:
        path = regenerate_runs_index()
        typer.echo(f"Regenerated {path}")
        return

    if year is None or week is None:
        manifest_path = find_latest_manifest()
        if manifest_path is None:
            typer.echo("No runs found. Try: sroom run --year 2025 --week 15 --sample")
            raise typer.Exit(code=1)
        data = json.loads(manifest_path.read_text())
        if year is None:
            year = int(data["season"])
        if week is None:
            week = int(data["week"])
        if not sample:
            sample = data.get("data_source") == "sample"

    cfg = SimulatorConfig(year=year, week=week)
    result = run_pipeline(cfg, use_sample=sample, write_html=False)
    api_paths = result.get("api_paths", {})
    typer.echo(f"Exported JSON API for {cfg.year} week {cfg.week}:")
    for key, path in api_paths.items():
        typer.echo(f"  {key}: {path}")


@app.command(name="open")
def open_cmd(
    latest: bool = typer.Option(False, "--latest", help="Open latest bracket HTML"),
    type: str = typer.Option("bracket", "--type", help="Output type: bracket, rankings, manifest"),
    year: Optional[int] = typer.Option(None, help="Season year"),
    week: Optional[int] = typer.Option(None, help="Analysis week"),
) -> None:
    """Open a run output in the default browser (or print its path)."""
    if latest or (year is None and week is None):
        manifest_path = find_latest_manifest()
        if manifest_path is None:
            typer.echo("No runs found.")
            raise typer.Exit(code=1)
        paths = paths_from_manifest(manifest_path)
    else:
        if year is None or week is None:
            raise typer.BadParameter("Provide both --year and --week, or use --latest")
        paths = RunOutputPaths(year=year, week=week)

    assert paths is not None
    key_map = {
        "bracket": "bracket_html",
        "rankings": "rankings",
        "manifest": "manifest",
        "field": "field",
        "audit": "audit",
    }
    path_key = key_map.get(type, "bracket_html")
    target = paths.as_dict().get(path_key)
    if target is None or not target.exists():
        typer.echo(f"File not found for type={type}: {target}")
        raise typer.Exit(code=1)

    typer.echo(str(target))
    if target.suffix == ".html":
        webbrowser.open(target.resolve().as_uri())


@app.command()
def clean(
    outputs_only: bool = typer.Option(True, "--outputs/--all", help="Clean output artifacts only"),
    cache: bool = typer.Option(
        False, "--cache", help="Also remove CFBD game cache (refetch on next run)"
    ),
) -> None:
    """Remove generated output artifacts."""
    if outputs_only and not cache and DATA_OUTPUT.exists():
        shutil.rmtree(DATA_OUTPUT)
        typer.echo(f"Removed {DATA_OUTPUT}")
    elif cache or not outputs_only:
        for path in (DATA_OUTPUT, REPO_ROOT / "htmlcov", REPO_ROOT / ".pytest_cache"):
            if path.exists():
                shutil.rmtree(path)
                typer.echo(f"Removed {path}")
        coverage_file = REPO_ROOT / ".coverage"
        if coverage_file.exists():
            coverage_file.unlink()
            typer.echo(f"Removed {coverage_file}")
    if cache:
        cache_root = REPO_ROOT / "data" / "cache"
        for sub in ("cfbd", "2024", "2025", "2026"):
            target = cache_root / sub if sub != "cfbd" else cache_root / "cfbd"
            if target.exists():
                shutil.rmtree(target)
                typer.echo(f"Removed {target}")


if __name__ == "__main__":
    app()
