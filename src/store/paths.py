"""Paths for the DuckDB run store."""

from __future__ import annotations

from pathlib import Path

from src.pipeline.paths import DATA_OUTPUT

DUCKDB_PATH: Path = DATA_OUTPUT / "selection_room.duckdb"
