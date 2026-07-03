"""Query the DuckDB run store."""

from __future__ import annotations

import json
import json
import re
from typing import Literal, Optional

import duckdb
import pandas as pd

from src.store.connection import get_connection
from src.store.paths import DUCKDB_PATH
from src.store.schema import STORE_SCHEMA_VERSION

QueryFormat = Literal["table", "csv", "json"]


def store_status() -> dict[str, object]:
    if not DUCKDB_PATH.exists():
        return {
            "path": str(DUCKDB_PATH),
            "exists": False,
            "schema_version": STORE_SCHEMA_VERSION,
            "run_count": 0,
            "last_generated_at": None,
        }
    with get_connection() as conn:
        run_count = conn.execute("SELECT COUNT(*) FROM runs").fetchone()[0]
        last = conn.execute(
            "SELECT generated_at FROM runs ORDER BY generated_at DESC LIMIT 1"
        ).fetchone()
        schema_row = conn.execute(
            "SELECT schema_version FROM store_meta ORDER BY migrated_at DESC LIMIT 1"
        ).fetchone()
    return {
        "path": str(DUCKDB_PATH),
        "exists": True,
        "schema_version": schema_row[0] if schema_row else STORE_SCHEMA_VERSION,
        "run_count": run_count,
        "last_generated_at": last[0] if last else None,
    }


def list_runs(limit: int = 50) -> pd.DataFrame:
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT stem, label, season, week, scenario_id, data_source,
                   has_bracket, has_sensitivity, generated_at
            FROM runs
            ORDER BY generated_at DESC
            LIMIT ?
            """,
            [limit],
        ).df()


def list_catalog_runs(limit: int = 100) -> list[dict[str, object]]:
    """Full run metadata for web catalog (mirrors runs.json RunSummary fields)."""
    if not DUCKDB_PATH.exists():
        return []
    with get_connection() as conn:
        df = conn.execute(
            """
            SELECT stem, run_id, scenario_id, label, season, week, ruleset,
                   data_source, champion_source, generated_at, has_bracket,
                   has_sensitivity, simulator_version, config_hash, weights
            FROM runs
            ORDER BY generated_at DESC
            LIMIT ?
            """,
            [limit],
        ).df()
    if df.empty:
        return []
    records: list[dict[str, object]] = df.to_dict(orient="records")  # type: ignore[assignment]
    for rec in records:
        weights = rec.get("weights")
        if isinstance(weights, str):
            rec["weights"] = json.loads(weights)
    return records


def _apply_limit(sql: str, limit: int) -> str:
    stripped = sql.strip().rstrip(";")
    if re.search(r"\blimit\b", stripped, re.IGNORECASE):
        return stripped
    return f"{stripped} LIMIT {limit}"


def execute_query(
    sql: str,
    *,
    limit: int = 100,
    fmt: QueryFormat = "table",
) -> str:
    bounded = _apply_limit(sql, limit)
    with get_connection() as conn:
        df = conn.execute(bounded).df()
    if fmt == "json":
        return df.to_json(orient="records", indent=2)
    if fmt == "csv":
        return df.to_csv(index=False)
    if df.empty:
        return "(no rows)"
    return df.to_string(index=False)


def table_exists(conn: duckdb.DuckDBPyConnection, name: str) -> bool:
    row = conn.execute(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?",
        [name],
    ).fetchone()
    return bool(row and row[0] > 0)
