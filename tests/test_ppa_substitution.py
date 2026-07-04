"""V2.3 PPA predictive-substitution experiment (research-only).

Covers the locked contract: the experiment keeps the production baseline
weights and only swaps the predictive component's data source; missing PPA
data degrades explicitly (never silently filled); calibration output labels
the experiment research-only with component_substitution metadata; and the
production defaults are untouched.
"""

import pandas as pd
import pytest

from src.calibration.decisions import Thresholds, decide
from src.calibration.emulation import build_committee_emulation_summary
from src.calibration.experiments import default_experiments, ppa_substitution_experiment
from src.calibration.harness import (
    CalibrationResult,
    ExperimentResult,
    YearMetrics,
    aggregate_metrics,
    rankings_for_weights,
    review_substitution_availability,
)
from src.calibration.outputs import build_calibration_payload
from src.calibration.ppa import apply_ppa_substitution, ppa_scores_from_games
from src.pipeline.weights import RankingWeights

# ---------------------------------------------------------------------------
# Experiment config contract
# ---------------------------------------------------------------------------


def test_config_is_component_substitution():
    config = ppa_substitution_experiment()
    assert config.experiment_id == "ppa_predictive_substitution"
    assert config.label == "PPA predictive substitution"
    assert config.experiment_type == "component_substitution"
    assert config.research_only is True
    assert config.substitution == {
        "component": "predictive",
        "baseline_source": "current_predictive",
        "candidate_source": "cfbd_ppa",
    }


def test_ppa_substitution_uses_same_weights_as_baseline():
    baseline = default_experiments()[0]
    config = ppa_substitution_experiment()
    assert config.weights_dict() == baseline.weights_dict()
    assert config.weights_dict() == {
        "resume": 0.40,
        "predictive": 0.30,
        "sor": 0.20,
        "sos": 0.10,
    }


def test_ppa_experiment_not_in_default_set():
    """The default calibrate run stays PPA-free; the experiment is opt-in."""
    ids = {config.experiment_id for config in default_experiments()}
    assert "ppa_predictive_substitution" not in ids
    assert all(config.substitution is None for config in default_experiments())


def test_production_weights_unchanged():
    weights = RankingWeights()
    assert weights.resume == pytest.approx(0.40)
    assert weights.predictive == pytest.approx(0.30)
    assert weights.sor == pytest.approx(0.20)
    assert weights.sos == pytest.approx(0.10)


# ---------------------------------------------------------------------------
# PPA score construction (leakage guard) and substitution
# ---------------------------------------------------------------------------


def _ppa_row(team, week=1, season_type="regular", off=0.3, dfn=0.1):
    return {
        "team": team,
        "week": week,
        "seasonType": season_type,
        "offense": {"overall": off},
        "defense": {"overall": dfn},
    }


def test_ppa_scores_exclude_postseason_and_late_weeks():
    rows = [
        _ppa_row("Team A", week=1, off=0.3, dfn=0.1),
        _ppa_row("Team A", week=16, off=9.0),  # beyond selection-time window
        _ppa_row("Team A", week=1, season_type="postseason", off=9.0),
        _ppa_row("Team A", week=2, off=None),  # missing PPA is dropped, not imputed
    ]
    scores = ppa_scores_from_games(rows)
    assert scores == {"Team A": pytest.approx(0.2)}


def _rankings_df():
    return pd.DataFrame(
        {
            "team": ["Team A", "Team B", "Team C"],
            "resume_score": [0.9, 0.8, 0.7],
            "predictive_score": [0.5, 0.6, 0.7],
            "sor": [0.9, 0.8, 0.7],
            "sos": [0.5, 0.5, 0.5],
        }
    )


def test_substitution_replaces_only_the_predictive_column():
    df = _rankings_df()
    scores = {"Team A": 0.30, "Team B": 0.10, "Team C": -0.05}
    substituted, note = apply_ppa_substitution(df, scores)
    assert note == ""
    assert substituted["predictive_score"].tolist() == [0.30, 0.10, -0.05]
    for col in ("resume_score", "sor", "sos"):
        assert substituted[col].tolist() == df[col].tolist()
    # source frame is never mutated
    assert df["predictive_score"].tolist() == [0.5, 0.6, 0.7]

    # the swapped column drives the composite exactly like any predictive score
    predictive_only = RankingWeights(resume=0.0, predictive=1.0, sor=0.0, sos=0.0)
    games = pd.DataFrame(columns=["home_team", "away_team", "home_points", "away_points", "week"])
    ranked = rankings_for_weights(substituted, games, predictive_only)
    assert ranked["team"].tolist() == ["Team A", "Team B", "Team C"]


def test_missing_ppa_data_degrades_explicitly():
    df = _rankings_df()

    substituted, note = apply_ppa_substitution(df, {"Team A": 0.3, "Team B": 0.1})
    assert substituted is None
    assert "missing PPA for 1 of 3 ranked teams" in note
    assert "Team C" in note

    substituted, note = apply_ppa_substitution(df, {})
    assert substituted is None
    assert "no PPA data" in note

    substituted, note = apply_ppa_substitution(df, None)
    assert substituted is None
    assert "no PPA data" in note


# ---------------------------------------------------------------------------
# Harness: unavailable seasons are marked, never filled
# ---------------------------------------------------------------------------


def _year(year, *, evaluated=True, is_outlier=False):
    if evaluated:
        return YearMetrics(
            year=year,
            is_outlier=is_outlier,
            notes="",
            spearman_top12=0.8,
            top12_overlap=0.8,
            field_overlap=0.75,
            correct_field_size=True,
            brier=0.18,
            win_accuracy=0.72,
        )
    return YearMetrics(
        year=year,
        is_outlier=is_outlier,
        notes="PPA substitution unavailable: no PPA data for this season.",
    )


def _ppa_result(per_year):
    result = ExperimentResult(
        config=ppa_substitution_experiment(),
        per_year=per_year,
        metrics_all_seasons=aggregate_metrics(per_year, exclude_outliers=False),
        metrics_excluding_outliers=aggregate_metrics(per_year, exclude_outliers=True),
    )
    result.decision, result.reason, result.flags = decide({}, {}, {})
    return result


def test_all_seasons_unavailable_becomes_needs_more_data():
    result = _ppa_result([_year(2023, evaluated=False), _year(2024, evaluated=False)])
    review_substitution_availability(result)
    assert result.decision == "needs_more_data"
    assert "unavailable for every requested season" in result.reason
    assert result.flags == ["data_unavailable"]


def test_partial_coverage_is_flagged_incomplete():
    result = _ppa_result([_year(2023), _year(2024, evaluated=False)])
    original_decision = result.decision
    review_substitution_availability(result)
    assert result.decision == original_decision
    assert "incomplete_seasons" in result.flags
    assert "unavailable for 2024" in result.reason


def test_reweighting_experiments_are_left_alone():
    result = ExperimentResult(config=default_experiments()[0], per_year=[])
    result.decision, result.reason = "neutral", "baseline"
    review_substitution_availability(result)
    assert result.decision == "neutral" and result.reason == "baseline"


# ---------------------------------------------------------------------------
# Calibration payload + emulation contract
# ---------------------------------------------------------------------------


def _result_with_ppa() -> CalibrationResult:
    configs = [default_experiments()[0], ppa_substitution_experiment()]
    experiments = []
    for config in configs:
        per_year = [_year(2022, is_outlier=True), _year(2024)]
        result = ExperimentResult(
            config=config,
            per_year=per_year,
            metrics_all_seasons=aggregate_metrics(per_year, exclude_outliers=False),
            metrics_excluding_outliers=aggregate_metrics(per_year, exclude_outliers=True),
        )
        result.baseline_delta = {
            key: 0.0
            for key in (
                "spearman_top12",
                "top12_overlap",
                "field_overlap",
                "correct_field_size_rate",
                "brier",
                "win_accuracy",
            )
        }
        result.baseline_delta_all_seasons = dict(result.baseline_delta)
        result.holdout = {
            "2022": {"alignment_delta": 0.0, "field_overlap_delta": 0.0, "note": "n"},
            "2024": {"alignment_delta": 0.0, "field_overlap_delta": 0.0, "note": "n"},
        }
        result.decision, result.reason, result.flags = decide(
            result.baseline_delta,
            result.baseline_delta_all_seasons,
            result.holdout,
            is_baseline=config.experiment_id == "baseline",
        )
        experiments.append(result)
    return CalibrationResult(
        years=[2022, 2024],
        evaluated_years=[2022, 2024],
        outlier_years=[2022],
        holdout_years=[2022, 2024],
        baseline_weights=RankingWeights(),
        thresholds=Thresholds(),
        experiments=experiments,
    )


def test_payload_labels_ppa_experiment_research_only():
    payload = build_calibration_payload(_result_with_ppa())
    entry = next(
        e for e in payload["experiments"] if e["experiment_id"] == "ppa_predictive_substitution"
    )
    assert entry["research_only"] is True
    assert entry["label"] == "PPA predictive substitution"


def test_payload_contract_includes_component_substitution_metadata():
    payload = build_calibration_payload(_result_with_ppa())
    entry = next(
        e for e in payload["experiments"] if e["experiment_id"] == "ppa_predictive_substitution"
    )
    assert entry["experiment_type"] == "component_substitution"
    assert entry["substitution"] == {
        "component": "predictive",
        "baseline_source": "current_predictive",
        "candidate_source": "cfbd_ppa",
    }
    assert entry["weights"] == {"resume": 0.4, "predictive": 0.3, "sor": 0.2, "sos": 0.1}

    # reweighting experiments carry the metadata too, with substitution unset
    baseline = next(e for e in payload["experiments"] if e["experiment_id"] == "baseline")
    assert baseline["experiment_type"] == "reweighting"
    assert baseline["substitution"] is None


def test_emulation_carries_substitution_metadata():
    payload = build_calibration_payload(_result_with_ppa())
    summary = build_committee_emulation_summary(payload)
    entry = next(
        e for e in summary["candidates"] if e["experiment_id"] == "ppa_predictive_substitution"
    )
    assert entry["experiment_type"] == "component_substitution"
    assert entry["substitution"]["candidate_source"] == "cfbd_ppa"
    # zero deltas: substituting the component is not an automatic alignment win
    assert entry["status"] == "not_committee_aligned"
