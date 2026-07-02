"""Tests for pipeline runner."""

from src.config.simulator import SimulatorConfig
from src.pipeline.run import run_pipeline


def test_run_pipeline_with_sample():
    config = SimulatorConfig(year=2025, week=15)
    result = run_pipeline(config, use_sample=True)

    paths = result["paths"]
    assert len(result["rankings"]) > 0
    assert len(result["selection"].playoff_teams) == 12
    assert paths["manifest"].exists()
    assert paths["rankings"].exists()
    assert paths["field"].exists()
    assert paths["bracket"].exists()
    assert paths["audit"].exists()
    assert paths["bracket_html"].exists()
    assert paths["rankings"].name == "2025_week15_rankings.csv"


def test_sample_mode_assigns_conference_champions():
    config = SimulatorConfig(year=2025, week=15)
    result = run_pipeline(config, use_sample=True)
    seeded = result["seeded"]
    bye_teams = list(seeded[seeded["is_bye"]]["team"])
    assert len(bye_teams) == 4
