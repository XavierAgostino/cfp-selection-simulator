"""Writes the JSON API artifacts (docs/api-contracts.md) for a pipeline run.

Layout under ``data/output/api/``::

    runs.json                      # index across all runs
    latest.json                    # meta for most recent run
    rankings.json field.json bracket.json audit.json team-resumes.json
    team-assets.json               # passthrough of the team asset cache
    runs/{stem}/                   # per-run dirs, same 5 files as above
"""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from src import __version__
from src.api_contracts.build import (
    build_audit_payload,
    build_bracket_payload,
    build_field_payload,
    build_rankings_payload,
    build_sensitivity_payload,
    build_team_resumes_payload,
    team_records_from_games,
)
from src.api_contracts.models import (
    LatestMeta,
    LatestRef,
    RunsIndex,
    RunsIndexEntry,
    TeamAssetsPayload,
)
from src.assets.teams import load_team_assets
from src.config.simulator import SimulatorConfig
from src.pipeline.paths import (
    API_ROOT,
    BASE_SCENARIO_ID,
    DATA_OUTPUT,
    RunOutputPaths,
    build_run_label,
    component_weights,
    run_id,
    run_stem,
)
from src.validation.sensitivity import run_weight_perturbation

FLAT_FILE_NAMES = {
    "rankings": "rankings.json",
    "field": "field.json",
    "bracket": "bracket.json",
    "audit": "audit.json",
    "team_resumes": "team-resumes.json",
    "sensitivity": "sensitivity.json",
}


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def regenerate_runs_index() -> Path:
    """Rebuild runs.json by scanning data/output/runs/*_manifest.json.

    Also used standalone by ``sroom export --index-only``.
    """
    runs_dir = DATA_OUTPUT / "runs"
    manifests = sorted(runs_dir.glob("*_manifest.json")) if runs_dir.exists() else []

    scored: List[tuple] = []
    for manifest_path in manifests:
        try:
            data = json.loads(manifest_path.read_text())
        except (json.JSONDecodeError, OSError):
            continue
        season = data.get("season")
        week = data.get("week")
        if season is None or week is None:
            continue
        stem = manifest_path.name[: -len("_manifest.json")]
        rid = data.get("run_id", run_stem(int(season), int(week)))
        scenario_id = data.get("scenario_id", BASE_SCENARIO_ID)
        run_api_dir = API_ROOT / "runs" / stem
        weights = data.get("weights") or {}
        entry = RunsIndexEntry(
            stem=stem,
            run_id=rid,
            scenario_id=scenario_id,
            season=int(season),
            week=int(week),
            ruleset=data.get("ruleset"),
            data_source=data.get("data_source", "cfbd"),
            champion_source=data.get("champion_source", "unknown"),
            generated_at=data.get("generated_at", ""),
            has_bracket=(run_api_dir / "bracket.json").exists(),
            has_sensitivity=(run_api_dir / "sensitivity.json").exists(),
            simulator_version=data.get("simulator_version", ""),
            config_hash=data.get("config_hash", ""),
            weights=weights,
            label=data.get(
                "label",
                build_run_label(int(season), int(week), scenario_id),
            ),
        )
        scored.append((manifest_path.stat().st_mtime, entry))

    scored.sort(key=lambda item: item[0])
    entries = [entry for _, entry in scored]

    latest_ref: Optional[LatestRef] = None
    if scored:
        _, newest = max(scored, key=lambda item: item[0])
        latest_ref = LatestRef(season=newest.season, week=newest.week, stem=newest.stem)

    index = RunsIndex(generated_at=_now_iso(), latest=latest_ref, runs=entries)
    index_path = API_ROOT / "runs.json"
    _write_text(index_path, index.model_dump_json(indent=2))
    return index_path


def _is_latest_run(paths: RunOutputPaths) -> bool:
    """True when this run's manifest is the most recently written manifest."""
    runs_dir = DATA_OUTPUT / "runs"
    if not runs_dir.exists():
        return True
    manifests = sorted(runs_dir.glob("*_manifest.json"), key=lambda p: p.stat().st_mtime)
    if not manifests:
        return True
    return manifests[-1].name == paths.manifest.name


def export_run_api(
    config: SimulatorConfig,
    result: Dict[str, Any],
    paths: RunOutputPaths,
) -> Dict[str, Path]:
    """Build + write the per-run API payloads, refresh flat/latest/index files."""
    rankings_df = result["rankings"]
    games_df = result.get("games")
    selection = result.get("selection")
    seeded_df = result.get("seeded")
    data_source: str = result.get("data_source", "cfbd")
    champion_source: str = result.get("champion_source", "unknown")
    use_sample = data_source == "sample"

    records = team_records_from_games(games_df)

    rankings_payload = build_rankings_payload(
        config, rankings_df, selection, seeded_df, records, use_sample
    )
    field_payload = build_field_payload(
        config, rankings_df, selection, seeded_df, records, use_sample
    )
    bracket_payload = build_bracket_payload(
        config, rankings_df, selection, seeded_df, records, use_sample
    )
    audit_payload = build_audit_payload(config, selection)
    team_resumes_payload = build_team_resumes_payload(
        config, rankings_df, selection, seeded_df, games_df, records, use_sample
    )

    sensitivity_payload = None
    if selection is not None:
        # Monte Carlo Selection Stability: reuses the precomputed component
        # scores in rankings_df; only the weighted composite is recomputed
        # per scenario (see src/validation/sensitivity.py).
        sensitivity_result = run_weight_perturbation(
            rankings_df,
            base_weights=config.weights,
            format_rules=config.playoff_format,
        )
        sensitivity_payload = build_sensitivity_payload(
            config, sensitivity_result, seeded_df, use_sample
        )

    run_dir = API_ROOT / "runs" / paths.stem
    written: Dict[str, Path] = {}

    def write_payload(key: str, payload) -> None:
        if payload is None:
            return
        rel = FLAT_FILE_NAMES[key]
        run_path = run_dir / rel
        _write_text(run_path, payload.model_dump_json(indent=2))
        written[key] = run_path

    write_payload("rankings", rankings_payload)
    write_payload("field", field_payload)
    write_payload("bracket", bracket_payload)
    write_payload("audit", audit_payload)
    write_payload("team_resumes", team_resumes_payload)
    write_payload("sensitivity", sensitivity_payload)

    is_latest = _is_latest_run(paths)
    if is_latest:
        for key, payload in (
            ("rankings", rankings_payload),
            ("field", field_payload),
            ("bracket", bracket_payload),
            ("audit", audit_payload),
            ("team_resumes", team_resumes_payload),
            ("sensitivity", sensitivity_payload),
        ):
            if payload is None:
                continue
            flat_path = API_ROOT / FLAT_FILE_NAMES[key]
            _write_text(flat_path, payload.model_dump_json(indent=2))
            written[f"flat_{key}"] = flat_path

        fmt = config.playoff_format
        generated_at = _now_iso()
        latest_meta = LatestMeta(
            simulator_version=__version__,
            season=config.year,
            week=config.week,
            stem=paths.stem,
            ruleset=fmt.name if fmt else None,
            seeding_mode=fmt.seeding if fmt else None,
            bye_rule=fmt.bye_rule if fmt else None,
            data_source=data_source,  # type: ignore[arg-type]
            champion_source=champion_source,
            config_hash=config.config_hash,
            generated_at=generated_at,
            assets_source="sample" if use_sample else "cache",
            # Only the four sum-to-1 component weights; colley_share is an
            # internal resume mix, not a composite component.
            weights={
                k: v
                for k, v in asdict(config.weights).items()
                if k in ("resume", "predictive", "sor", "sos")
            },
            counts={
                "n_games": len(games_df) if games_df is not None else 0,
                "n_teams": len(rankings_df),
            },
            has_bracket=bracket_payload is not None,
        )
        latest_path = API_ROOT / "latest.json"
        _write_text(latest_path, latest_meta.model_dump_json(indent=2))
        written["latest"] = latest_path

    assets = load_team_assets(use_sample=use_sample)
    assets_payload = TeamAssetsPayload({name: asset.to_dict() for name, asset in assets.items()})
    assets_path = API_ROOT / "team-assets.json"
    _write_text(assets_path, assets_payload.model_dump_json(indent=2))
    written["team_assets"] = assets_path

    written["runs_index"] = regenerate_runs_index()
    return written
