"""CLI commands for the DuckDB run store."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import typer

from src.store.paths import DUCKDB_PATH
from src.store.reader import execute_query, list_runs, store_status
from src.store.rebuild import rebuild_from_api

store_app = typer.Typer(help="DuckDB run store — local analytical queries")


@store_app.command("status")
def store_status_cmd() -> None:
    """Show store path, schema version, and run count."""
    info = store_status()
    typer.echo(f"Path: {info['path']}")
    typer.echo(f"Exists: {info['exists']}")
    typer.echo(f"Schema version: {info['schema_version']}")
    typer.echo(f"Run count: {info['run_count']}")
    if info["last_generated_at"]:
        typer.echo(f"Last generated_at: {info['last_generated_at']}")


@store_app.command("runs")
def store_runs_cmd(
    limit: int = typer.Option(50, help="Maximum runs to list"),
) -> None:
    """List runs in the store (newest first)."""
    if not DUCKDB_PATH.exists():
        typer.echo("Store not found. Run sroom export or sroom run first.")
        raise typer.Exit(code=1)
    df = list_runs(limit=limit)
    if df.empty:
        typer.echo("(no runs)")
        return
    typer.echo(df.to_string(index=False))


@store_app.command("query")
def store_query_cmd(
    sql: str = typer.Argument(..., help="SQL query to run against the store"),
    limit: int = typer.Option(100, help="Default LIMIT when SQL omits one"),
    format: str = typer.Option(
        "table",
        "--format",
        help="Output format: table, csv, or json",
    ),
) -> None:
    """Run a SQL query against the DuckDB store."""
    if not DUCKDB_PATH.exists():
        typer.echo("Store not found. Run sroom export or sroom run first.")
        raise typer.Exit(code=1)
    fmt = format.lower()
    if fmt not in ("table", "csv", "json"):
        raise typer.BadParameter("--format must be table, csv, or json")
    try:
        output = execute_query(sql, limit=limit, fmt=fmt)  # type: ignore[arg-type]
    except Exception as exc:
        typer.echo(f"Query failed: {exc}", err=True)
        raise typer.Exit(code=1) from exc
    typer.echo(output)


@store_app.command("rebuild")
def store_rebuild_cmd(
    from_api: bool = typer.Option(
        True,
        "--from-api/--no-from-api",
        help="Rebuild from data/output/api/runs/* JSON",
    ),
    api_root: Optional[Path] = typer.Option(
        None,
        help="Override API root (default: data/output/api)",
    ),
) -> None:
    """Rebuild the DuckDB store from existing API JSON exports."""
    if not from_api:
        typer.echo("Only --from-api is supported in this milestone.")
        raise typer.Exit(code=1)
    result = rebuild_from_api(api_root)
    typer.echo(f"Runs processed: {result['runs_processed']}")
    if result["skipped"]:
        typer.echo(f"Skipped (missing rankings/resumes): {', '.join(result['skipped'])}")
    for warning in result.get("warnings", []):
        typer.echo(f"Warning: {warning}")
