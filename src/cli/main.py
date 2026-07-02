"""Typer CLI for CFP Selection Simulator."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Optional

import typer

from src.config.simulator import SimulatorConfig
from src.data.fetcher import fetch_season_games, get_api_key
from src.pipeline.run import REPO_ROOT, run_pipeline
from src.validation.backtest import run_multiple_seasons_backtest

app = typer.Typer(
    name="cfp-sim",
    help="Transparent decision-support simulator for College Football Playoff selection.",
    no_args_is_help=True,
)


def _config(year: int, week: int, start_week: int = 5) -> SimulatorConfig:
    return SimulatorConfig(year=year, week=week, start_week=start_week)


@app.command()
def fetch(
    year: int = typer.Option(..., help="Season year"),
    start_week: int = typer.Option(5, help="First week to fetch"),
    end_week: int = typer.Option(15, help="Last week to fetch"),
) -> None:
    """Fetch FBS game data from CFBD into data/cache/."""
    api_key = get_api_key()
    games_df = fetch_season_games(year, start_week=start_week, api_key=api_key)
    games_df = games_df[games_df["week"] <= end_week]
    cache_dir = REPO_ROOT / "data" / "cache" / str(year)
    cache_dir.mkdir(parents=True, exist_ok=True)
    out = cache_dir / f"games_week{end_week}.parquet"
    games_df.to_parquet(out, index=False)
    typer.echo(f"Saved {len(games_df)} games to {out}")


@app.command()
def rank(
    year: int = typer.Option(..., help="Season year"),
    week: int = typer.Option(..., help="Analysis week"),
    sample: bool = typer.Option(False, help="Use bundled sample dataset"),
) -> None:
    """Compute composite rankings."""
    result = run_pipeline(_config(year, week), use_sample=sample)
    typer.echo(f"Rankings written to {result['paths']['rankings']}")


@app.command()
def select(
    year: int = typer.Option(..., help="Season year"),
    week: int = typer.Option(..., help="Analysis week"),
    sample: bool = typer.Option(False, help="Use bundled sample dataset"),
) -> None:
    """Select playoff field and seed teams."""
    result = run_pipeline(_config(year, week), use_sample=sample)
    sel = result["selection"]
    typer.echo(f"Selected {len(sel.playoff_teams)} teams. Audit: {result['paths']['audit']}")


@app.command()
def bracket(
    year: int = typer.Option(..., help="Season year"),
    week: int = typer.Option(..., help="Analysis week"),
    sample: bool = typer.Option(False, help="Use bundled sample dataset"),
) -> None:
    """Generate HTML bracket visualization."""
    result = run_pipeline(_config(year, week), use_sample=sample)
    typer.echo(f"Bracket written to {result['paths']['bracket']}")


@app.command(name="run")
def run_cmd(
    year: int = typer.Option(..., help="Season year"),
    week: int = typer.Option(..., help="Analysis week"),
    config: Optional[Path] = typer.Option(None, help="YAML config file"),
    sample: bool = typer.Option(False, help="Use bundled sample dataset"),
) -> None:
    """Run full pipeline with manifest."""
    cfg = SimulatorConfig.from_yaml(config) if config else _config(year, week)
    result = run_pipeline(cfg, use_sample=sample)
    typer.echo(f"Complete. Manifest: {result['paths']['manifest']}")


@app.command()
def validate(
    years: str = typer.Option("2014:2023", help="Year range e.g. 2014:2023"),
) -> None:
    """Run historical validation backtest."""
    if ":" in years:
        start, end = years.split(":")
        year_list = list(range(int(start), int(end) + 1))
    else:
        year_list = [int(y) for y in years.split(",")]

    df = run_multiple_seasons_backtest(year_list)
    out_dir = REPO_ROOT / "data" / "output" / "validation"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "backtest_results.csv"
    df.to_csv(out_path, index=False)
    typer.echo(f"Validation results written to {out_path}")
    typer.echo(df.to_string(index=False))


@app.command()
def reproduce(
    season: int = typer.Option(..., help="Season to reproduce"),
    week: int = typer.Option(15, help="Final week"),
) -> None:
    """Reproduce a season run with archived config snapshot."""
    cfg = _config(season, week)
    result = run_pipeline(cfg)
    typer.echo(f"Reproduced {season} week {week}. Manifest: {result['paths']['manifest']}")


@app.command()
def dashboard() -> None:
    """Launch Streamlit dashboard."""
    app_path = REPO_ROOT / "app" / "streamlit_app.py"
    subprocess.run([sys.executable, "-m", "streamlit", "run", str(app_path)], check=False)


if __name__ == "__main__":
    app()
