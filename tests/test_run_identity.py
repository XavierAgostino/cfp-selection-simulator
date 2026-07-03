"""Run and scenario identity helpers for multi-run Scenario Lab support."""

import pytest

from src.config.simulator import SimulatorConfig
from src.pipeline.paths import (
    BASE_SCENARIO_ID,
    RunOutputPaths,
    build_run_label,
    run_id,
    scenario_stem,
    weights_scenario_id,
)
from src.pipeline.weights import RankingWeights


def test_base_scenario_stem_equals_run_id():
    rid = run_id(2025, 15)
    assert rid == "2025_week15"
    assert scenario_stem(rid, BASE_SCENARIO_ID) == rid


def test_scenario_stem_appends_id_without_colliding_with_base():
    rid = run_id(2025, 15)
    variant = scenario_stem(rid, "a13f9c2b")
    assert variant == "2025_week15__a13f9c2b"
    assert variant != rid
    assert not variant.endswith(f"__{BASE_SCENARIO_ID}")


def test_build_run_label_base():
    assert build_run_label(2025, 15, BASE_SCENARIO_ID) == "2025 Week 15 · Base"


def test_build_run_label_scenario():
    assert build_run_label(2025, 15, "a13f9c2b") == "2025 Week 15 · a13f9c2b"


def test_config_hash_differs_when_weights_change():
    base = SimulatorConfig(year=2025, week=15)
    shifted = SimulatorConfig(year=2025, week=15)
    shifted.weights.resume = 0.55
    shifted.weights.predictive = 0.20
    assert base.config_hash != shifted.config_hash


def test_scenario_stems_unique_for_weight_variants():
    base = SimulatorConfig(year=2025, week=15)
    shifted = SimulatorConfig(year=2025, week=15)
    shifted.weights.resume = 0.55
    shifted.weights.predictive = 0.20
    shifted.weights.sor = 0.15
    rid = run_id(base.year, base.week)
    base_stem = scenario_stem(rid, BASE_SCENARIO_ID)
    variant_stem = scenario_stem(rid, shifted.config_hash)
    assert base_stem != variant_stem


def test_weights_scenario_id_from_percents():
    weights = RankingWeights(resume=0.45, predictive=0.25, sor=0.20, sos=0.10)
    assert weights_scenario_id(weights) == "w45-25-20-10"


def test_weights_scenario_id_collapses_defaults_to_base():
    assert weights_scenario_id(RankingWeights()) == BASE_SCENARIO_ID


def test_weights_scenario_id_ignores_colley_share():
    a = RankingWeights(resume=0.45, predictive=0.25, sor=0.20, sos=0.10, colley_share=0.6)
    b = RankingWeights(resume=0.45, predictive=0.25, sor=0.20, sos=0.10, colley_share=0.4)
    assert weights_scenario_id(a) == weights_scenario_id(b)


def test_weights_scenario_id_is_idempotent():
    weights = RankingWeights(resume=0.50, predictive=0.20, sor=0.20, sos=0.10)
    assert weights_scenario_id(weights) == weights_scenario_id(weights)


def test_run_output_paths_scenario_stem_isolated_from_base():
    base = RunOutputPaths(year=2025, week=15)
    scenario = RunOutputPaths(year=2025, week=15, scenario_id="w45-25-20-10")
    assert base.stem == "2025_week15"
    assert scenario.stem == "2025_week15__w45-25-20-10"
    assert scenario.rankings != base.rankings
    assert scenario.api_dir != base.api_dir
    assert scenario.manifest != base.manifest
