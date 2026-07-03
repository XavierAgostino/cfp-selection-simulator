"""Selection Stability Monte Carlo (src/validation/sensitivity.py)."""

import numpy as np
import pandas as pd
import pytest

from src.api_contracts.build import build_sensitivity_payload
from src.api_contracts.models import SensitivityPayload
from src.config.simulator import SimulatorConfig
from src.pipeline.weights import RankingWeights
from src.selection.field import select_playoff_field
from src.validation.sensitivity import (
    run_weight_perturbation,
    stability_status,
)


def _tight_rankings(n_teams: int = 18) -> pd.DataFrame:
    """Synthetic rankings with a genuinely contested cut line.

    Teams near the 5+7 boundary get contrasting component profiles (strong
    resume vs strong predictive) with near-equal composites, so ±10% weight
    perturbation flips the field.
    """
    rng = np.random.default_rng(7)
    rows = []
    for i in range(n_teams):
        if i < 9:
            base = 1.0 - i * 0.045
            skew = 0.02
        elif i <= 14:
            # Tight cluster straddling the 5+7 cut with contrasting profiles.
            base = 1.0 - 9 * 0.045 - (i - 9) * 0.003
            skew = 0.12
        else:
            base = 1.0 - i * 0.045
            skew = 0.02
        sign = 1 if i % 2 == 0 else -1
        rows.append(
            {
                "team": f"Team {chr(65 + i)}",
                "resume_score": base + sign * skew + rng.normal(0, 0.004),
                "predictive_score": base - sign * skew + rng.normal(0, 0.004),
                "sor": base + rng.normal(0, 0.004),
                "sos": base - sign * skew * 0.5 + rng.normal(0, 0.004),
                "conference": f"Conf {i % 6}",
                "conf_champ": f"Yes (Conf {i % 6})" if i < 6 and i % 6 < 5 else "No",
            }
        )
    df = pd.DataFrame(rows)

    weights = RankingWeights()
    norm = df[["resume_score", "predictive_score", "sor", "sos"]].apply(
        lambda col: (col - col.min()) / (col.max() - col.min())
    )
    df["composite_score"] = (
        weights.resume * norm["resume_score"]
        + weights.predictive * norm["predictive_score"]
        + weights.sor * norm["sor"]
        + weights.sos * norm["sos"]
    )
    df = df.sort_values("composite_score", ascending=False).reset_index(drop=True)
    df["rank"] = range(1, len(df) + 1)
    return df


def test_seeded_reproducibility():
    df = _tight_rankings()
    a = run_weight_perturbation(df, n_scenarios=300, random_seed=42)
    b = run_weight_perturbation(df, n_scenarios=300, random_seed=42)
    assert [t.__dict__ for t in a.teams] == [t.__dict__ for t in b.teams]

    c = run_weight_perturbation(df, n_scenarios=300, random_seed=7)
    assert [t.selection_frequency for t in c.teams] != [t.selection_frequency for t in a.teams]


def test_bubble_teams_actually_flip():
    """Real Monte Carlo, not the old stub: contested teams land strictly
    between 0 and 1."""
    df = _tight_rankings()
    result = run_weight_perturbation(df, n_scenarios=500, random_seed=42)
    fractional = [t for t in result.teams if 0.0 < t.selection_frequency < 1.0]
    assert len(fractional) >= 2
    assert any(t.status in ("likely_in", "bubble", "likely_out") for t in fractional)


def test_status_bands_exhaustive_and_non_overlapping():
    cases = {
        1.0: "lock",
        0.99: "lock",
        0.989: "likely_in",
        0.75: "likely_in",
        0.749: "bubble",
        0.25: "bubble",
        0.249: "likely_out",
        0.011: "likely_out",
        0.01: "out",
        0.0: "out",
    }
    for freq, expected in cases.items():
        assert stability_status(freq) == expected, freq
    # Every possible frequency maps to exactly one band.
    for freq in np.linspace(0, 1, 1001):
        assert stability_status(float(freq)) in (
            "lock",
            "likely_in",
            "bubble",
            "likely_out",
            "out",
        )


def test_base_field_cutoff_matches_deterministic_selection():
    df = _tight_rankings()
    result = run_weight_perturbation(df, n_scenarios=100, random_seed=42)
    selection = select_playoff_field(df)

    final_at_large = sorted(selection.at_large_bids, key=lambda t: t["rank"])[-1]
    assert result.base_field_cutoff["final_at_large_team"] == final_at_large["team"]
    assert result.base_field_cutoff["final_at_large_score"] == pytest.approx(
        final_at_large["composite_score"]
    )
    assert result.base_field_cutoff["first_team_out"] == selection.first_four_out[0]["team"]

    for entry in result.teams:
        in_field = any(t["team"] == entry.team for t in selection.playoff_teams)
        assert entry.base_selected == in_field


def test_counts_and_scope():
    df = _tight_rankings()
    result = run_weight_perturbation(df, n_scenarios=250, random_seed=42)

    # Scope: base field + first four out + next four out (+ displaced).
    assert 12 <= len(result.teams) <= 21
    for entry in result.teams:
        assert entry.n_scenarios == 250
        assert entry.in_field_count == round(entry.selection_frequency * 250)
        assert 0.0 <= entry.selection_frequency <= 1.0
        assert entry.base_status in ("in_field", "first_out", "next_out", "out")
        assert entry.most_common_outcome in ("in_field", "first_out", "out")
        assert entry.primary_risk in (
            "none",
            "weight_sensitivity",
            "auto_bid_displacement",
            "composite_gap",
        )
    assert result.base_weights == {
        "resume": 0.40,
        "predictive": 0.30,
        "sor": 0.20,
        "sos": 0.10,
    }


def test_base_weights_echo_run_weights():
    df = _tight_rankings()
    custom = RankingWeights(resume=0.5, predictive=0.3, sor=0.1, sos=0.1)
    result = run_weight_perturbation(df, base_weights=custom, n_scenarios=50, random_seed=42)
    assert result.base_weights == {
        "resume": 0.5,
        "predictive": 0.3,
        "sor": 0.1,
        "sos": 0.1,
    }


def test_sensitivity_payload_contract():
    df = _tight_rankings()
    result = run_weight_perturbation(df, n_scenarios=200, random_seed=42)
    config = SimulatorConfig(year=2025, week=15)
    payload = build_sensitivity_payload(config, result, seeded_df=None, use_sample=True)

    assert isinstance(payload, SensitivityPayload)
    assert payload.season == 2025 and payload.week == 15
    assert payload.n_scenarios == 200
    assert payload.random_seed == 42
    assert payload.perturbation_spec.method == "uniform_relative_weight_perturbation"
    assert payload.perturbation_spec.relative_range == pytest.approx(0.10)
    assert payload.perturbation_spec.base_weights == result.base_weights
    assert len(payload.teams) == len(result.teams)
    # Serializes cleanly through the pydantic contract.
    SensitivityPayload.model_validate_json(payload.model_dump_json())


def test_pipeline_rankings_end_to_end():
    from src.pipeline.run import run_pipeline

    config = SimulatorConfig(year=2025, week=15)
    pipeline = run_pipeline(config, use_sample=True)
    result = run_weight_perturbation(
        pipeline["rankings"],
        base_weights=config.weights,
        n_scenarios=200,
        random_seed=42,
        format_rules=config.playoff_format,
    )
    in_field = [t for t in result.teams if t.base_selected]
    assert len(in_field) == 12
    # Conference champions' auto bids hold under weight perturbation.
    champs = pipeline["rankings"][
        pipeline["rankings"]["conf_champ"].astype(str).str.contains("Yes")
    ]["team"]
    champ_entries = [t for t in result.teams if t.team in set(champs) and t.base_selected]
    assert champ_entries and all(t.selection_frequency == 1.0 for t in champ_entries)
