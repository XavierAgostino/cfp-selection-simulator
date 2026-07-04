"""Map local API export files to Supabase Storage object keys."""

from __future__ import annotations

from pathlib import Path

ROOT_ARTIFACT_FILES = (
    "runs.json",
    "latest.json",
    "team-assets.json",
)

PER_RUN_ARTIFACT_FILES = (
    "rankings.json",
    "field.json",
    "bracket.json",
    "audit.json",
    "team-resumes.json",
    "sensitivity.json",
)


def artifact_base_url(bucket: str, stem: str) -> str:
    return f"supabase://{bucket}/runs/{stem}/"


def collect_artifact_uploads(api_root: Path, stem: str) -> list[tuple[Path, str]]:
    """Return (local_path, storage_key) pairs for generated JSON artifacts."""
    uploads: list[tuple[Path, str]] = []

    for name in ROOT_ARTIFACT_FILES:
        local_path = api_root / name
        if local_path.is_file():
            uploads.append((local_path, name))

    run_dir = api_root / "runs" / stem
    for name in PER_RUN_ARTIFACT_FILES:
        local_path = run_dir / name
        if local_path.is_file():
            uploads.append((local_path, f"runs/{stem}/{name}"))

    return uploads
