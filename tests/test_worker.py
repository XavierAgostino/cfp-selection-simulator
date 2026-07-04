"""Tests for hosted worker helpers."""

from __future__ import annotations

from pathlib import Path

from src.worker.artifact_keys import artifact_base_url, collect_artifact_uploads
from src.worker.redaction import redact_log_line


def test_redact_log_line_masks_secrets() -> None:
    line = "Using CFBD_API_KEY=super-secret and Bearer abc.def.ghi"
    redacted = redact_log_line(line)
    assert "super-secret" not in redacted
    assert "abc.def.ghi" not in redacted
    assert redacted.count("[REDACTED]") >= 2


def test_collect_artifact_uploads_maps_storage_keys(tmp_path: Path) -> None:
    api_root = tmp_path / "api"
    stem = "2025_week15"
    run_dir = api_root / "runs" / stem
    run_dir.mkdir(parents=True)
    (api_root / "runs.json").write_text("{}", encoding="utf-8")
    (run_dir / "rankings.json").write_text("{}", encoding="utf-8")
    (run_dir / "field.json").write_text("{}", encoding="utf-8")

    uploads = collect_artifact_uploads(api_root, stem)
    keys = dict(uploads)

    assert keys[api_root / "runs.json"] == "runs.json"
    assert keys[run_dir / "rankings.json"] == f"runs/{stem}/rankings.json"
    assert keys[run_dir / "field.json"] == f"runs/{stem}/field.json"


def test_artifact_base_url_format() -> None:
    assert artifact_base_url("artifacts", "2025_week15") == "supabase://artifacts/runs/2025_week15/"
