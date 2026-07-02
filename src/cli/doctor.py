"""Environment diagnostics for sroom doctor."""

from __future__ import annotations

import shutil
import sys
from importlib import util
from typing import List, Tuple

from src.data.fetcher import get_api_key
from src.pipeline.paths import DATA_OUTPUT, REPO_ROOT, ensure_output_dirs
from src.pipeline.sample import SAMPLE_CHAMPIONS, SAMPLE_GAMES

CheckResult = Tuple[str, bool, str, bool]


def _module_available(name: str) -> bool:
    return util.find_spec(name) is not None


def run_doctor_checks() -> List[CheckResult]:
    checks: List[CheckResult] = []

    py_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    checks.append(("Python", True, py_version, False))

    try:
        import src  # noqa: F401

        checks.append(("Package import", True, "OK", False))
    except ImportError as exc:
        checks.append(("Package import", False, str(exc), False))

    try:
        get_api_key()
        checks.append(("CFBD API key", True, "found", False))
    except Exception:
        checks.append(
            (
                "CFBD API key",
                True,
                "missing (live data commands may fail; sample mode works)",
                True,
            )
        )

    if SAMPLE_GAMES.exists():
        checks.append(("Sample games", True, str(SAMPLE_GAMES), False))
    else:
        checks.append(("Sample games", False, "not found", False))

    if SAMPLE_CHAMPIONS.exists():
        checks.append(("Sample champions", True, str(SAMPLE_CHAMPIONS), False))
    else:
        checks.append(("Sample champions", False, "not found", False))

    assets = REPO_ROOT / "data" / "cache" / "team_assets.sample.json"
    if assets.exists():
        checks.append(("Team assets cache", True, str(assets), False))
    else:
        checks.append(("Team assets cache", False, "not found", False))

    ensure_output_dirs()
    probe = DATA_OUTPUT / ".write_probe"
    try:
        probe.write_text("ok")
        probe.unlink(missing_ok=True)
        checks.append(("Output directory", True, "writable", False))
    except OSError as exc:
        checks.append(("Output directory", False, str(exc), False))

    if _module_available("streamlit"):
        checks.append(("Streamlit", True, "installed", False))
    else:
        checks.append(("Streamlit", False, 'not installed (pip install -e ".[app]")', False))

    if shutil.which("sroom"):
        checks.append(("sroom CLI", True, "on PATH", False))
    else:
        checks.append(
            (
                "sroom CLI",
                True,
                'available via python -m (install with pip install -e ".[app]")',
                True,
            )
        )

    return checks
