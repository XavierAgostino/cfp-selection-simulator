"""Committee Emulation lite (src/calibration/emulation.py)."""

import copy
import json

import pytest

from src.calibration.emulation import (
    STATUS_BLOCKED,
    STATUS_CANDIDATE,
    STATUS_NOT_ALIGNED,
    build_committee_emulation_summary,
    write_committee_emulation_outputs,
)
from src.pipeline.weights import RankingWeights

ZERO_DELTAS = {
    "spearman_top12": 0.0,
    "top12_overlap": 0.0,
    "field_overlap": 0.0,
    "correct_field_size_rate": 0.0,
    "brier": 0.0,
    "win_accuracy": 0.0,
}

THRESHOLDS = {
    "spearman_top12": 0.02,
    "top12_overlap": 0.03,
    "field_overlap": 0.03,
    "brier": 0.005,
    "holdout_alignment_collapse": 0.05,
    "note": "Initial go/no-go thresholds — starting points, not permanent scientific truth.",
}


def _experiment(experiment_id, *, deltas=None, flags=None, holdout=None, decision="neutral"):
    delta = dict(ZERO_DELTAS)
    delta.update(deltas or {})
    metrics = {
        "seasons": 10,
        "spearman_top12": 0.765,
        "top12_overlap": 0.78,
        "bubble_overlap": 0.6,
        "field_overlap": 0.767,
        "correct_field_size_rate": 1.0,
        "seeding_within_one": 0.55,
        "brier": 0.177,
        "win_accuracy": 0.72,
    }
    return {
        "experiment_id": experiment_id,
        "label": experiment_id.replace("_", " ").title(),
        "description": f"{experiment_id} description",
        "group": "sweep" if experiment_id != "baseline" else "baseline",
        "weights": {"resume": 0.40, "predictive": 0.30, "sor": 0.20, "sos": 0.10},
        "changed_assumption": "none",
        "metrics": {"all_seasons": dict(metrics), "excluding_outliers": dict(metrics)},
        "per_year_metrics": [],
        "baseline_delta": delta,
        "baseline_delta_all_seasons": dict(delta),
        "holdout": holdout
        or {
            "2022": {"alignment_delta": 0.0, "field_overlap_delta": 0.0, "note": "n"},
            "2024": {"alignment_delta": 0.0, "field_overlap_delta": 0.0, "note": "n"},
        },
        "flags": list(flags or []),
        "decision": decision,
        "reason": f"{experiment_id} reason",
        "notes": "",
    }


def _payload(experiments):
    return {
        "schema_version": 1,
        "generated_at": "2026-07-03T00:00:00+00:00",
        "years": [2021, 2022, 2023, 2024],
        "requested_years": [2021, 2022, 2023, 2024],
        "target": "all",
        "outlier_years": [2022],
        "holdout_years": [2022, 2024],
        "baseline_config": {
            "weights": {"resume": 0.40, "predictive": 0.30, "sor": 0.20, "sos": 0.10},
            "colley_share": 0.60,
            "source": "src/pipeline/weights.py RankingWeights defaults (production)",
        },
        "thresholds": dict(THRESHOLDS),
        "experiments": [_experiment("baseline")] + experiments,
        "recommended_next_experiments": [],
        "caveats": [],
    }


def test_summary_is_deterministic():
    payload = _payload(
        [
            _experiment("aligned", deltas={"spearman_top12": 0.04}, decision="recommended"),
            _experiment("flat"),
        ]
    )
    a = build_committee_emulation_summary(copy.deepcopy(payload))
    b = build_committee_emulation_summary(copy.deepcopy(payload))
    assert a == b
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
    # No self-minted timestamp: carries the calibration run's timestamp.
    assert a["source_generated_at"] == payload["generated_at"]


def test_alignment_improvement_becomes_candidate():
    payload = _payload(
        [_experiment("aligned", deltas={"spearman_top12": 0.04}, decision="recommended")]
    )
    summary = build_committee_emulation_summary(payload)
    entry = summary["candidates"][0]
    assert entry["status"] == STATUS_CANDIDATE
    assert summary["committee_aligned_candidates"] == ["aligned"]
    assert summary["summary"]["top_candidate"] == "aligned"


def test_no_alignment_gain_is_not_a_candidate():
    payload = _payload(
        [_experiment("flat"), _experiment("worse", deltas={"spearman_top12": -0.05})]
    )
    summary = build_committee_emulation_summary(payload)
    assert summary["committee_aligned_candidates"] == []
    assert all(entry["status"] == STATUS_NOT_ALIGNED for entry in summary["candidates"])


def test_protected_2024_holdout_failure_blocks_promotion():
    payload = _payload(
        [
            _experiment(
                "aligned_but_unsafe",
                deltas={"spearman_top12": 0.04},
                flags=["hurts_2024_holdout"],
                holdout={
                    "2022": {"alignment_delta": 0.08, "field_overlap_delta": 0.0, "note": "n"},
                    "2024": {"alignment_delta": -0.08, "field_overlap_delta": -0.083, "note": "n"},
                },
                decision="neutral",
            )
        ]
    )
    summary = build_committee_emulation_summary(payload)
    entry = summary["candidates"][0]
    assert entry["status"] == STATUS_BLOCKED
    assert "2024_holdout_field_overlap" in entry["protected_failures"]
    assert summary["committee_aligned_candidates"] == []
    assert summary["blocked_candidates"] == ["aligned_but_unsafe"]


def test_protected_field_or_brier_failure_blocks_promotion():
    payload = _payload(
        [
            _experiment("field_drop", deltas={"spearman_top12": 0.04, "field_overlap": -0.05}),
            _experiment("brier_drop", deltas={"top12_overlap": 0.05, "brier": 0.01}),
        ]
    )
    summary = build_committee_emulation_summary(payload)
    assert summary["committee_aligned_candidates"] == []
    by_id = {entry["experiment_id"]: entry for entry in summary["candidates"]}
    assert by_id["field_drop"]["status"] == STATUS_BLOCKED
    assert "field_overlap" in by_id["field_drop"]["protected_failures"]
    assert by_id["brier_drop"]["status"] == STATUS_BLOCKED
    assert "brier" in by_id["brier_drop"]["protected_failures"]


def test_candidate_entries_carry_full_quality_gate_fields():
    payload = _payload(
        [_experiment("aligned", deltas={"spearman_top12": 0.04}, decision="recommended")]
    )
    summary = build_committee_emulation_summary(payload)
    for entry in summary["candidates"]:
        assert set(entry["alignment_delta"]) == {"spearman_top12", "top12_overlap"}
        assert {"field_overlap", "label"} <= set(entry["field_tradeoff"])
        assert {"brier", "win_accuracy", "label"} <= set(entry["predictive_tradeoff"])
        assert {"2022", "2024"} <= set(entry["holdout"])
        assert entry["calibration_decision"] and entry["calibration_reason"]
        assert entry["status"] in (STATUS_CANDIDATE, STATUS_BLOCKED, STATUS_NOT_ALIGNED)
        assert entry["status_reason"]


def test_predictive_tradeoff_stays_visible_on_candidates():
    # Alignment up, predictive slightly worse but under the protected threshold:
    # still a candidate, but the tradeoff must be labeled.
    payload = _payload([_experiment("tilted", deltas={"spearman_top12": 0.04, "brier": 0.004})])
    summary = build_committee_emulation_summary(payload)
    entry = summary["candidates"][0]
    assert entry["status"] == STATUS_CANDIDATE
    assert entry["predictive_tradeoff"]["label"] == "neutral"
    assert entry["predictive_tradeoff"]["brier"] == pytest.approx(0.004)


def test_production_defaults_unchanged():
    defaults = RankingWeights()
    assert (defaults.resume, defaults.predictive, defaults.sor, defaults.sos) == (
        0.40,
        0.30,
        0.20,
        0.10,
    )
    payload = _payload([_experiment("aligned", deltas={"spearman_top12": 0.04})])
    summary = build_committee_emulation_summary(payload)
    assert summary["baseline"]["weights"] == {
        "resume": 0.40,
        "predictive": 0.30,
        "sor": 0.20,
        "sos": 0.10,
    }


def test_language_never_claims_best_or_correct_model():
    payload = _payload(
        [_experiment("aligned", deltas={"spearman_top12": 0.04}, decision="recommended")]
    )
    summary = build_committee_emulation_summary(payload)
    text = json.dumps(summary).lower()
    assert "best model" not in text
    assert "committee-aligned" in text or "committee_aligned" in text
    # "correct" appears only inside the explicit not-a-correct-model disclaimer.
    assert "'correct'" in json.dumps(summary)


def test_write_committee_emulation_outputs(tmp_path):
    payload = _payload(
        [
            _experiment("aligned", deltas={"spearman_top12": 0.04}, decision="recommended"),
            _experiment(
                "aligned_but_unsafe",
                deltas={"spearman_top12": 0.04},
                flags=["hurts_2024_holdout"],
            ),
            _experiment("flat"),
        ]
    )
    summary = build_committee_emulation_summary(payload)
    paths = write_committee_emulation_outputs(summary, tmp_path / "calibration")

    assert paths["json"].exists() and paths["md"].exists() and paths["csv"].exists()
    reloaded = json.loads(paths["json"].read_text())
    assert reloaded == summary

    report = paths["md"].read_text()
    assert "follow-up research candidates" in report
    assert "do not change the production model" in report
    assert "not\ncommittee replication" in report or "not committee replication" in report.replace(
        "\n", " "
    )

    lines = paths["csv"].read_text().strip().splitlines()
    assert len(lines) == 1 + len(summary["candidates"])
