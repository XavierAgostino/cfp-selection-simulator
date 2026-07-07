"""Tests for revealed committee preferences (v2.5 research mode)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from src.calibration.revealed_preferences import (
    EQUAL_WEIGHTS,
    PRODUCTION_BASELINE,
    build_candidate_grid,
    fit_weights_for_season,
    miami_notre_dame_attribution,
    run_revealed_preferences,
)
from src.calibration.revealed_preferences_outputs import (
    build_revealed_preferences_payload,
    write_revealed_preferences_outputs,
)
from src.pipeline.weights import COMPONENT_KEYS, RankingWeights
from src.validation.historical import register_weekly_top25

REPO_ROOT = Path(__file__).resolve().parents[1]
FIXTURES = REPO_ROOT / "tests" / "fixtures"


def _synthetic_rankings(
    teams: list[str],
    component_matrix: np.ndarray,
    weights: RankingWeights,
) -> pd.DataFrame:
    w = np.array([getattr(weights, key) for key in COMPONENT_KEYS])
    scores = component_matrix @ w
    order = np.argsort(-scores)
    rows = []
    for rank, idx in enumerate(order, start=1):
        rows.append(
            {
                "team": teams[idx],
                "rank": rank,
                "composite_score": float(scores[idx]),
                "resume_score": float(component_matrix[idx, 0]),
                "predictive_score": float(component_matrix[idx, 1]),
                "sor": float(component_matrix[idx, 2]),
                "sos": float(component_matrix[idx, 3]),
            }
        )
    return pd.DataFrame(rows)


def _committee_from_weights(
    teams: list[str], component_matrix: np.ndarray, weights: RankingWeights
) -> list[str]:
    rankings = _synthetic_rankings(teams, component_matrix, weights)
    return rankings.sort_values("rank")["team"].tolist()


def test_baseline_and_equal_weights_in_candidate_grid():
    def _weights_key(weights: RankingWeights) -> tuple[float, float, float, float]:
        return tuple(round(getattr(weights, key), 6) for key in COMPONENT_KEYS)

    grid = build_candidate_grid()
    keys = {_weights_key(w) for w in grid}
    assert _weights_key(PRODUCTION_BASELINE) in keys
    assert _weights_key(EQUAL_WEIGHTS) in keys


def test_all_candidate_weights_on_simplex():
    for weights in build_candidate_grid():
        weights.validate()
        total = sum(getattr(weights, key) for key in COMPONENT_KEYS)
        assert total == pytest.approx(1.0, abs=0.01)
        for key in COMPONENT_KEYS:
            assert getattr(weights, key) >= -1e-9


def test_synthetic_recovers_target_weights():
    teams = [f"T{i}" for i in range(8)]
    rng = np.random.default_rng(42)
    components = rng.random((len(teams), 4))
    target = RankingWeights(resume=0.50, predictive=0.20, sor=0.20, sos=0.10)
    committee = _committee_from_weights(teams, components, target)
    base_df = _synthetic_rankings(teams, components, PRODUCTION_BASELINE)
    games_df = pd.DataFrame({"home_team": ["T0"], "away_team": ["T1"]})

    # Restrict grid to target + baseline for deterministic recovery
    candidates = [PRODUCTION_BASELINE, target]
    fit = fit_weights_for_season(
        2024,
        base_df,
        games_df,
        week=15,
        candidates=candidates,
        committee_order=committee,
    )
    assert fit is not None
    assert fit.fitted_weights.resume == pytest.approx(target.resume, abs=0.01)
    assert fit.fit_quality.rank_error <= fit.fit_quality.baseline_rank_error + 1e-9


def test_baseline_in_grid_monotonicity_tolerance():
    teams = [f"T{i}" for i in range(10)]
    rng = np.random.default_rng(7)
    components = rng.random((len(teams), 4))
    committee = _committee_from_weights(teams, components, PRODUCTION_BASELINE)
    base_df = _synthetic_rankings(teams, components, PRODUCTION_BASELINE)
    games_df = pd.DataFrame({"home_team": ["T0"], "away_team": ["T1"]})

    fit = fit_weights_for_season(
        2024,
        base_df,
        games_df,
        week=15,
        candidates=build_candidate_grid(),
        committee_order=committee,
    )
    assert fit is not None
    assert fit.fit_quality.rank_error is not None
    assert fit.fit_quality.baseline_rank_error is not None
    assert fit.fit_quality.rank_error <= fit.fit_quality.baseline_rank_error + 0.05


def test_near_optimal_region_populated():
    teams = [f"T{i}" for i in range(6)]
    components = np.array(
        [
            [1.0, 0.2, 0.3, 0.1],
            [0.9, 0.3, 0.2, 0.2],
            [0.8, 0.4, 0.1, 0.3],
            [0.7, 0.5, 0.4, 0.1],
            [0.6, 0.6, 0.2, 0.2],
            [0.5, 0.7, 0.3, 0.1],
        ]
    )
    target = RankingWeights(resume=0.45, predictive=0.25, sor=0.20, sos=0.10)
    committee = _committee_from_weights(teams, components, target)
    base_df = _synthetic_rankings(teams, components, PRODUCTION_BASELINE)
    games_df = pd.DataFrame({"home_team": ["T0"], "away_team": ["T1"]})

    near_weights = [
        target,
        RankingWeights(resume=0.44, predictive=0.26, sor=0.20, sos=0.10),
        RankingWeights(resume=0.46, predictive=0.24, sor=0.20, sos=0.10),
    ]
    fit = fit_weights_for_season(
        2024,
        base_df,
        games_df,
        week=15,
        candidates=near_weights + [PRODUCTION_BASELINE],
        committee_order=committee,
    )
    assert fit is not None
    assert fit.near_optimal_count >= 1
    assert len(fit.near_optimal_region) == fit.near_optimal_count


def test_artifact_payload_contract(tmp_path: Path):
    teams = ["A", "B", "C", "D"]
    components = np.eye(4)
    committee = ["A", "B", "C", "D"]
    base_df = _synthetic_rankings(teams, components, PRODUCTION_BASELINE)
    games_df = pd.DataFrame({"home_team": ["A"], "away_team": ["B"]})
    fit = fit_weights_for_season(
        2024,
        base_df,
        games_df,
        week=15,
        committee_order=committee,
    )
    assert fit is not None

    from src.calibration.revealed_preferences import RevealedPreferencesResult

    result = RevealedPreferencesResult(requested_years=[2024], evaluated_entries=[fit])
    payload = build_revealed_preferences_payload(result)

    assert payload["research_only"] is True
    assert payload["schema_version"] == 1
    assert "published top 25" in payload["disclaimer"]
    assert "descriptive approximations" in payload["disclaimer_short"]
    assert "Edge-weight fit" in payload["badge_explainers"]
    assert payload["warning_badges"][0] == "Research-only"
    assert len(payload["entries"]) == 1
    entry = payload["entries"][0]
    assert entry["objective"] == "rank_error_top25"
    assert "fitted_weights" in entry
    assert "near_optimal_region" in entry
    assert "interpretation" in entry
    assert entry["warning_badges"][0] == "Research-only"
    assert isinstance(entry["focus_team_shifts"], dict)

    scope = entry["explanation_scope"]
    assert isinstance(scope["explains"], list)
    assert isinstance(scope["does_not_explain"], list)
    assert any("rank error" in item for item in scope["explains"])
    assert any("not yet comparable across seasons" in item for item in scope["does_not_explain"])

    paths = write_revealed_preferences_outputs(result, tmp_path, payload=payload)
    assert paths["json"].exists()
    loaded = json.loads(paths["json"].read_text())
    assert loaded["research_only"] is True
    markdown = paths["markdown"].read_text()
    assert "**What this fit explains:**" in markdown
    assert "**What it does not explain:**" in markdown


@pytest.mark.skipif(
    not (REPO_ROOT / "data" / "cache" / "cfbd" / "2024").exists(),
    reason="2024 games cache not present",
)
def test_2024_integration_cached_games():
    result = run_revealed_preferences([2024], verbose=False)
    assert result.evaluated_entries
    fit = result.evaluated_entries[0]
    assert fit.year == 2024
    assert fit.fit_quality.rank_error is not None
    assert fit.near_optimal_count >= 1


@pytest.mark.skipif(
    not (REPO_ROOT / "data" / "cache" / "cfbd" / "2025").exists(),
    reason="2025 games cache not present",
)
def test_2025_notre_dame_miami_diagnostic():
    result = run_revealed_preferences([2025], verbose=False)
    fit = next((e for e in result.evaluated_entries if e.year == 2025), None)
    assert fit is not None
    attribution = miami_notre_dame_attribution(fit)
    assert attribution is not None
    assert "Miami" in attribution["fitted_shift"]
    assert "Notre Dame" in attribution["fitted_shift"]
    payload = build_revealed_preferences_payload(result)
    assert payload.get("public_case_2025") is not None


def test_headline_phrasing_is_human_readable():
    from src.calibration.revealed_preferences import _headline

    headline = _headline({"resume": 25, "predictive": -10, "sor": -5, "sos": -10})
    assert headline == ("More résumé-heavy and less predictive-driven than the production baseline")
    assert "heavier" not in headline and "lighter" not in headline
    assert _headline({"resume": 0, "predictive": 0, "sor": 0, "sos": 0}) == (
        "Close to production baseline"
    )


def test_edge_fit_sets_warning():
    from src.calibration.revealed_preferences import EDGE_FIT_WARNING

    teams = [f"T{i}" for i in range(8)]
    rng = np.random.default_rng(3)
    components = rng.random((len(teams), 4))
    edge = RankingWeights(resume=0.50, predictive=0.05, sor=0.45, sos=0.0)
    committee = _committee_from_weights(teams, components, edge)
    base_df = _synthetic_rankings(teams, components, PRODUCTION_BASELINE)
    games_df = pd.DataFrame({"home_team": ["T0"], "away_team": ["T1"]})

    fit = fit_weights_for_season(
        2024,
        base_df,
        games_df,
        week=15,
        candidates=[edge],
        committee_order=committee,
    )
    assert fit is not None
    assert fit.fit_warning is not None
    assert EDGE_FIT_WARNING in fit.fit_warning


def test_confidence_reflects_near_optimal_spread():
    from src.calibration.revealed_preferences import _confidence_label

    wide = {"resume": 20, "predictive": 20, "sor": 35, "sos": 5}
    narrow = {"resume": 0, "predictive": 0, "sor": 0, "sos": 0}
    assert _confidence_label(2, wide, week=15) == "directional"
    assert _confidence_label(2, narrow, week=15) == "high"


def test_objective_modes_slice_committee():
    from src.calibration.revealed_preferences import _objective_positions

    committee = [f"T{i}" for i in range(25)]
    assert _objective_positions(committee, "rank_error_top25") == list(range(1, 26))
    assert _objective_positions(committee, "rank_error_top12") == list(range(1, 13))
    assert _objective_positions(committee, "rank_error_bubble") == list(range(7, 19))

    teams = [f"T{i}" for i in range(15)]
    rng = np.random.default_rng(11)
    components = rng.random((len(teams), 4))
    target = RankingWeights(resume=0.50, predictive=0.20, sor=0.20, sos=0.10)
    order = _committee_from_weights(teams, components, target)
    base_df = _synthetic_rankings(teams, components, PRODUCTION_BASELINE)
    games_df = pd.DataFrame({"home_team": ["T0"], "away_team": ["T1"]})

    fit = fit_weights_for_season(
        2024,
        base_df,
        games_df,
        week=15,
        objective="rank_error_top12",
        candidates=[PRODUCTION_BASELINE, target],
        committee_order=order,
    )
    assert fit is not None
    assert fit.objective == "rank_error_top12"


def _fit_with_focus_shifts(miami_ranks, notre_dame_ranks):
    from src.calibration.revealed_preferences import (
        FitQuality,
        FitResult,
        Interpretation,
        TeamShift,
    )

    def _shift(team, committee_rank, ranks):
        baseline_rank, fitted_rank = ranks
        return TeamShift(
            team=team,
            baseline_rank=baseline_rank,
            fitted_rank=fitted_rank,
            rank_delta=baseline_rank - fitted_rank,
            committee_rank=committee_rank,
        )

    return FitResult(
        year=2025,
        week=15,
        fitted_weights=PRODUCTION_BASELINE,
        near_optimal_region=[],
        near_optimal_count=1,
        fit_quality=FitQuality(),
        baseline_delta_pp={"production": {"resume": 25, "predictive": -10, "sor": -5, "sos": -10}},
        interpretation=Interpretation(headline="test", confidence="high"),
        fit_warning=None,
        focus_team_shifts={
            "Miami": _shift("Miami", 10, miami_ranks),
            "Notre Dame": _shift("Notre Dame", 11, notre_dame_ranks),
        },
    )


def test_miami_attribution_reports_order_honestly():
    # Fitted blend still prefers Notre Dame: must say the order is NOT reproduced.
    fit = _fit_with_focus_shifts(miami_ranks=(12, 12), notre_dame_ranks=(8, 10))
    attribution = miami_notre_dame_attribution(fit)
    assert attribution is not None
    assert attribution["reproduces_committee_order"] is False
    assert "does not" in attribution["explanation"]
    assert attribution["fitted_shift"]["Miami"]["committee_rank"] == 10

    # Fitted blend flips the order: reported as reproduced.
    fit = _fit_with_focus_shifts(miami_ranks=(12, 9), notre_dame_ranks=(8, 10))
    attribution = miami_notre_dame_attribution(fit)
    assert attribution is not None
    assert attribution["reproduces_committee_order"] is True


def test_games_coverage_warning_flags_truncated_season():
    from src.calibration.revealed_preferences import _games_coverage_warning

    # 134 teams but only 557 games with weeks starting at 5 (the 2024 cache shape).
    truncated = pd.DataFrame(
        {
            "home_team": ["A"] * 557,
            "away_team": ["B"] * 557,
            "home_score": [21] * 557,
            "away_score": [14] * 557,
            "week": [5] * 557,
        }
    )
    warning = _games_coverage_warning(truncated, 134)
    assert warning is not None
    assert "Incomplete season coverage" in warning
    assert "earliest week 5" in warning

    full = pd.DataFrame(
        {
            "home_team": ["A"] * 761,
            "away_team": ["B"] * 761,
            "home_score": [21] * 761,
            "away_score": [14] * 761,
            "week": [1] * 761,
        }
    )
    assert _games_coverage_warning(full, 136) is None

    # A short season that already starts at week 1 (the 2020 COVID shape) gets
    # the short-season message, not advice to refetch from week 1.
    short = pd.DataFrame(
        {
            "home_team": ["A"] * 250,
            "away_team": ["B"] * 250,
            "home_score": [21] * 250,
            "away_score": [14] * 250,
            "week": [1] * 250,
        }
    )
    short_warning = _games_coverage_warning(short, 65)
    assert short_warning is not None
    assert "Short season" in short_warning
    assert "refetched" not in short_warning

    # Synthetic frames without score/week columns never trip the warning.
    synthetic = pd.DataFrame({"home_team": ["A"], "away_team": ["B"]})
    assert _games_coverage_warning(synthetic, 4) is None


def test_explanation_scope_flags_edge_fit_and_unreproduced_order():
    from src.calibration.revealed_preferences_outputs import _explanation_scope

    entry = {
        "year": 2025,
        "week": 15,
        "fitted_weights": {"resume": 0.65, "predictive": 0.20, "sor": 0.15, "sos": 0.0},
        "fit_quality": {"rank_error": 2.12, "baseline_rank_error": 3.76},
        "baseline_delta_pp": {
            "production": {"resume": 25, "predictive": -10, "sor": -5, "sos": -10},
        },
        "near_optimal_spread_pp": {"resume": 15, "predictive": 10, "sor": 20, "sos": 0},
        "teams_helped": [{"team": "Notre Dame"}],
    }
    public_case = {"reproduces_committee_order": False}
    scope = _explanation_scope(entry, public_case)

    explains = " ".join(scope["explains"])
    assert "résumé" in explains
    assert "3.76 to 2.12" in explains
    assert "Notre Dame" in explains

    does_not = " ".join(scope["does_not_explain"])
    assert "Notre Dame above Miami" in does_not
    assert "collapses to ~0%" in does_not  # SOS at the low edge
    assert "edge of the searched simplex" in does_not  # resume at the high edge
    assert "not identifiable" in does_not  # wide near-optimal spread


def test_golden_payload_keys_match_fixture(tmp_path: Path):
    teams = ["A", "B", "C", "D"]
    components = np.eye(4)
    committee = ["A", "B", "C", "D"]
    base_df = _synthetic_rankings(teams, components, PRODUCTION_BASELINE)
    games_df = pd.DataFrame({"home_team": ["A"], "away_team": ["B"]})
    fit = fit_weights_for_season(
        2024,
        base_df,
        games_df,
        week=15,
        committee_order=committee,
    )
    assert fit is not None

    from src.calibration.revealed_preferences import RevealedPreferencesResult

    result = RevealedPreferencesResult(requested_years=[2024], evaluated_entries=[fit])
    payload = build_revealed_preferences_payload(result)

    # The contract is frozen (schema_version 1, docs/api-contracts.md). Any key
    # change must be deliberate: update the fixture and the contract doc together.
    fixture_path = FIXTURES / "revealed_preferences_payload_keys.json"
    frozen = json.loads(fixture_path.read_text())
    assert set(payload.keys()) == set(frozen["root"])
    assert set(payload["entries"][0].keys()) == set(frozen["entry"])
    if payload["public_case_2025"] is not None:
        assert set(payload["public_case_2025"].keys()) == set(frozen["public_case_2025"])
