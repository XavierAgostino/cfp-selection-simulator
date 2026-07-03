"""Write pipeline outputs to the DuckDB run store."""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any, Dict, Optional

import pandas as pd

from src.api_contracts.models import (
    AuditPayload,
    BracketPayload,
    FieldPayload,
    RankingsPayload,
    SensitivityPayload,
    TeamResumesPayload,
)
from src.config.simulator import SimulatorConfig
from src.pipeline.paths import RunOutputPaths
from src.store.connection import get_connection
from src.store.mappers import (
    map_audit,
    map_bracket,
    map_field,
    map_rankings,
    map_record_games,
    map_run_row,
    map_sensitivity,
    map_team_resumes,
    rows_to_dataframe,
)
from src.store.schema import RUN_TABLES

logger = logging.getLogger(__name__)


class StoreWriteError(Exception):
    """Raised when a required store write fails."""


def _delete_run(conn, run_stem: str) -> None:
    for table in RUN_TABLES:
        conn.execute(f"DELETE FROM {table} WHERE run_stem = ?", [run_stem])
    conn.execute("DELETE FROM runs WHERE stem = ?", [run_stem])


def _insert_rows(conn, table: str, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    df = rows_to_dataframe(rows)
    conn.register("_insert_df", df)
    cols = ", ".join(df.columns)
    conn.execute(f"INSERT INTO {table} ({cols}) SELECT {cols} FROM _insert_df")
    conn.unregister("_insert_df")
    return len(rows)


def upsert_run_data(
    run_stem: str,
    run_row: dict[str, Any],
    *,
    rankings: Optional[list[dict[str, Any]]] = None,
    field_slots: Optional[list[dict[str, Any]]] = None,
    field_bubble: Optional[list[dict[str, Any]]] = None,
    bracket_pods: Optional[list[dict[str, Any]]] = None,
    bracket_rounds: Optional[list[dict[str, Any]]] = None,
    audit_steps: Optional[list[dict[str, Any]]] = None,
    team_resumes: Optional[list[dict[str, Any]]] = None,
    team_schedule: Optional[list[dict[str, Any]]] = None,
    sensitivity_teams: Optional[list[dict[str, Any]]] = None,
    record_games: Optional[list[dict[str, Any]]] = None,
) -> dict[str, int]:
    """Replace all store rows for a run stem. Returns per-table insert counts."""
    counts: dict[str, int] = {}
    try:
        with get_connection() as conn:
            _delete_run(conn, run_stem)
            cols = ", ".join(run_row.keys())
            placeholders = ", ".join("?" for _ in run_row)
            conn.execute(
                f"INSERT INTO runs ({cols}) VALUES ({placeholders})",
                list(run_row.values()),
            )
            counts["runs"] = 1
            counts["rankings"] = _insert_rows(conn, "rankings", rankings or [])
            counts["field_slots"] = _insert_rows(conn, "field_slots", field_slots or [])
            counts["field_bubble"] = _insert_rows(conn, "field_bubble", field_bubble or [])
            counts["bracket_pods"] = _insert_rows(conn, "bracket_pods", bracket_pods or [])
            counts["bracket_rounds"] = _insert_rows(conn, "bracket_rounds", bracket_rounds or [])
            counts["audit_steps"] = _insert_rows(conn, "audit_steps", audit_steps or [])
            counts["team_resumes"] = _insert_rows(conn, "team_resumes", team_resumes or [])
            counts["team_schedule"] = _insert_rows(conn, "team_schedule", team_schedule or [])
            counts["sensitivity_teams"] = _insert_rows(
                conn, "sensitivity_teams", sensitivity_teams or []
            )
            counts["record_games"] = _insert_rows(conn, "record_games", record_games or [])
    except Exception as exc:
        raise StoreWriteError(str(exc)) from exc
    return counts


def write_run_to_store(
    config: SimulatorConfig,
    paths: RunOutputPaths,
    result: Dict[str, Any],
    *,
    payloads: Dict[str, Any],
    record_games_df: Optional[pd.DataFrame],
    generated_at: str,
) -> dict[str, int]:
    """Dual-write hook: persist export payloads + record_games snapshot to DuckDB."""
    stem = paths.stem
    data_source: str = result.get("data_source", "cfbd")
    champion_source: str = result.get("champion_source", "unknown")
    record_meta_dict = result.get("record_meta")
    weights = {
        k: float(v)
        for k, v in asdict(config.weights).items()
        if k in ("resume", "predictive", "sor", "sos")
    }

    rankings_payload: RankingsPayload = payloads["rankings"]
    field_payload: Optional[FieldPayload] = payloads.get("field")
    bracket_payload: Optional[BracketPayload] = payloads.get("bracket")
    audit_payload: Optional[AuditPayload] = payloads.get("audit")
    team_resumes_payload: TeamResumesPayload = payloads["team_resumes"]
    sensitivity_payload: Optional[SensitivityPayload] = payloads.get("sensitivity")

    run_row = map_run_row(
        config,
        paths,
        data_source=data_source,
        champion_source=champion_source,
        generated_at=generated_at,
        has_bracket=bracket_payload is not None,
        has_sensitivity=sensitivity_payload is not None,
        record_meta=record_meta_dict,
        weights=weights,
    )

    field_slots: list[dict[str, Any]] = []
    field_bubble: list[dict[str, Any]] = []
    if field_payload is not None:
        field_slots, field_bubble = map_field(field_payload, stem)

    bracket_pods: list[dict[str, Any]] = []
    bracket_rounds: list[dict[str, Any]] = []
    if bracket_payload is not None:
        bracket_pods, bracket_rounds = map_bracket(bracket_payload, stem)

    audit_steps = map_audit(audit_payload, stem) if audit_payload else []
    resume_rows, schedule_rows = map_team_resumes(team_resumes_payload, stem)
    sensitivity_rows = (
        map_sensitivity(sensitivity_payload, stem) if sensitivity_payload else []
    )
    record_game_rows = map_record_games(record_games_df, stem) if record_games_df is not None else []

    return upsert_run_data(
        stem,
        run_row,
        rankings=map_rankings(rankings_payload, stem),
        field_slots=field_slots,
        field_bubble=field_bubble,
        bracket_pods=bracket_pods,
        bracket_rounds=bracket_rounds,
        audit_steps=audit_steps,
        team_resumes=resume_rows,
        team_schedule=schedule_rows,
        sensitivity_teams=sensitivity_rows,
        record_games=record_game_rows,
    )
