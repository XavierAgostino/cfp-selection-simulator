"""Hosted worker CLI commands."""

from __future__ import annotations

import typer

worker_app = typer.Typer(
    name="worker",
    help="Hosted run worker commands (Postgres + Supabase Storage).",
    no_args_is_help=True,
)


@worker_app.command("run-job")
def run_job_cmd(
    job_id: str = typer.Argument(..., help="Hosted run_jobs.id to execute"),
) -> None:
    """Run a queued hosted job: engine export → Supabase upload → Postgres metadata."""
    from src.worker.run_job import execute_run_job

    code = execute_run_job(job_id)
    raise typer.Exit(code=code)
