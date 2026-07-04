"""Postgres access for the hosted run worker."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional

import psycopg
from psycopg.rows import dict_row

from src.worker.redaction import redact_log_line


@dataclass(frozen=True)
class WorkerJob:
    job_id: str
    status: str
    season: int
    week: int
    data_source: str
    weights: Optional[dict[str, float]]
    logs_text: str


class HostedJobStore:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    def _connect(self) -> psycopg.Connection[Any]:
        return psycopg.connect(self._database_url, row_factory=dict_row)

    def load_job(self, job_id: str) -> Optional[WorkerJob]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, status, requested_season, requested_week,
                           requested_source, scenario_weights_json, logs_text
                    FROM run_jobs
                    WHERE id = %s
                    LIMIT 1
                    """,
                    (job_id,),
                )
                row = cur.fetchone()
        if not row:
            return None
        weights = row["scenario_weights_json"]
        if isinstance(weights, str):
            weights = json.loads(weights)
        return WorkerJob(
            job_id=row["id"],
            status=row["status"],
            season=row["requested_season"],
            week=row["requested_week"],
            data_source=row["requested_source"],
            weights=weights,
            logs_text=row["logs_text"] or "",
        )

    def mark_running(self, job_id: str) -> bool:
        """Transition queued → running atomically. Returns False if not queued."""
        now = datetime.now(timezone.utc)
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE run_jobs
                    SET status = 'running', started_at = %s
                    WHERE id = %s AND status = 'queued'
                    RETURNING id
                    """,
                    (now, job_id),
                )
                updated = cur.fetchone() is not None
            conn.commit()
        return updated

    def append_log(self, job_id: str, line: str) -> None:
        safe = redact_log_line(line.strip())
        if not safe:
            return
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE run_jobs
                    SET logs_text = COALESCE(logs_text, '') || %s
                    WHERE id = %s
                    """,
                    (f"{safe}\n", job_id),
                )
            conn.commit()

    def mark_succeeded(
        self,
        job_id: str,
        *,
        stem: str,
        artifact_base_url: str,
        exit_code: int = 0,
    ) -> None:
        now = datetime.now(timezone.utc)
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE run_jobs
                    SET status = 'succeeded',
                        run_stem = %s,
                        artifact_base_url = %s,
                        error_message = NULL,
                        exit_code = %s,
                        finished_at = %s
                    WHERE id = %s
                    """,
                    (stem, artifact_base_url, exit_code, now, job_id),
                )
            conn.commit()

    def mark_failed(
        self,
        job_id: str,
        *,
        error_message: str,
        exit_code: Optional[int] = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        safe_error = redact_log_line(error_message)
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE run_jobs
                    SET status = 'failed',
                        error_message = %s,
                        exit_code = %s,
                        finished_at = %s
                    WHERE id = %s
                    """,
                    (safe_error, exit_code, now, job_id),
                )
            conn.commit()

    def run_exists(self, stem: str) -> bool:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM runs WHERE stem = %s LIMIT 1", (stem,))
                return cur.fetchone() is not None

    def upsert_run(
        self,
        *,
        stem: str,
        season: int,
        week: int,
        source: str,
        scenario_id: str,
        artifact_base_url: str,
        label: Optional[str] = None,
        config_hash: Optional[str] = None,
        manifest_json: Optional[dict[str, Any]] = None,
    ) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO runs (
                      stem, season, week, source, scenario_id, label,
                      config_hash, artifact_base_url, manifest_json
                    ) VALUES (
                      %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb
                    )
                    ON CONFLICT (stem) DO UPDATE SET
                      season = EXCLUDED.season,
                      week = EXCLUDED.week,
                      source = EXCLUDED.source,
                      scenario_id = EXCLUDED.scenario_id,
                      label = EXCLUDED.label,
                      config_hash = EXCLUDED.config_hash,
                      artifact_base_url = EXCLUDED.artifact_base_url,
                      manifest_json = EXCLUDED.manifest_json
                    """,
                    (
                        stem,
                        season,
                        week,
                        source,
                        scenario_id,
                        label,
                        config_hash,
                        artifact_base_url,
                        json.dumps(manifest_json) if manifest_json is not None else None,
                    ),
                )
            conn.commit()

    def upsert_scenario(
        self,
        *,
        base_run_stem: str,
        scenario_run_stem: str,
        weights_json: dict[str, float],
        artifact_base_url: str,
    ) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO scenarios (
                      base_run_stem, scenario_run_stem, weights_json, artifact_base_url
                    ) VALUES (%s, %s, %s::jsonb, %s)
                    ON CONFLICT (scenario_run_stem) DO UPDATE SET
                      base_run_stem = EXCLUDED.base_run_stem,
                      weights_json = EXCLUDED.weights_json,
                      artifact_base_url = EXCLUDED.artifact_base_url
                    """,
                    (
                        base_run_stem,
                        scenario_run_stem,
                        json.dumps(weights_json),
                        artifact_base_url,
                    ),
                )
            conn.commit()
