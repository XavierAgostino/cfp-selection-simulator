"""Terminal output helpers for the CLI."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Iterable, List, Optional

import typer

from src.config.simulator import SimulatorConfig


def _status(ok: bool, warning: bool = False) -> str:
    if ok:
        return "✓"
    if warning:
        return "⚠"
    return "✗"


def print_run_summary(
    config: SimulatorConfig,
    *,
    data_source: str,
    steps: Iterable[str],
    paths: Dict[str, Path],
    sample: bool,
) -> None:
    typer.echo("")
    typer.echo("CFP Simulator Run")
    typer.echo(f"Season:  {config.year}")
    typer.echo(f"Week:    {config.week}")
    typer.echo(f"Ruleset: {config.playoff_format.name if config.playoff_format else 'n/a'}")
    typer.echo(f"Mode:    {config.mode}")
    typer.echo(f"Data:    {'sample' if sample else data_source}")
    typer.echo("")
    typer.echo("Steps:")
    for step in steps:
        typer.echo(f"  {_status(True)} {step}")
    typer.echo("")
    typer.echo("Outputs:")
    labels = {
        "rankings": "Rankings",
        "field": "Field",
        "bracket": "Bracket",
        "bracket_html": "Bracket HTML",
        "audit": "Audit",
        "manifest": "Manifest",
    }
    for key, label in labels.items():
        path = paths.get(key)
        if path and path.exists():
            typer.echo(f"  {label + ':':12} {path}")


def print_doctor_report(checks: List[tuple[str, bool, str, bool]]) -> None:
    """Print environment check lines: (label, ok, detail, is_warning)."""
    typer.echo("")
    typer.echo("CFP Simulator Environment Check")
    typer.echo("")
    for label, ok, detail, is_warning in checks:
        icon = _status(ok, warning=is_warning and ok)
        typer.echo(f"  {icon} {label}: {detail}")
    typer.echo("")


def print_latest_outputs(
    *,
    season: int,
    week: int,
    ruleset: Optional[str],
    generated_at: Optional[str],
    paths: Dict[str, Path],
) -> None:
    typer.echo("")
    typer.echo("Latest run:")
    typer.echo(f"  Season:    {season}")
    typer.echo(f"  Week:      {week}")
    typer.echo(f"  Ruleset:   {ruleset or 'n/a'}")
    if generated_at:
        typer.echo(f"  Generated: {generated_at}")
    typer.echo("  Files:")
    labels = {
        "rankings": "Rankings",
        "field": "Field",
        "bracket": "Bracket",
        "bracket_html": "Bracket HTML",
        "audit": "Audit",
        "manifest": "Manifest",
    }
    for key, label in labels.items():
        path = paths.get(key)
        if path and path.exists():
            typer.echo(f"    - {label}: {path}")
