"""Calibration/ablation harness (src/calibration/)."""

import json

import numpy as np
import pandas as pd
import pytest

from src.calibration.decisions import (
    FLAG_HURTS_HOLDOUT_2024,
    FLAG_OVERFITS_OUTLIERS,
    Thresholds,
    decide,
)
from src.calibration.experiments import ablation_weights, default_experiments
from src.calibration.harness import (
    CalibrationResult,
    ExperimentResult,
    YearMetrics,
    aggregate_metrics,
    rankings_for_weights,
)
from src.calibration.outputs import build_calibration_payload, write_calibration_outputs
from src.pipeline.weights import COMPONENT_KEYS, RankingWeights

ZERO_DELTAS = {
    "spearman_top12": 0.0,
    "top12_overlap": 0.0,
    "field_overlap": 0.0,
    "correct_field_size_rate": 0.0,
    "brier": 0.0,
    "win_accuracy": 0.0,
}


def _deltas(**overrides):
    deltas = dict(ZERO_DELTAS)
    deltas.update(overrides)
    return deltas


# ---------------------------------------------------------------------------
# Experiment configuration
# ---------------------------------------------------------------------------


def test_baseline_matches_production_defaults():
    experiments = default_experiments()
    baseline = next(e for e in experiments if e.experiment_id == "baseline")
    defaults = RankingWeights()
    for key in COMPONENT_KEYS:
        assert getattr(baseline.weights, key) == getattr(defaults, key)
    assert baseline.weights.colley_share == defaults.colley_share


def test_all_experiment_weights_sum_to_one():
    for experiment in default_experiments():
        experiment.weights.validate()
        total = sum(getattr(experiment.weights, key) for key in COMPONENT_KEYS)
        assert total == pytest.approx(1.0, abs=0.01), experiment.experiment_id


def test_experiment_ids_unique_and_required_set_present():
    experiments = default_experiments()
    ids = [e.experiment_id for e in experiments]
    assert len(ids) == len(set(ids))
    required = {
        "baseline",
        "no_sor",
        "no_sos",
        "no_predictive",
        "no_resume",
        "resume_heavy",
        "predictive_heavy",
        "sor_heavy",
        "balanced",
        "committee_alignment_candidate",
        "predictive_signal_candidate",
    }
    assert required <= set(ids)


def test_every_experiment_has_label_description_assumption():
    for experiment in default_experiments():
        assert experiment.label
        assert experiment.description
        assert experiment.changed_assumption


def test_ablation_zeroes_component_and_renormalizes():
    weights = ablation_weights("sor")
    assert weights.sor == 0.0
    # 0.40/0.30/0.10 renormalized over 0.80
    assert weights.resume == pytest.approx(0.5)
    assert weights.predictive == pytest.approx(0.375)
    assert weights.sos == pytest.approx(0.125)
    weights.validate()


def test_ablation_rejects_unknown_component():
    with pytest.raises(ValueError):
        ablation_weights("clutch_factor")


# ---------------------------------------------------------------------------
# Reweighting (rankings_for_weights)
# ---------------------------------------------------------------------------


def _synthetic_rankings(n_teams: int = 12) -> pd.DataFrame:
    rng = np.random.default_rng(11)
    rows = []
    for i in range(n_teams):
        base = 1.0 - i * 0.08
        rows.append(
            {
                "team": f"Team {chr(65 + i)}",
                "resume_score": base + rng.normal(0, 0.01),
                "predictive_score": 1.0 - base + rng.normal(0, 0.01),  # anti-correlated
                "sor": base + rng.normal(0, 0.01),
                "sos": base + rng.normal(0, 0.01),
            }
        )
    return pd.DataFrame(rows)


def _empty_games() -> pd.DataFrame:
    return pd.DataFrame(columns=["home_team", "away_team", "home_points", "away_points", "week"])


def test_rankings_for_weights_assigns_full_rank_sequence():
    df = _synthetic_rankings()
    out = rankings_for_weights(df, _empty_games(), RankingWeights())
    assert list(out["rank"]) == list(range(1, len(df) + 1))
    assert out["composite_score"].is_monotonic_decreasing


def test_rankings_for_weights_respects_weights():
    df = _synthetic_rankings()
    resume_only = RankingWeights(resume=1.0, predictive=0.0, sor=0.0, sos=0.0)
    out = rankings_for_weights(df, _empty_games(), resume_only)
    expected = df.sort_values("resume_score", ascending=False)["team"].tolist()
    assert out["team"].tolist() == expected

    predictive_only = RankingWeights(resume=0.0, predictive=1.0, sor=0.0, sos=0.0)
    flipped = rankings_for_weights(df, _empty_games(), predictive_only)
    assert flipped["team"].tolist() != expected  # anti-correlated components


# ---------------------------------------------------------------------------
# Decision engine
# ---------------------------------------------------------------------------


def test_baseline_decision_is_neutral_reference():
    decision, reason, flags = decide(ZERO_DELTAS, ZERO_DELTAS, {}, is_baseline=True)
    assert decision == "neutral"
    assert "baseline" in reason.lower()
    assert flags == []


def test_no_movement_is_neutral():
    decision, reason, _ = decide(ZERO_DELTAS, ZERO_DELTAS, {})
    assert decision == "neutral"
    assert reason


def test_clean_improvement_is_recommended():
    deltas = _deltas(spearman_top12=0.04, top12_overlap=0.05, brier=-0.008)
    decision, reason, flags = decide(deltas, deltas, {})
    assert decision == "recommended"
    assert "improves" in reason.lower()
    assert "improves_alignment" in flags and "improves_predictive_signal" in flags


def test_protected_field_overlap_drop_blocks_recommendation():
    deltas = _deltas(spearman_top12=0.05, field_overlap=-0.08)
    decision, reason, _ = decide(deltas, deltas, {})
    assert decision == "neutral"
    assert "blocked" in reason.lower()
    assert "field_overlap" in reason


def test_protected_brier_drop_blocks_recommendation():
    deltas = _deltas(spearman_top12=0.05, brier=0.02)
    decision, reason, flags = decide(deltas, deltas, {})
    assert decision == "neutral"
    assert "blocked" in reason.lower()
    assert "hurts_predictive_signal" in flags


def test_2024_holdout_collapse_blocks_recommendation():
    deltas = _deltas(spearman_top12=0.05)
    holdout = {"2024": {"alignment_delta": 0.0, "field_overlap_delta": -0.1, "note": ""}}
    decision, reason, flags = decide(deltas, deltas, holdout)
    assert decision == "neutral"
    assert FLAG_HURTS_HOLDOUT_2024 in flags
    assert "field_overlap_2024" in reason


def test_pure_harm_is_rejected():
    deltas = _deltas(spearman_top12=-0.06, brier=0.01)
    decision, reason, _ = decide(deltas, deltas, {})
    assert decision == "rejected"
    assert "hurts" in reason.lower()


def test_nonprotected_tradeoff_is_promising():
    # Brier improves, alignment degrades: intentional-divergence candidate.
    deltas = _deltas(brier=-0.01, spearman_top12=-0.05)
    decision, reason, _ = decide(deltas, deltas, {})
    assert decision == "promising"
    assert "trade" in reason.lower()


def test_outlier_only_gain_needs_more_data():
    # Gain shows up all-seasons but vanishes when outliers are excluded.
    excl = dict(ZERO_DELTAS)
    incl = _deltas(spearman_top12=0.06)
    # Give the excluded view a small unrelated improvement so the gate reaches
    # the overfitting rung.
    excl["top12_overlap"] = 0.04
    decision, reason, flags = decide(excl, incl, {})
    assert decision == "needs_more_data"
    assert FLAG_OVERFITS_OUTLIERS in flags
    assert "outlier" in reason.lower()


def test_thresholds_are_labeled_initial():
    assert "initial" in (Thresholds.__doc__ or "").lower()
    assert set(Thresholds().as_dict()) >= {
        "spearman_top12",
        "top12_overlap",
        "field_overlap",
        "brier",
    }


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------


def _year(year: int, *, is_outlier: bool = False, spearman=0.8, field=0.75, brier=0.18):
    return YearMetrics(
        year=year,
        is_outlier=is_outlier,
        notes="",
        spearman_top12=spearman,
        top12_overlap=0.8,
        bubble_overlap=0.6,
        field_overlap=field,
        correct_field_size=True,
        seeding_within_one=0.5 if year >= 2024 else None,
        brier=brier,
        win_accuracy=0.72,
    )


def test_aggregate_metrics_outlier_views():
    per_year = [
        _year(2021, spearman=0.9),
        _year(2022, is_outlier=True, spearman=0.3),
        _year(2023, spearman=0.7),
    ]
    all_seasons = aggregate_metrics(per_year, exclude_outliers=False)
    excl = aggregate_metrics(per_year, exclude_outliers=True)
    assert all_seasons["seasons"] == 3 and excl["seasons"] == 2
    assert all_seasons["spearman_top12"] == pytest.approx((0.9 + 0.3 + 0.7) / 3)
    assert excl["spearman_top12"] == pytest.approx(0.8)
    assert excl["correct_field_size_rate"] == 1.0


# ---------------------------------------------------------------------------
# Payload contract + writers
# ---------------------------------------------------------------------------


def _synthetic_result() -> CalibrationResult:
    configs = default_experiments()[:3]  # baseline + two ablations
    experiments = []
    for i, config in enumerate(configs):
        per_year = [
            _year(2021, spearman=0.8 - i * 0.01),
            _year(2022, is_outlier=True, spearman=0.4),
            _year(2024, spearman=0.75, field=0.8),
        ]
        result = ExperimentResult(
            config=config,
            per_year=per_year,
            metrics_all_seasons=aggregate_metrics(per_year, exclude_outliers=False),
            metrics_excluding_outliers=aggregate_metrics(per_year, exclude_outliers=True),
        )
        experiments.append(result)

    baseline = experiments[0]
    for result in experiments:
        result.baseline_delta = {
            key: (
                result.metrics_excluding_outliers[key] - baseline.metrics_excluding_outliers[key]
                if result.metrics_excluding_outliers[key] is not None
                else None
            )
            for key in ZERO_DELTAS
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
            is_baseline=result.config.experiment_id == "baseline",
        )

    return CalibrationResult(
        years=[2021, 2022, 2024],
        evaluated_years=[2021, 2022, 2024],
        outlier_years=[2022],
        holdout_years=[2022, 2024],
        baseline_weights=RankingWeights(),
        thresholds=Thresholds(),
        experiments=experiments,
    )


def test_payload_contract():
    payload = build_calibration_payload(_synthetic_result())

    for key in (
        "schema_version",
        "generated_at",
        "years",
        "target",
        "outlier_years",
        "holdout_years",
        "baseline_config",
        "thresholds",
        "experiments",
        "recommended_next_experiments",
        "caveats",
    ):
        assert key in payload, key

    assert payload["baseline_config"]["weights"] == {
        "resume": 0.40,
        "predictive": 0.30,
        "sor": 0.20,
        "sos": 0.10,
    }
    assert "not permanent" in payload["thresholds"]["note"]
    assert payload["caveats"]

    for exp in payload["experiments"]:
        for key in (
            "experiment_id",
            "label",
            "description",
            "weights",
            "changed_assumption",
            "metrics",
            "per_year_metrics",
            "baseline_delta",
            "holdout",
            "decision",
            "reason",
        ):
            assert key in exp, (exp.get("experiment_id"), key)
        assert exp["decision"] in (
            "recommended",
            "promising",
            "neutral",
            "rejected",
            "needs_more_data",
        )
        assert exp["reason"]
        assert exp["metrics"]["all_seasons"] and exp["metrics"]["excluding_outliers"]
        assert {row["year"] for row in exp["per_year_metrics"]} == {2021, 2022, 2024}
        assert set(exp["baseline_delta"]) == set(ZERO_DELTAS)
        # Holdout blocks for both holdout years when present in the run.
        assert set(exp["holdout"]) == {"2022", "2024"}
        for block in exp["holdout"].values():
            assert "alignment_delta" in block and "field_overlap_delta" in block
            assert block["note"]

    # Outlier years are labeled, never hidden.
    outlier_rows = [
        row
        for exp in payload["experiments"]
        for row in exp["per_year_metrics"]
        if row["year"] == 2022
    ]
    assert outlier_rows and all(row["is_outlier"] for row in outlier_rows)


def test_baseline_self_deltas_are_zero():
    payload = build_calibration_payload(_synthetic_result())
    baseline = next(e for e in payload["experiments"] if e["experiment_id"] == "baseline")
    for value in baseline["baseline_delta"].values():
        assert value == pytest.approx(0.0)
    assert baseline["decision"] == "neutral"


def test_write_calibration_outputs(tmp_path):
    result = _synthetic_result()
    paths = write_calibration_outputs(result, tmp_path / "calibration")

    assert paths["json"].exists() and paths["md"].exists() and paths["csv"].exists()

    payload = json.loads(paths["json"].read_text())
    assert payload["schema_version"] == 1
    assert len(payload["experiments"]) == len(result.experiments)

    report = paths["md"].read_text()
    assert "research mode" in report.lower()
    assert "correct" in report  # the not-a-correct-model disclaimer
    # "recommended" must read as follow-up research, never a production change.
    assert "candidates for follow-up testing" in report
    assert "not change the production model" in report

    csv_df = pd.read_csv(paths["csv"])
    assert len(csv_df) == len(result.experiments)
    assert "decision" in csv_df.columns and "delta_brier" in csv_df.columns
