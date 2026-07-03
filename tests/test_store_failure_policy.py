"""Tests for DuckDB store write failure policy."""

from __future__ import annotations

import pytest

from src.api_contracts.export import export_run_api
from src.config.simulator import SimulatorConfig
from src.pipeline.paths import RunOutputPaths
from src.pipeline.run import run_pipeline
from src.store.policy import store_required
from src.store.writer import StoreWriteError


def test_store_required_default(monkeypatch):
    monkeypatch.delenv("SELECTION_ROOM_STORE_REQUIRED", raising=False)
    assert store_required() is True


def test_store_optional_env(monkeypatch):
    monkeypatch.setenv("SELECTION_ROOM_STORE_REQUIRED", "0")
    assert store_required() is False


def test_export_fails_when_store_required_and_write_fails(monkeypatch, tmp_path):
    db_path = tmp_path / "selection_room.duckdb"
    monkeypatch.setattr("src.store.paths.DUCKDB_PATH", db_path)
    monkeypatch.setattr("src.store.connection.DUCKDB_PATH", db_path)
    monkeypatch.setenv("SELECTION_ROOM_STORE_REQUIRED", "1")

    config = SimulatorConfig(year=2025, week=15)
    result = run_pipeline(config, use_sample=True)
    paths = RunOutputPaths(year=config.year, week=config.week)

    def fail_write(*_args, **_kwargs):
        raise StoreWriteError("simulated store failure")

    monkeypatch.setattr("src.api_contracts.export.write_run_to_store", fail_write)

    with pytest.raises(StoreWriteError, match="simulated store failure"):
        export_run_api(config, result, paths)


def test_export_continues_when_store_optional(monkeypatch, tmp_path):
    db_path = tmp_path / "selection_room.duckdb"
    monkeypatch.setattr("src.store.paths.DUCKDB_PATH", db_path)
    monkeypatch.setattr("src.store.connection.DUCKDB_PATH", db_path)
    monkeypatch.setenv("SELECTION_ROOM_STORE_REQUIRED", "0")

    config = SimulatorConfig(year=2025, week=15)
    result = run_pipeline(config, use_sample=True)
    paths = RunOutputPaths(year=config.year, week=config.week)

    def fail_write(*_args, **_kwargs):
        raise StoreWriteError("simulated store failure")

    monkeypatch.setattr("src.api_contracts.export.write_run_to_store", fail_write)

    written = export_run_api(config, result, paths)
    assert "rankings" in written
