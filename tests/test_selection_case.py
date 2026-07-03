"""Tests for run-grounded selection case generation."""

from __future__ import annotations

import pandas as pd
import pytest

from src.api_contracts.models import RecordMeta
from src.api_contracts.selection_case import build_selection_case
from src.config.simulator import SimulatorConfig
from src.pipeline.run import run_pipeline
from src.selection.audit import SelectionAudit
from src.selection.field import PlayoffSelection, select_playoff_field


@pytest.fixture(scope="module")
def sample_pipeline():
    config = SimulatorConfig(year=2025, week=15)
    result = run_pipeline(config, use_sample=True, export_api=False)
    return config, result


def _demo_record_meta() -> RecordMeta:
    return RecordMeta(
        record_universe="fbs",
        record_game_scope="display",
        model_start_week=5,
        record_start_week=5,
        through_week=15,
        includes_ccg=True,
        data_source="sample",
        is_demo_fixture=True,
        record_label="demo_record",
    )


def test_auto_bid_team_gets_auto_bid_explanation(sample_pipeline):
    _, result = sample_pipeline
    rankings = result["rankings"]
    selection = result["selection"]
    assert selection is not None
    auto_team = selection.auto_bids[0]["team"]
    row = rankings[rankings["team"] == auto_team].iloc[0]
    case = build_selection_case(
        auto_team,
        row,
        selection,
        result["seeded"],
        component_ranks={"resume": 1, "predictive": 1, "sor": 1, "sos": 1},
        ruleset="2025_plus",
        seeding_mode="straight",
        in_field=True,
        bid_type="auto",
        detail_level="full",
        rankings_df=rankings,
    )
    assert case.status == "selected"
    assert any("Automatic bid" in line for line in case.reasons)
    assert any("composite model" in line for line in case.reasons)


def test_at_large_team_gets_cutoff_explanation(sample_pipeline):
    _, result = sample_pipeline
    rankings = result["rankings"]
    selection = result["selection"]
    assert selection is not None and selection.at_large_bids
    at_large_team = selection.at_large_bids[0]["team"]
    row = rankings[rankings["team"] == at_large_team].iloc[0]
    case = build_selection_case(
        at_large_team,
        row,
        selection,
        result["seeded"],
        component_ranks={"resume": 10, "predictive": 10, "sor": 10, "sos": 10},
        ruleset="2025_plus",
        in_field=True,
        bid_type="at_large",
        detail_level="full",
        rankings_df=rankings,
    )
    assert case.status == "selected"
    assert any("at-large" in line.lower() for line in case.reasons)
    assert any("cutoff" in line.lower() for line in case.reasons)


def test_first_team_out_gets_why_missed_explanation(sample_pipeline):
    _, result = sample_pipeline
    rankings = result["rankings"]
    selection = result["selection"]
    assert selection is not None and selection.first_four_out
    first_out = selection.first_four_out[0]["team"]
    row = rankings[rankings["team"] == first_out].iloc[0]
    case = build_selection_case(
        first_out,
        row,
        selection,
        result["seeded"],
        component_ranks={"resume": 13, "predictive": 13, "sor": 13, "sos": 13},
        in_field=False,
        detail_level="full",
        rankings_df=rankings,
    )
    assert case.status == "bubble"
    assert any("first four" in line.lower() for line in case.reasons)
    assert any("outside" in line.lower() for line in case.reasons)


def test_displaced_team_gets_displacement_explanation():
    rankings = pd.DataFrame(
        [
            {
                "team": "Alpha",
                "rank": 1,
                "composite_score": 0.9,
                "resume_score": 0.5,
                "predictive_score": 0.5,
                "sor": 0.5,
                "sos": 0.5,
                "conference": "A",
                "conf_champ": None,
            },
            {
                "team": "Beta",
                "rank": 12,
                "composite_score": 0.5,
                "resume_score": 0.5,
                "predictive_score": 0.5,
                "sor": 0.5,
                "sos": 0.5,
                "conference": "B",
                "conf_champ": None,
            },
            {
                "team": "Gamma",
                "rank": 13,
                "composite_score": 0.49,
                "resume_score": 0.5,
                "predictive_score": 0.5,
                "sor": 0.5,
                "sos": 0.5,
                "conference": "C",
                "conf_champ": "C",
            },
        ]
    )
    selection = PlayoffSelection(
        playoff_teams=[rankings.iloc[0].to_dict(), rankings.iloc[2].to_dict()],
        auto_bids=[rankings.iloc[2].to_dict()],
        at_large_bids=[rankings.iloc[0].to_dict()],
        first_four_out=[rankings.iloc[1].to_dict()],
        displaced_team=rankings.iloc[1].to_dict(),
        champ_pulled_in=True,
        audit_log=[],
        audit=SelectionAudit(),
    )
    row = rankings[rankings["team"] == "Beta"].iloc[0]
    case = build_selection_case(
        "Beta",
        row,
        selection,
        None,
        component_ranks={"resume": 12, "predictive": 12, "sor": 12, "sos": 12},
        in_field=False,
        detail_level="full",
        rankings_df=rankings,
    )
    assert any("displaced" in line.lower() for line in case.reasons + case.concerns)


def test_summary_team_gets_non_empty_selection_case(sample_pipeline):
    _, result = sample_pipeline
    rankings = result["rankings"]
    row = rankings.iloc[0]
    case = build_selection_case(
        row["team"],
        row,
        result["selection"],
        result["seeded"],
        component_ranks={
            "resume": int(row["rank"]),
            "predictive": int(row["rank"]),
            "sor": int(row["rank"]),
            "sos": int(row["rank"]),
        },
        in_field=False,
        detail_level="summary",
        rankings_df=rankings,
    )
    assert case.status in {"summary", "bubble"}
    assert len(case.reasons) >= 2
    assert any("composite model" in line for line in case.reasons)


def test_demo_fixture_includes_partial_schedule_note(sample_pipeline):
    _, result = sample_pipeline
    rankings = result["rankings"]
    row = rankings.iloc[0]
    case = build_selection_case(
        row["team"],
        row,
        result["selection"],
        result["seeded"],
        component_ranks={"resume": 1, "predictive": 1, "sor": 1, "sos": 1},
        in_field=True,
        bid_type="at_large",
        detail_level="full",
        record_meta=_demo_record_meta(),
        rankings_df=rankings,
    )
    assert any("demo fixture" in line.lower() for line in case.concerns)


def test_next_four_out_gets_bubble_explanation(sample_pipeline):
    _, result = sample_pipeline
    rankings = result["rankings"]
    selection = result["selection"]
    assert selection is not None
    from src.api_contracts.selection_case import _next_four_out_names

    next_four = _next_four_out_names(rankings, selection)
    if not next_four:
        pytest.skip("No next-four-out teams in sample run")
    team_name = next(iter(next_four))
    row = rankings[rankings["team"] == team_name].iloc[0]
    case = build_selection_case(
        team_name,
        row,
        selection,
        result["seeded"],
        component_ranks={"resume": 20, "predictive": 20, "sor": 20, "sos": 20},
        in_field=False,
        detail_level="full",
        rankings_df=rankings,
    )
    assert case.status == "bubble"
    assert case.headline == "Next four out"
    assert any("next four" in line.lower() for line in case.reasons)


def test_changing_rank_changes_explanation():
    base_row = {
        "team": "Test U",
        "rank": 8,
        "composite_score": 0.7,
        "resume_score": 0.6,
        "predictive_score": 0.55,
        "sor": 0.5,
        "sos": 0.5,
        "conference": "Test",
        "conf_champ": None,
    }
    row8 = pd.Series(base_row)
    row20 = pd.Series({**base_row, "rank": 20})

    case8 = build_selection_case(
        "Test U",
        row8,
        None,
        None,
        component_ranks={"resume": 8, "predictive": 8, "sor": 8, "sos": 8},
        in_field=False,
        detail_level="summary",
    )
    case20 = build_selection_case(
        "Test U",
        row20,
        None,
        None,
        component_ranks={"resume": 20, "predictive": 20, "sor": 20, "sos": 20},
        in_field=False,
        detail_level="summary",
    )
    assert case8.reasons[0] != case20.reasons[0]


def test_missing_selection_degrades_gracefully():
    row = pd.Series(
        {
            "team": "Test U",
            "rank": 8,
            "composite_score": 0.7,
            "resume_score": 0.6,
            "predictive_score": 0.55,
            "sor": 0.5,
            "sos": 0.5,
            "conference": "Test",
            "conf_champ": None,
        }
    )
    case = build_selection_case(
        "Test U",
        row,
        None,
        None,
        component_ranks={"resume": 8, "predictive": 8, "sor": 8, "sos": 8},
        in_field=False,
        detail_level="full",
    )
    assert case.status == "summary"
    assert case.headline == "Selection case unavailable"
    assert any("composite model" in line for line in case.reasons)


def test_exported_resumes_include_selection_case(sample_pipeline):
    from src.api_contracts.build import build_team_resumes_payload, team_records_from_games

    config, result = sample_pipeline
    records = team_records_from_games(result["record_games"])
    payload = build_team_resumes_payload(
        config,
        result["rankings"],
        result["selection"],
        result["seeded"],
        result["record_games"],
        records,
        use_sample=True,
        record_meta=RecordMeta(**result["record_meta"]),
    )
    in_field = next(
        resume for resume in payload.teams.values() if resume.in_field and resume.bid_type == "auto"
    )
    assert in_field.selection_case is not None
    assert in_field.selection_case.reasons == in_field.why_in
    assert in_field.selection_case.concerns == in_field.concerns

    for resume in payload.teams.values():
        assert resume.selection_case is not None
        assert len(resume.why_in) >= 1
