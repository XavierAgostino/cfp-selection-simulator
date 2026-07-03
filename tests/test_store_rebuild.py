"""Tests for DuckDB store rebuild from API JSON."""

from __future__ import annotations

import pytest

from src.config.simulator import SimulatorConfig
from src.pipeline.run import run_pipeline
from src.store.connection import get_connection
from src.store.rebuild import rebuild_from_api


@pytest.fixture
def isolated_store(tmp_path, monkeypatch):
    db_path = tmp_path / "selection_room.duckdb"
    monkeypatch.setattr("src.store.paths.DUCKDB_PATH", db_path)
    monkeypatch.setattr("src.store.connection.DUCKDB_PATH", db_path)
    monkeypatch.setattr("src.store.reader.DUCKDB_PATH", db_path)
    monkeypatch.setenv("SELECTION_ROOM_STORE_REQUIRED", "1")
    return db_path


def _snapshot_run(stem: str) -> dict[str, int]:
    with get_connection() as conn:
        return {
            "rankings": conn.execute(
                "SELECT COUNT(*) FROM rankings WHERE run_stem = ?", [stem]
            ).fetchone()[0],
            "team_resumes": conn.execute(
                "SELECT COUNT(*) FROM team_resumes WHERE run_stem = ?", [stem]
            ).fetchone()[0],
            "sensitivity_teams": conn.execute(
                "SELECT COUNT(*) FROM sensitivity_teams WHERE run_stem = ?", [stem]
            ).fetchone()[0],
            "record_games": conn.execute(
                "SELECT COUNT(*) FROM record_games WHERE run_stem = ?", [stem]
            ).fetchone()[0],
        }


def test_rebuild_from_api_restores_payload_tables(isolated_store):
    config = SimulatorConfig(year=2025, week=15)
    run_pipeline(config, use_sample=True)
    stem = "2025_week15"

    before = _snapshot_run(stem)
    assert before["rankings"] > 0
    assert before["team_resumes"] > 0
    assert before["sensitivity_teams"] > 0
    assert before["record_games"] > 0

    isolated_store.unlink()

    result = rebuild_from_api()
    assert result["runs_processed"] >= 1
    assert any("record_games skipped" in w for w in result["warnings"])

    after = _snapshot_run(stem)
    assert after["rankings"] == before["rankings"]
    assert after["team_resumes"] == before["team_resumes"]
    assert after["sensitivity_teams"] == before["sensitivity_teams"]
    assert after["record_games"] == 0
