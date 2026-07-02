"""Predictable output paths for simulator runs."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_OUTPUT = REPO_ROOT / "data" / "output"


def run_stem(year: int, week: int) -> str:
    return f"{year}_week{week}"


def ensure_output_dirs() -> None:
    for subdir in (
        "rankings",
        "fields",
        "brackets",
        "audits",
        "validation",
        "reports",
        "runs",
    ):
        (DATA_OUTPUT / subdir).mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class RunOutputPaths:
    year: int
    week: int

    @property
    def stem(self) -> str:
        return run_stem(self.year, self.week)

    @property
    def rankings(self) -> Path:
        return DATA_OUTPUT / "rankings" / f"{self.stem}_rankings.csv"

    @property
    def field(self) -> Path:
        return DATA_OUTPUT / "fields" / f"{self.stem}_field.csv"

    @property
    def bracket(self) -> Path:
        return DATA_OUTPUT / "brackets" / f"{self.stem}_bracket.csv"

    @property
    def bracket_html(self) -> Path:
        return DATA_OUTPUT / "brackets" / f"{self.stem}_bracket.html"

    @property
    def audit(self) -> Path:
        return DATA_OUTPUT / "audits" / f"{self.stem}_audit.json"

    @property
    def manifest(self) -> Path:
        return DATA_OUTPUT / "runs" / f"{self.stem}_manifest.json"

    def as_dict(self) -> dict[str, Path]:
        return {
            "rankings": self.rankings,
            "field": self.field,
            "bracket": self.bracket,
            "bracket_html": self.bracket_html,
            "audit": self.audit,
            "manifest": self.manifest,
        }


def find_latest_manifest() -> Optional[Path]:
    runs_dir = DATA_OUTPUT / "runs"
    if not runs_dir.exists():
        return None
    manifests = sorted(
        runs_dir.glob("*_manifest.json"), key=lambda p: p.stat().st_mtime, reverse=True
    )
    return manifests[0] if manifests else None


def paths_from_manifest(manifest_path: Path) -> Optional[RunOutputPaths]:
    import json

    data = json.loads(manifest_path.read_text())
    season = data.get("season")
    week = data.get("week")
    if season is None or week is None:
        return None
    return RunOutputPaths(year=int(season), week=int(week))
