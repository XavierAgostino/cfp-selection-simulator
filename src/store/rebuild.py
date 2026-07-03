"""Rebuild DuckDB from existing API JSON exports."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.api_contracts.models import (
    AuditPayload,
    BracketPayload,
    FieldPayload,
    RankingsPayload,
    SensitivityPayload,
    TeamResumesPayload,
)
from src.pipeline.paths import API_ROOT, DATA_OUTPUT
from src.store.mappers import (
    map_audit,
    map_bracket,
    map_field,
    map_rankings,
    map_run_row_from_index,
    map_sensitivity,
    map_team_resumes,
)
from src.store.writer import upsert_run_data

logger = logging.getLogger(__name__)

PAYLOAD_FILES = {
    "rankings": ("rankings.json", RankingsPayload),
    "field": ("field.json", FieldPayload),
    "bracket": ("bracket.json", BracketPayload),
    "audit": ("audit.json", AuditPayload),
    "team_resumes": ("team-resumes.json", TeamResumesPayload),
    "sensitivity": ("sensitivity.json", SensitivityPayload),
}


def _load_manifest(stem: str) -> Optional[dict[str, Any]]:
    path = DATA_OUTPUT / "runs" / f"{stem}_manifest.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def _load_payload(run_dir: Path, key: str) -> Optional[Any]:
    filename, model = PAYLOAD_FILES[key]
    path = run_dir / filename
    if not path.exists():
        return None
    return model.model_validate(json.loads(path.read_text()))


def rebuild_from_api(api_root: Path | None = None) -> dict[str, Any]:
    """Rebuild payload-derived tables from per-run API JSON. Skips record_games."""
    root = api_root or API_ROOT
    runs_dir = root / "runs"
    if not runs_dir.exists():
        return {"runs_processed": 0, "skipped": [], "warnings": ["No API runs directory found"]}

    warnings: List[str] = [
        "record_games skipped: not present in API JSON exports (only written on live export)"
    ]
    skipped: List[str] = []
    processed = 0

    for run_dir in sorted(runs_dir.iterdir()):
        if not run_dir.is_dir():
            continue
        stem = run_dir.name
        manifest = _load_manifest(stem)
        rankings = _load_payload(run_dir, "rankings")
        team_resumes = _load_payload(run_dir, "team_resumes")
        if rankings is None or team_resumes is None:
            skipped.append(stem)
            continue

        record_meta = None
        if rankings.record_meta is not None:
            record_meta = rankings.record_meta.model_dump()
        elif manifest and manifest.get("record_meta"):
            record_meta = manifest["record_meta"]

        if manifest:
            entry = {
                "stem": stem,
                "run_id": manifest.get("run_id", stem),
                "scenario_id": manifest.get("scenario_id", "base"),
                "label": manifest.get("label", stem),
                "season": manifest.get("season", rankings.season),
                "week": manifest.get("week", rankings.week),
                "ruleset": manifest.get("ruleset"),
                "data_source": manifest.get("data_source", "cfbd"),
                "champion_source": manifest.get("champion_source", "unknown"),
                "config_hash": manifest.get("config_hash", ""),
                "simulator_version": manifest.get("simulator_version", ""),
                "generated_at": manifest.get("generated_at", rankings.generated_at),
                "has_bracket": (run_dir / "bracket.json").exists(),
                "has_sensitivity": (run_dir / "sensitivity.json").exists(),
                "weights": manifest.get("weights", {}),
            }
        else:
            entry = {
                "stem": stem,
                "run_id": stem,
                "scenario_id": "base",
                "label": stem,
                "season": rankings.season,
                "week": rankings.week,
                "ruleset": None,
                "data_source": "cfbd",
                "champion_source": "unknown",
                "config_hash": "",
                "simulator_version": "",
                "generated_at": rankings.generated_at,
                "has_bracket": (run_dir / "bracket.json").exists(),
                "has_sensitivity": (run_dir / "sensitivity.json").exists(),
                "weights": {},
            }

        run_row = map_run_row_from_index(entry, record_meta)
        field_payload = _load_payload(run_dir, "field")
        bracket_payload = _load_payload(run_dir, "bracket")
        audit_payload = _load_payload(run_dir, "audit")
        sensitivity_payload = _load_payload(run_dir, "sensitivity")

        field_slots: list[dict[str, Any]] = []
        field_bubble: list[dict[str, Any]] = []
        if field_payload is not None:
            field_slots, field_bubble = map_field(field_payload, stem)

        bracket_pods: list[dict[str, Any]] = []
        bracket_rounds: list[dict[str, Any]] = []
        if bracket_payload is not None:
            bracket_pods, bracket_rounds = map_bracket(bracket_payload, stem)

        audit_steps = map_audit(audit_payload, stem) if audit_payload else []
        resume_rows, schedule_rows = map_team_resumes(team_resumes, stem)
        sensitivity_rows = (
            map_sensitivity(sensitivity_payload, stem) if sensitivity_payload else []
        )

        upsert_run_data(
            stem,
            run_row,
            rankings=map_rankings(rankings, stem),
            field_slots=field_slots,
            field_bubble=field_bubble,
            bracket_pods=bracket_pods,
            bracket_rounds=bracket_rounds,
            audit_steps=audit_steps,
            team_resumes=resume_rows,
            team_schedule=schedule_rows,
            sensitivity_teams=sensitivity_rows,
            record_games=None,
        )
        processed += 1

    return {
        "runs_processed": processed,
        "skipped": skipped,
        "warnings": warnings,
    }
