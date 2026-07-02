"""Tests for pipeline runner."""

from src.config.simulator import SimulatorConfig
from src.pipeline.run import run_pipeline


def test_run_pipeline_with_sample():
    config = SimulatorConfig(year=2025, week=15)
    result = run_pipeline(config, use_sample=True)

    assert len(result["rankings"]) > 0
    assert len(result["selection"].playoff_teams) == 12
    assert result["paths"]["manifest"].exists()
    assert result["paths"]["rankings"].exists()
    assert "bracket" in result["paths"]
