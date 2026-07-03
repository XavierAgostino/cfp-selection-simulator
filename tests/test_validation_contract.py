"""Contract tests for the repo-level validation.json web artifact.

Exercises build_validation_payload + export_validation_api over crafted result
objects — no live CFBD or historical data required.
"""

from __future__ import annotations

import json

from src.api_contracts.build import build_validation_payload
from src.api_contracts.export import export_validation_api
from src.api_contracts.models import ValidationPayload
from src.validation.committee_validation import CommitteeValidationResult
from src.validation.predictive_validation import PredictiveMetrics
from src.validation.selection_validation import SelectionValidationResult


def _committee(year: int, *, spearman: float, overlap: float, outlier: bool = False):
    return CommitteeValidationResult(
        year=year,
        spearman_top25=spearman,
        spearman_top12=spearman,
        spearman_top25_p=0.01,
        avg_rank_error_top25=1.2,
        top12_overlap_label="11/12",
        top12_overlap_ratio=overlap,
        bubble_overlap_label="3/4",
        bubble_overlap_ratio=0.75,
        top25_depth=25,
        is_outlier=outlier,
        notes="",
    )


def _selection(year: int, *, overlap: float, correct: bool, fto_match: bool, within_one: float):
    return SelectionValidationResult(
        year=year,
        era="4-team",
        ruleset="2024",
        rule_target="top-4",
        field_overlap_label="4/4",
        field_overlap_ratio=overlap,
        correct_field_size=correct,
        sim_field=["A", "B", "C", "D"],
        ref_field=["A", "B", "C", "D"],
        false_positives=["X"],
        false_negatives=["Y"],
        first_team_out_match=fto_match,
        first_team_out_ref="Y",
        first_team_out_sim="X",
        displacement_count=1,
        seeding_within_one=within_one,
        notes="",
    )


def _predictive(year: int, *, brier: float, win_acc: float, mae: float):
    return PredictiveMetrics(
        year=year,
        model="composite",
        brier_score=brier,
        win_accuracy=win_acc,
        margin_mae=mae,
        margin_rmse=mae + 3.0,
    )


def test_payload_shape_and_summaries():
    committee = [
        _committee(2014, spearman=0.90, overlap=1.0),
        _committee(2015, spearman=0.80, overlap=0.5, outlier=True),
    ]
    selection = [
        _selection(2014, overlap=1.0, correct=True, fto_match=True, within_one=1.0),
        _selection(2015, overlap=0.75, correct=False, fto_match=False, within_one=0.5),
    ]
    predictive = [
        _predictive(2014, brier=0.20, win_acc=0.70, mae=10.0),
        _predictive(2015, brier=0.30, win_acc=0.60, mae=12.0),
    ]

    payload = build_validation_payload(
        committee,
        selection,
        predictive,
        years=[2015, 2014],
        target="all",
        outlier_years=[2015],
    )

    # Years sorted, target passed through, outliers surfaced.
    assert payload.years == [2014, 2015]
    assert payload.target == "all"
    assert payload.outlier_years == [2015]
    assert payload.schema_version >= 1

    # Committee track + mean aggregation.
    assert [r.year for r in payload.committee] == [2014, 2015]
    assert payload.summary.committee is not None
    assert payload.summary.committee.seasons == 2
    assert payload.summary.committee.mean_spearman_top12 == 0.85
    assert payload.summary.committee.mean_top12_overlap == 0.75

    # Selection track: correct-field and first-team-out are *rates* over 2 seasons.
    assert payload.summary.selection is not None
    assert payload.summary.selection.correct_field_rate == 0.5
    assert payload.summary.selection.first_team_out_match_rate == 0.5
    assert payload.summary.selection.mean_field_overlap == 0.875
    assert payload.summary.selection.mean_seeding_within_one == 0.75

    # Predictive track.
    assert payload.summary.predictive is not None
    assert payload.summary.predictive.mean_brier == 0.25
    assert payload.summary.predictive.mean_win_accuracy == 0.65

    # Outlier flag propagates to both committee and selection rows.
    assert payload.committee[1].is_outlier is True
    assert payload.selection[1].is_outlier is True
    assert payload.committee[0].is_outlier is False


def test_empty_tracks_leave_summary_none():
    payload = build_validation_payload(
        [],
        [],
        [],
        years=[2020],
        target="committee",
        outlier_years=[],
    )
    assert payload.committee == []
    assert payload.summary.committee is None
    assert payload.summary.selection is None
    assert payload.summary.predictive is None


def test_export_writes_json_that_roundtrips(tmp_path):
    committee = [_committee(2014, spearman=0.9, overlap=1.0)]
    predictive = [_predictive(2014, brier=0.2, win_acc=0.7, mae=9.0)]

    path = export_validation_api(
        committee,
        [],
        predictive,
        years=[2014],
        target="all",
        outlier_years=[],
        api_root=tmp_path,
    )

    assert path == tmp_path / "validation.json"
    assert path.exists()

    data = json.loads(path.read_text())
    assert data["years"] == [2014]
    assert data["summary"]["committee"]["seasons"] == 1
    assert data["summary"]["selection"] is None

    # Re-parses cleanly through the Pydantic contract (schema stays valid).
    reparsed = ValidationPayload.model_validate(data)
    assert reparsed.committee[0].year == 2014
    assert reparsed.predictive[0].model == "composite"
