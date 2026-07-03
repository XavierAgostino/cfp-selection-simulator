"""Scenario Lab engine: weight parsing and scenario-run isolation from base.

The integration test exercises the full sample pipeline for both a base run and
a weight-scenario run, then asserts the scenario never disturbs base artifacts,
``latest.json``, or the flat API files. It cleans up the scenario artifacts it
creates so the repo's default 2025_week15 run stays pristine.
"""

import json
import shutil

import pytest

from src.config.simulator import SimulatorConfig
from src.pipeline.paths import (
    API_ROOT,
    DATA_OUTPUT,
    BASE_SCENARIO_ID,
    RunOutputPaths,
    run_id,
    scenario_stem,
    weights_scenario_id,
)
from src.pipeline.run import run_pipeline
from src.pipeline.weights import RankingWeights, parse_weight_overrides


# --- weight override parsing -------------------------------------------------


def test_parse_weight_overrides_sets_components():
    weights = parse_weight_overrides("resume=0.45,predictive=0.25,sor=0.20,sos=0.10")
    assert (weights.resume, weights.predictive, weights.sor, weights.sos) == (
        0.45,
        0.25,
        0.20,
        0.10,
    )


def test_parse_weight_overrides_inherits_colley_share():
    base = RankingWeights(colley_share=0.42)
    weights = parse_weight_overrides("resume=0.45,predictive=0.25,sor=0.20,sos=0.10", base)
    assert weights.colley_share == 0.42


def test_parse_weight_overrides_rejects_non_normalized():
    with pytest.raises(ValueError):
        parse_weight_overrides("resume=0.90,predictive=0.25,sor=0.20,sos=0.10")


def test_parse_weight_overrides_rejects_unknown_key():
    with pytest.raises(ValueError):
        parse_weight_overrides("colley=0.5,resume=0.4,predictive=0.3,sor=0.2,sos=0.1")


def test_parse_weight_overrides_rejects_malformed():
    with pytest.raises(ValueError):
        parse_weight_overrides("resume:0.45")


# --- scenario run isolation --------------------------------------------------


def _cleanup_scenario(stem: str) -> None:
    """Remove all artifacts a scenario run wrote, so base state is restored."""
    targets = [
        DATA_OUTPUT / "runs" / f"{stem}_manifest.json",
        DATA_OUTPUT / "rankings" / f"{stem}_rankings.csv",
        DATA_OUTPUT / "fields" / f"{stem}_field.csv",
        DATA_OUTPUT / "brackets" / f"{stem}_bracket.csv",
        DATA_OUTPUT / "brackets" / f"{stem}_bracket.html",
        DATA_OUTPUT / "audits" / f"{stem}_audit.json",
        API_ROOT / "runs" / stem,
    ]
    for target in targets:
        if target.is_dir():
            shutil.rmtree(target, ignore_errors=True)
        elif target.exists():
            target.unlink()


def test_scenario_run_does_not_disturb_base(tmp_path):
    # 1. Establish the base run and snapshot the files a scenario must not touch.
    run_pipeline(SimulatorConfig(year=2025, week=15), use_sample=True)

    base_paths = RunOutputPaths(year=2025, week=15)
    latest_path = API_ROOT / "latest.json"
    flat_rankings = API_ROOT / "rankings.json"

    base_manifest_before = base_paths.manifest.read_bytes()
    base_api_rankings_before = base_paths.api_rankings.read_bytes()
    latest_before = latest_path.read_bytes()
    flat_rankings_before = flat_rankings.read_bytes()

    scenario_weights = RankingWeights(resume=0.45, predictive=0.25, sor=0.20, sos=0.10)
    scenario_id = weights_scenario_id(scenario_weights)
    stem = scenario_stem(run_id(2025, 15), scenario_id)

    try:
        # 2. Run the scenario with shifted weights.
        cfg = SimulatorConfig(year=2025, week=15, weights=scenario_weights)
        result = run_pipeline(cfg, use_sample=True, scenario_id=scenario_id)

        scenario_paths = RunOutputPaths(year=2025, week=15, scenario_id=scenario_id)

        # 3. Scenario wrote its own stem, distinct from base.
        assert scenario_paths.stem == "2025_week15__w45-25-20-10"
        assert scenario_paths.api_rankings.exists()
        assert scenario_paths.manifest.exists()
        assert result["paths"]["rankings"].name.startswith(stem)

        manifest = json.loads(scenario_paths.manifest.read_text())
        assert manifest["scenario_id"] == scenario_id
        assert manifest["label"].endswith(scenario_id)
        assert manifest["weights"]["resume"] == 0.45

        # 4. Base artifacts, latest.json, and flat files are byte-identical.
        assert base_paths.manifest.read_bytes() == base_manifest_before
        assert base_paths.api_rankings.read_bytes() == base_api_rankings_before
        assert latest_path.read_bytes() == latest_before
        assert flat_rankings.read_bytes() == flat_rankings_before

        # 5. runs.json lists both, with distinct config hashes.
        runs_index = json.loads((API_ROOT / "runs.json").read_text())
        by_stem = {entry["stem"]: entry for entry in runs_index["runs"]}
        assert base_paths.stem in by_stem
        assert stem in by_stem
        assert by_stem[stem]["scenario_id"] == scenario_id
        assert by_stem[base_paths.stem]["scenario_id"] == BASE_SCENARIO_ID
        assert by_stem[stem]["config_hash"] != by_stem[base_paths.stem]["config_hash"]
        # latest still points at the base run
        assert runs_index["latest"]["stem"] == base_paths.stem
    finally:
        _cleanup_scenario(stem)
        # Restore runs.json so the scenario entry does not linger.
        from src.api_contracts.export import regenerate_runs_index

        regenerate_runs_index()
