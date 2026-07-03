"""Predictable output paths for simulator runs."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_OUTPUT = REPO_ROOT / "data" / "output"
API_ROOT = DATA_OUTPUT / "api"


def run_stem(year: int, week: int) -> str:
    return f"{year}_week{week}"


BASE_SCENARIO_ID = "base"


def run_id(year: int, week: int) -> str:
    """Season/week identity shared by base and scenario variants."""
    return run_stem(year, week)


def scenario_stem(run_id_value: str, scenario_id: str) -> str:
    """Unique API directory stem. Base runs keep the run_id; scenarios append the id."""
    if scenario_id == BASE_SCENARIO_ID:
        return run_id_value
    return f"{run_id_value}__{scenario_id}"


def weights_scenario_id(weights) -> str:
    """Deterministic scenario id from the four composite weights.

    ``w{resume}-{predictive}-{sor}-{sos}`` using whole-percent rounding, e.g.
    resume 0.45 / predictive 0.25 / sor 0.20 / sos 0.10 -> ``w45-25-20-10``.
    Idempotent: the same weights always map to the same id (and stem), so
    relaunching a scenario overwrites it instead of piling up runs. Weights
    equal to the engine defaults collapse to :data:`BASE_SCENARIO_ID`.
    """
    from src.pipeline.weights import RankingWeights

    components = component_weights(weights)
    defaults = component_weights(RankingWeights())
    if all(
        abs(components.get(key, 0.0) - value) < 1e-9
        for key, value in defaults.items()
    ):
        return BASE_SCENARIO_ID
    return "w" + "-".join(
        str(round(components[key] * 100))
        for key in ("resume", "predictive", "sor", "sos")
    )


def build_run_label(season: int, week: int, scenario_id: str) -> str:
    base = f"{season} Week {week}"
    if scenario_id == BASE_SCENARIO_ID:
        return f"{base} · Base"
    return f"{base} · {scenario_id}"


def component_weights(weights) -> dict[str, float]:
    """The four sum-to-1 composite weights (excludes resume-internal colley_share)."""
    from dataclasses import asdict

    return {
        k: float(v)
        for k, v in asdict(weights).items()
        if k in ("resume", "predictive", "sor", "sos")
    }


def ensure_output_dirs() -> None:
    for subdir in (
        "rankings",
        "fields",
        "brackets",
        "audits",
        "validation",
        "reports",
        "runs",
        "api",
    ):
        (DATA_OUTPUT / subdir).mkdir(parents=True, exist_ok=True)
    (API_ROOT / "runs").mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class RunOutputPaths:
    year: int
    week: int
    scenario_id: str = BASE_SCENARIO_ID

    @property
    def stem(self) -> str:
        return scenario_stem(run_stem(self.year, self.week), self.scenario_id)

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

    @property
    def api_dir(self) -> Path:
        return API_ROOT / "runs" / self.stem

    @property
    def api_rankings(self) -> Path:
        return self.api_dir / "rankings.json"

    @property
    def api_field(self) -> Path:
        return self.api_dir / "field.json"

    @property
    def api_bracket(self) -> Path:
        return self.api_dir / "bracket.json"

    @property
    def api_audit(self) -> Path:
        return self.api_dir / "audit.json"

    @property
    def api_team_resumes(self) -> Path:
        return self.api_dir / "team-resumes.json"

    def as_dict(self) -> dict[str, Path]:
        return {
            "rankings": self.rankings,
            "field": self.field,
            "bracket": self.bracket,
            "bracket_html": self.bracket_html,
            "audit": self.audit,
            "manifest": self.manifest,
        }

    def api_as_dict(self) -> dict[str, Path]:
        return {
            "rankings": self.api_rankings,
            "field": self.api_field,
            "bracket": self.api_bracket,
            "audit": self.api_audit,
            "team_resumes": self.api_team_resumes,
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
    scenario_id = data.get("scenario_id", BASE_SCENARIO_ID)
    return RunOutputPaths(year=int(season), week=int(week), scenario_id=scenario_id)
