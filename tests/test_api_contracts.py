"""Contract tests for the JSON API export layer (src/api_contracts).

Runs the sample pipeline once, then round-trips every exported file back
through the pydantic models so drift between exporter and contract fails
loudly here before the web app ever sees it.
"""

import json

import pytest

from src.api_contracts.models import (
    BracketPayload,
    FieldPayload,
    LatestMeta,
    RankingsPayload,
    RunsIndex,
    TeamResumesPayload,
)
from src.config.simulator import SimulatorConfig
from src.pipeline.paths import API_ROOT
from src.pipeline.run import run_pipeline


@pytest.fixture(scope="module")
def sample_run():
    config = SimulatorConfig(year=2025, week=15)
    result = run_pipeline(config, use_sample=True)
    return config, result


def _load(name: str):
    path = API_ROOT / name
    assert path.exists(), f"exporter did not write {name}"
    return json.loads(path.read_text())


def test_runs_index_lists_run(sample_run):
    index = RunsIndex.model_validate(_load("runs.json"))
    stems = [run.stem for run in index.runs]
    assert "2025_week15" in stems
    assert index.latest.stem in stems


def test_runs_index_scenario_identity(sample_run):
    index = RunsIndex.model_validate(_load("runs.json"))
    entry = next(run for run in index.runs if run.stem == "2025_week15")
    assert entry.run_id == "2025_week15"
    assert entry.scenario_id == "base"
    assert entry.label == "2025 Week 15 · Base"
    assert entry.config_hash
    assert set(entry.weights) == {"resume", "predictive", "sor", "sos"}
    assert pytest.approx(sum(entry.weights.values())) == 1.0


def test_latest_meta_contract(sample_run):
    latest = LatestMeta.model_validate(_load("latest.json"))
    assert latest.product == "Selection Room"
    assert set(latest.weights) == {"resume", "predictive", "sor", "sos"}
    assert pytest.approx(sum(latest.weights.values())) == 1.0


def test_field_payload_contract(sample_run):
    field = FieldPayload.model_validate(_load("field.json"))
    assert len(field.field) == 12
    assert len(field.auto_bids) == 5
    assert len(field.at_large_bids) == 7
    assert [slot.seed for slot in field.field] == list(range(1, 13))
    for slot in field.field:
        assert slot.is_bye == (slot.seed is not None and slot.seed <= 4)
    for slot in field.first_four_out + field.next_four_out:
        assert slot.seed is None


def test_bracket_payload_contract(sample_run):
    bracket = BracketPayload.model_validate(_load("bracket.json"))
    assert len(bracket.pods) == 4
    assert len(bracket.rounds.first_round) == 4
    # Pod pairs are seed-fixed: 8/9 -> 1, 5/12 -> 4, 6/11 -> 3, 7/10 -> 2.
    for pod in bracket.pods:
        matchup = {team.seed for team in pod.first_round}
        expected = {1: {8, 9}, 2: {7, 10}, 3: {6, 11}, 4: {5, 12}}[pod.bye.seed]
        assert matchup == expected


def test_rankings_and_resumes_agree(sample_run):
    rankings = RankingsPayload.model_validate(_load("rankings.json"))
    resumes = TeamResumesPayload.model_validate(_load("team-resumes.json"))
    assert [t.rank for t in rankings.teams] == sorted(t.rank for t in rankings.teams)
    in_field = [t for t in rankings.teams if t.in_field]
    assert len(in_field) == 12
    for team in in_field:
        resume = resumes.teams.get(team.team)
        assert resume is not None, f"{team.team} is in the field but has no resume"
        assert resume.in_field
        assert resume.rank == team.rank


def test_per_run_dir_matches_flat_copies(sample_run):
    flat = _load("field.json")
    per_run = json.loads((API_ROOT / "runs" / "2025_week15" / "field.json").read_text())
    assert flat == per_run
