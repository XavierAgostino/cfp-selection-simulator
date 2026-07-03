"""DuckDB connection helpers."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import duckdb

from src.store.paths import DUCKDB_PATH
from src.store.schema import ensure_schema


@contextmanager
def get_connection() -> Iterator[duckdb.DuckDBPyConnection]:
    DUCKDB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = duckdb.connect(str(DUCKDB_PATH))
    try:
        ensure_schema(conn)
        yield conn
    finally:
        conn.close()
