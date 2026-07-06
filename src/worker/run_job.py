"""Hosted run worker orchestration."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import traceback
from io import TextIOBase
from pathlib import Path
from typing import Optional

from src.config.simulator import SimulatorConfig
from src.pipeline.paths import (
    API_ROOT,
    BASE_SCENARIO_ID,
    RunOutputPaths,
    apply_worker_output_env,
    build_run_label,
    run_id,
    scenario_stem,
    weights_scenario_id,
)
from src.pipeline.run import run_pipeline
from src.pipeline.weights import RankingWeights, parse_weight_overrides
from src.worker.artifact_keys import artifact_base_url, collect_artifact_uploads
from src.worker.postgres import HostedJobStore, WorkerJob
from src.worker.storage import StorageUploadError, SupabaseArtifactUploader


class _LogTee(TextIOBase):
    def __init__(self, original: TextIOBase, on_line) -> None:
        self._original = original
        self._on_line = on_line
        self._buffer = ""

    def write(self, s: str) -> int:
        self._original.write(s)
        self._buffer += s
        while "\n" in self._buffer:
            line, self._buffer = self._buffer.split("\n", 1)
            if line.strip():
                self._on_line(line)
        return len(s)

    def flush(self) -> None:
        self._original.flush()
        if self._buffer.strip():
            self._on_line(self._buffer)
            self._buffer = ""


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _weights_spec(weights: dict[str, float]) -> str:
    return ",".join(f"{key}={weights[key]}" for key in ("resume", "predictive", "sor", "sos"))


def _read_manifest(api_root: Path, stem: str) -> Optional[dict]:
    manifest_path = api_root.parent / "runs" / f"{stem}_manifest.json"
    if not manifest_path.is_file():
        return None
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def execute_run_job(job_id: str) -> int:
    database_url = _require_env("SELECTION_ROOM_DATABASE_URL")
    supabase_url = _require_env("SUPABASE_URL")
    service_role_key = _require_env("SUPABASE_SERVICE_ROLE_KEY")
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "artifacts").strip() or "artifacts"

    store = HostedJobStore(database_url)
    job = store.load_job(job_id)
    if not job:
        raise RuntimeError(f"Job not found: {job_id}")
    if job.status != "queued":
        raise RuntimeError(f"Job {job_id} is not runnable (status={job.status})")

    if not store.mark_running(job_id):
        raise RuntimeError(f"Job {job_id} is already running or complete")

    with tempfile.TemporaryDirectory(prefix="sroom-worker-") as tmp:
        output_root = Path(tmp) / "output"
        os.environ["SELECTION_ROOM_WORKER_DATA_OUTPUT"] = str(output_root)
        apply_worker_output_env()

        stdout_tee = _LogTee(sys.stdout, lambda line: store.append_log(job_id, line))
        stderr_tee = _LogTee(sys.stderr, lambda line: store.append_log(job_id, line))
        previous_stdout, previous_stderr = sys.stdout, sys.stderr
        sys.stdout, sys.stderr = stdout_tee, stderr_tee

        try:
            cfg = SimulatorConfig(year=job.season, week=job.week)
            scenario_id = BASE_SCENARIO_ID
            if job.weights:
                cfg.weights = parse_weight_overrides(
                    _weights_spec(job.weights),
                    RankingWeights(),
                )
                scenario_id = weights_scenario_id(cfg.weights)

            use_sample = job.data_source == "sample"
            result = run_pipeline(
                cfg,
                use_sample=use_sample,
                write_html=False,
                export_api=True,
                scenario_id=scenario_id,
            )
            paths = RunOutputPaths(
                year=job.season,
                week=job.week,
                scenario_id=scenario_id,
            )
            stem = paths.stem
            base_url = artifact_base_url(bucket, stem)

            uploader = SupabaseArtifactUploader(supabase_url, service_role_key, bucket)
            uploads = collect_artifact_uploads(API_ROOT, stem)
            if not uploads:
                raise RuntimeError(f"No JSON artifacts generated for stem={stem}")

            for local_path, storage_key in uploads:
                uploader.upload_json_file(local_path, storage_key)

            manifest = _read_manifest(API_ROOT, stem)
            store.upsert_run(
                stem=stem,
                season=job.season,
                week=job.week,
                source=job.data_source,
                scenario_id=scenario_id,
                artifact_base_url=base_url,
                label=build_run_label(job.season, job.week, scenario_id),
                config_hash=getattr(cfg, "config_hash", None),
                manifest_json=manifest,
            )

            if job.weights and scenario_id != BASE_SCENARIO_ID:
                base_stem = scenario_stem(run_id(job.season, job.week), BASE_SCENARIO_ID)
                if store.run_exists(base_stem):
                    store.upsert_scenario(
                        base_run_stem=base_stem,
                        scenario_run_stem=stem,
                        weights_json=job.weights,
                        artifact_base_url=base_url,
                    )
                else:
                    store.append_log(
                        job_id,
                        f"Warning: base run {base_stem} not in runs table; skipped scenarios row",
                    )

            store.mark_succeeded(
                job_id,
                stem=stem,
                artifact_base_url=base_url,
                exit_code=0,
            )
            return 0
        except (StorageUploadError, Exception) as exc:
            message = str(exc) or exc.__class__.__name__
            store.append_log(job_id, message)
            store.append_log(job_id, traceback.format_exc())
            store.mark_failed(job_id, error_message=message, exit_code=1)
            return 1
        finally:
            sys.stdout.flush()
            sys.stderr.flush()
            sys.stdout, sys.stderr = previous_stdout, previous_stderr
