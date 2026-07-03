"""Tests for DuckDB run store writer."""

from __future__ import annotations

import pytest

from src.config.simulator import SimulatorConfig
from src.pipeline.run import run_pipeline
from src.store.connection import get_connection


@pytest.fixture
def isolated_store(tmp_path, monkeypatch):
    db_path = tmp_path / "selection_room.duckdb"
    monkeypatch.setattr("src.store.paths.DUCKDB_PATH", db_path)
    monkeypatch.setattr("src.store.connection.DUCKDB_PATH", db_path)
    monkeypatch.setattr("src.store.reader.DUCKDB_PATH", db_path)
    monkeypatch.setenv("SELECTION_ROOM_STORE_REQUIRED", "1")
    return db_path


def test_sample_run_writes_to_store(isolated_store):
    config = SimulatorConfig(year=2025, week=15)
    run_pipeline(config, use_sample=True)

    assert isolated_store.exists()

    with get_connection() as conn:
        run_row = conn.execute(
            "SELECT stem, season, week FROM runs WHERE stem = ?",
            ["2025_week15"],
        ).fetchone()
        assert run_row is not None
        assert run_row[0] == "2025_week15"
        assert run_row[1] == 2025
        assert run_row[2] == 15

        ranking_count = conn.execute(
            "SELECT COUNT(*) FROM rankings WHERE run_stem = ?",
            ["2025_week15"],
        ).fetchone()[0]
        assert ranking_count > 0

        resume_count = conn.execute(
            "SELECT COUNT(*) FROM team_resumes WHERE run_stem = ?",
            ["2025_week15"],
        ).fetchone()[0]
        assert resume_count > 0

        sensitivity_count = conn.execute(
            "SELECT COUNT(*) FROM sensitivity_teams WHERE run_stem = ?",
            ["2025_week15"],
        ).fetchone()[0]
        assert sensitivity_count > 0

        record_games_count = conn.execute(
            "SELECT COUNT(*) FROM record_games WHERE run_stem = ?",
            ["2025_week15"],
        ).fetchone()[0]
        assert record_games_count > 0

        field_slots = conn.execute(
            "SELECT COUNT(*) FROM field_slots WHERE run_stem = ?",
            ["2025_week15"],
        ).fetchone()[0]
        assert field_slots == 12
