"""V2.4 SOR component-variant experiments (research-only).

Covers the locked contract: variants keep the production baseline weights and
only change how the SOR component is calculated; the exact Poisson-binomial
matches known closed-form cases; venue handling is explicit (home, away,
neutral); opponent-rating sources are limited to balanced and
predictive-leaning; the production calculate_sor is untouched; calibration and
emulation outputs carry component_variant metadata; and no variant can be
promoted past a protected holdout failure.
"""

import numpy as np
import pandas as pd
import pytest
from scipy.stats import binom

from src.calibration.decisions import Thresholds, decide
from src.calibration.emulation import build_committee_emulation_summary
from src.calibration.experiments import default_experiments, sor_variant_experiments
from src.calibration.harness import (
    CalibrationResult,
    ExperimentResult,
    YearMetrics,
    _SeasonInputs,
    _sor_variant_seasons,
    aggregate_metrics,
    review_substitution_availability,
)
from src.calibration.outputs import build_calibration_payload
from src.calibration.sor_variants import (
    HOME_FIELD_RATING_OFFSET,
    OPPONENT_RATING_BLENDS,
    SOR_VARIANT_IDS,
    apply_sor_variant,
    compute_sor_variant_scores,
    exact_poisson_binomial_sf,
    opponent_rating_lookup,
)
from src.pipeline.weights import RankingWeights
from src.utils.metrics import calculate_sor

# ---------------------------------------------------------------------------
# Exact Poisson-binomial: known cases, no approximation
# ---------------------------------------------------------------------------


def test_exact_poisson_binomial_matches_binomial_for_equal_probs():
    probs = [0.7] * 12
    for wins in (0, 1, 6, 9, 12):
        expected = 1.0 - binom.cdf(wins - 1, 12, 0.7)
        assert exact_poisson_binomial_sf(probs, wins) == pytest.approx(expected)


def test_exact_poisson_binomial_hand_cases():
    assert exact_poisson_binomial_sf([1.0, 0.0], 1) == pytest.approx(1.0)
    assert exact_poisson_binomial_sf([1.0, 0.0], 2) == pytest.approx(0.0)
    assert exact_poisson_binomial_sf([0.5, 0.5], 0) == pytest.approx(1.0)
    assert exact_poisson_binomial_sf([0.5, 0.5], 1) == pytest.approx(0.75)
    assert exact_poisson_binomial_sf([0.5, 0.5], 2) == pytest.approx(0.25)
    assert exact_poisson_binomial_sf([0.5, 0.5], 3) == pytest.approx(0.0)


def test_exact_poisson_binomial_sees_opponent_strength_distribution():
    """The averaged-probability binomial cannot tell these schedules apart."""
    uneven = [0.9, 0.1]  # one near-certain win, one near-certain loss
    even = [0.5, 0.5]
    # exact: sweeping the uneven schedule is much harder than the even one
    assert exact_poisson_binomial_sf(uneven, 2) == pytest.approx(0.09)
    assert exact_poisson_binomial_sf(even, 2) == pytest.approx(0.25)
    # averaged binomial smooths both to the same probability
    avg_sf = 1.0 - binom.cdf(1, 2, float(np.mean(uneven)))
    assert avg_sf == pytest.approx(1.0 - binom.cdf(1, 2, 0.5))


def test_production_calculate_sor_is_unchanged():
    """Production SOR stays the averaged-probability binomial (never quietly
    replaced by a variant — promotion is a deliberate decision, not a side
    effect of v2.4)."""
    record = {"wins": 2, "losses": 1}
    opp_ratings = [0.9, 0.5, 0.3]
    win_probs = [1.0 / (1.0 + 10 ** (-(0.75 - r) / 0.25)) for r in opp_ratings]
    avg_prob = float(np.mean(win_probs))
    expected = -np.log10(max(1.0 - binom.cdf(1, 3, avg_prob), 1e-10))
    assert calculate_sor(record, opp_ratings) == pytest.approx(expected)


# ---------------------------------------------------------------------------
# Experiment config contract
# ---------------------------------------------------------------------------


def test_variant_configs_are_component_variants_with_baseline_weights():
    baseline = default_experiments()[0]
    configs = sor_variant_experiments()
    assert [c.experiment_id for c in configs] == [
        "sor_exact_poisson_binomial",
        "sor_home_field_adjustment",
        "sor_opponent_rating_balanced",
        "sor_opponent_rating_predictive",
    ]
    for config in configs:
        assert config.experiment_type == "component_variant"
        assert config.research_only is True
        assert config.group == "variant"
        assert config.variant is not None
        assert config.variant["component"] == "sor"
        assert "variant_id" in config.variant
        assert "baseline_method" in config.variant
        assert "candidate_method" in config.variant
        assert config.substitution is None
        assert config.weights_dict() == baseline.weights_dict()
        assert config.weights_dict() == {
            "resume": 0.40,
            "predictive": 0.30,
            "sor": 0.20,
            "sos": 0.10,
        }


def test_home_field_metadata_block():
    config = next(
        c for c in sor_variant_experiments() if c.experiment_id == "sor_home_field_adjustment"
    )
    assert config.variant["home_field_adjustment"] == {
        "enabled": True,
        "method": "rating_offset",
        "rating_offset": HOME_FIELD_RATING_OFFSET,
        "neutral_sites_adjusted": False,
        "constant_source": "documented research assumption",
    }


def test_sor_variants_not_in_default_set():
    """The default calibrate run never includes the SOR variants."""
    defaults = default_experiments()
    ids = {config.experiment_id for config in defaults}
    for config in sor_variant_experiments():
        assert config.experiment_id not in ids
    assert all(config.variant is None for config in defaults)


def test_include_sor_variants_adds_only_the_variant_experiments():
    combined = default_experiments() + sor_variant_experiments()
    added = combined[len(default_experiments()) :]
    assert all(config.experiment_type == "component_variant" for config in added)
    assert len(added) == 4


def test_production_weights_unchanged():
    weights = RankingWeights()
    assert weights.resume == pytest.approx(0.40)
    assert weights.predictive == pytest.approx(0.30)
    assert weights.sor == pytest.approx(0.20)
    assert weights.sos == pytest.approx(0.10)


def test_opponent_rating_blends_are_limited():
    """Balanced and predictive-leaning only — no variant grid."""
    assert set(OPPONENT_RATING_BLENDS) == {"baseline", "balanced", "predictive_leaning"}
    assert len(SOR_VARIANT_IDS) == 4


# ---------------------------------------------------------------------------
# Variant score computation
# ---------------------------------------------------------------------------


def _game(home, away, home_score, away_score, neutral=False):
    return {
        "home_team": home,
        "away_team": away,
        "home_score": home_score,
        "away_score": away_score,
        "neutral_site": neutral,
        "week": 1,
    }


def _rankings_df():
    # resume and predictive orderings deliberately disagree so opponent-rating
    # blends produce different opponent strengths
    return pd.DataFrame(
        {
            "team": ["Team A", "Team B", "Team C", "Team D"],
            "resume_score": [0.9, 0.8, 0.3, 0.2],
            "predictive_score": [0.5, 0.2, 0.9, 0.6],
            "sor": [1.2, 1.0, 0.8, 0.6],
            "sos": [0.5, 0.5, 0.5, 0.5],
        }
    )


def test_home_field_venue_handling_is_explicit():
    """Home, away, and neutral schedules score differently — and only for the
    home-field variant."""
    rankings = _rankings_df()

    def schedule(venue):
        games = []
        for opp in ("Team B", "Team C", "Team D"):
            if venue == "home":
                games.append(_game("Team A", opp, 30, 10))
            elif venue == "away":
                games.append(_game(opp, "Team A", 10, 30))
            else:
                games.append(_game("Team A", opp, 30, 10, neutral=True))
        return pd.DataFrame(games)

    scores = {
        venue: compute_sor_variant_scores(schedule(venue), rankings, "home_field_adjustment")[
            "Team A"
        ]
        for venue in ("home", "away", "neutral")
    }
    # same 3-0 record: harder to achieve on the road than at home, neutral between
    assert scores["away"] > scores["neutral"] > scores["home"]

    # venue-blind variants ignore venue entirely
    blind = {
        venue: compute_sor_variant_scores(schedule(venue), rankings, "exact_poisson_binomial")[
            "Team A"
        ]
        for venue in ("home", "away", "neutral")
    }
    assert blind["home"] == pytest.approx(blind["away"])
    assert blind["home"] == pytest.approx(blind["neutral"])


def test_opponent_rating_sources_change_opponent_strengths():
    rankings = _rankings_df()
    baseline = opponent_rating_lookup(rankings, "baseline")
    balanced = opponent_rating_lookup(rankings, "balanced")
    predictive = opponent_rating_lookup(rankings, "predictive_leaning")
    # resume-tilted baseline rates Team B over Team C; predictive-leaning flips it
    assert baseline["Team B"] > baseline["Team C"]
    assert predictive["Team C"] > predictive["Team B"]

    games = pd.DataFrame(
        [
            _game("Team A", "Team B", 30, 10),
            _game("Team C", "Team A", 10, 30),
            _game("Team A", "Team D", 30, 10, neutral=True),
        ]
    )
    scores = {
        variant_id: compute_sor_variant_scores(games, rankings, variant_id)["Team A"]
        for variant_id in ("opponent_rating_balanced", "opponent_rating_predictive")
    }
    assert scores["opponent_rating_balanced"] != pytest.approx(scores["opponent_rating_predictive"])


def test_unknown_variant_id_is_rejected():
    with pytest.raises(ValueError, match="Unknown SOR variant"):
        compute_sor_variant_scores(pd.DataFrame(), _rankings_df(), "sos_capped")


def test_apply_sor_variant_replaces_only_the_sor_column():
    df = _rankings_df()
    scores = {"Team A": 2.0, "Team B": 1.5, "Team C": 1.0, "Team D": 0.5}
    applied, note = apply_sor_variant(df, scores)
    assert note == ""
    assert applied["sor"].tolist() == [2.0, 1.5, 1.0, 0.5]
    for col in ("resume_score", "predictive_score", "sos"):
        assert applied[col].tolist() == df[col].tolist()
    # source frame is never mutated
    assert df["sor"].tolist() == [1.2, 1.0, 0.8, 0.6]


def test_missing_variant_scores_degrade_explicitly():
    df = _rankings_df()

    applied, note = apply_sor_variant(df, {"Team A": 2.0, "Team B": 1.5, "Team C": 1.0})
    assert applied is None
    assert "missing variant SOR for 1 of 4 ranked teams" in note
    assert "Team D" in note

    applied, note = apply_sor_variant(df, {})
    assert applied is None
    assert "no variant scores" in note

    applied, note = apply_sor_variant(df, None)
    assert applied is None
    assert "no variant scores" in note


def test_harness_prepares_variant_seasons():
    games = pd.DataFrame(
        [
            _game("Team A", "Team B", 30, 10),
            _game("Team C", "Team A", 10, 30),
            _game("Team B", "Team C", 21, 20),
            _game("Team D", "Team B", 3, 40, neutral=True),
            _game("Team A", "Team D", 30, 10),
            _game("Team C", "Team D", 28, 7),
        ]
    )
    season = _SeasonInputs(year=2024, games_df=games, base_rankings_df=_rankings_df())
    config = sor_variant_experiments()[0]
    prepared = _sor_variant_seasons([season], config, verbose=False)
    variant_df, note = prepared[2024]
    assert note == ""
    assert variant_df["sor"].tolist() != season.base_rankings_df["sor"].tolist()
    for col in ("resume_score", "predictive_score", "sos"):
        assert variant_df[col].tolist() == season.base_rankings_df[col].tolist()


# ---------------------------------------------------------------------------
# Availability review applies to variant experiments too
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
    return YearMetrics(year=year, is_outlier=is_outlier, notes="SOR variant unavailable: boom.")


def test_variant_availability_review_matches_substitution_behavior():
    config = sor_variant_experiments()[0]
    per_year = [_year(2023, evaluated=False), _year(2024, evaluated=False)]
    result = ExperimentResult(
        config=config,
        per_year=per_year,
        metrics_all_seasons=aggregate_metrics(per_year, exclude_outliers=False),
        metrics_excluding_outliers=aggregate_metrics(per_year, exclude_outliers=True),
    )
    result.decision, result.reason, result.flags = decide({}, {}, {})
    review_substitution_availability(result)
    assert result.decision == "needs_more_data"
    assert result.flags == ["data_unavailable"]


# ---------------------------------------------------------------------------
# Calibration payload + emulation contract
# ---------------------------------------------------------------------------


def _experiment_result(config, *, holdout_2024_field_delta=0.0, alignment_gain=0.0):
    per_year = [_year(2022, is_outlier=True), _year(2024)]
    result = ExperimentResult(
        config=config,
        per_year=per_year,
        metrics_all_seasons=aggregate_metrics(per_year, exclude_outliers=False),
        metrics_excluding_outliers=aggregate_metrics(per_year, exclude_outliers=True),
    )
    result.baseline_delta = {
        "spearman_top12": alignment_gain,
        "top12_overlap": alignment_gain,
        "field_overlap": 0.0,
        "correct_field_size_rate": 0.0,
        "brier": 0.0,
        "win_accuracy": 0.0,
    }
    result.baseline_delta_all_seasons = dict(result.baseline_delta)
    result.holdout = {
        "2022": {"alignment_delta": 0.0, "field_overlap_delta": 0.0, "note": "n"},
        "2024": {
            "alignment_delta": 0.0,
            "field_overlap_delta": holdout_2024_field_delta,
            "note": "n",
        },
    }
    result.decision, result.reason, result.flags = decide(
        result.baseline_delta,
        result.baseline_delta_all_seasons,
        result.holdout,
        is_baseline=config.experiment_id == "baseline",
    )
    return result


def _result_with_variants(**kwargs) -> CalibrationResult:
    experiments = [_experiment_result(default_experiments()[0])]
    for config in sor_variant_experiments():
        experiments.append(_experiment_result(config, **kwargs))
    return CalibrationResult(
        years=[2022, 2024],
        evaluated_years=[2022, 2024],
        outlier_years=[2022],
        holdout_years=[2022, 2024],
        baseline_weights=RankingWeights(),
        thresholds=Thresholds(),
        experiments=experiments,
    )


def test_payload_contract_includes_component_variant_metadata():
    payload = build_calibration_payload(_result_with_variants())
    entry = next(
        e for e in payload["experiments"] if e["experiment_id"] == "sor_exact_poisson_binomial"
    )
    assert entry["experiment_type"] == "component_variant"
    assert entry["research_only"] is True
    assert entry["substitution"] is None
    assert entry["variant"]["component"] == "sor"
    assert entry["variant"]["variant_id"] == "exact_poisson_binomial"
    assert entry["variant"]["baseline_method"] == "binomial_with_averaged_win_probability"
    assert entry["variant"]["candidate_method"] == "exact_poisson_binomial_dp"
    assert entry["weights"] == {"resume": 0.4, "predictive": 0.3, "sor": 0.2, "sos": 0.1}

    # reweighting experiments carry the field too, unset
    baseline = next(e for e in payload["experiments"] if e["experiment_id"] == "baseline")
    assert baseline["variant"] is None


def test_emulation_carries_variant_metadata():
    payload = build_calibration_payload(_result_with_variants())
    summary = build_committee_emulation_summary(payload)
    entry = next(
        e for e in summary["candidates"] if e["experiment_id"] == "sor_home_field_adjustment"
    )
    assert entry["experiment_type"] == "component_variant"
    assert entry["variant"]["variant_id"] == "home_field_adjustment"
    # zero deltas: changing the calculation is not an automatic alignment win
    assert entry["status"] == "not_committee_aligned"


def test_variant_with_protected_holdout_failure_is_blocked():
    """An alignment gain never promotes a variant past a 2024 holdout collapse."""
    payload = build_calibration_payload(
        _result_with_variants(alignment_gain=0.05, holdout_2024_field_delta=-0.09)
    )
    summary = build_committee_emulation_summary(payload)
    for entry in summary["candidates"]:
        if entry["experiment_type"] != "component_variant":
            continue
        assert entry["status"] == "blocked"
        assert "2024_holdout_field_overlap" in entry["protected_failures"]
