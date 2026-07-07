"""Calibration/ablation research harness (v2 research mode).

Runs controlled weight experiments against the historical validation tracks
and applies a research quality gate: every experiment reports deltas vs the
production baseline, per-year metrics, holdout behavior (2022, 2024), and a
decision label with a reason. This is research tooling — it never changes the
default production weights.
"""

from src.calibration.decisions import Thresholds, decide
from src.calibration.emulation import (
    build_committee_emulation_summary,
    write_committee_emulation_outputs,
)
from src.calibration.experiments import (
    ExperimentConfig,
    default_experiments,
    ppa_substitution_experiment,
    sor_variant_experiments,
)
from src.calibration.harness import run_calibration
from src.calibration.outputs import build_calibration_payload, write_calibration_outputs
from src.calibration.revealed_preferences import run_revealed_preferences
from src.calibration.revealed_preferences_outputs import (
    build_revealed_preferences_payload,
    build_weekly_volatility_payload,
    write_revealed_preferences_outputs,
)

__all__ = [
    "ExperimentConfig",
    "Thresholds",
    "build_calibration_payload",
    "build_committee_emulation_summary",
    "build_revealed_preferences_payload",
    "build_weekly_volatility_payload",
    "decide",
    "default_experiments",
    "ppa_substitution_experiment",
    "run_calibration",
    "run_revealed_preferences",
    "sor_variant_experiments",
    "write_calibration_outputs",
    "write_committee_emulation_outputs",
    "write_revealed_preferences_outputs",
]
