"""Calibration experiment configurations.

Most experiments are transparent reweightings of the four composite pillars.
The baseline is always the production default (``RankingWeights()``); ablations
zero one component and renormalize the rest so weights still sum to 1.0. Two
exceptions keep the baseline weights and change the component itself: the v2.3
component-substitution experiment swaps the predictive component's data
source, and the v2.4 component-variant experiments change how the SOR
component is calculated.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from src.pipeline.weights import COMPONENT_KEYS, RankingWeights

ExperimentGroup = str  # baseline | ablation | sweep | optional | substitution | variant


@dataclass(frozen=True)
class ExperimentConfig:
    experiment_id: str
    label: str
    description: str
    changed_assumption: str
    weights: RankingWeights
    group: ExperimentGroup
    # v2.3: component-substitution experiments keep the baseline weights but
    # swap one component's data source. ``substitution`` names the component
    # and both sources; it stays None for pure reweighting experiments.
    # v2.4: component-variant experiments also keep the baseline weights but
    # change how one component is calculated (same data, different method).
    # ``variant`` names the component, variant_id, and both methods.
    experiment_type: str = "reweighting"
    research_only: bool = True
    substitution: Optional[Dict[str, str]] = None
    variant: Optional[Dict[str, object]] = None

    def weights_dict(self) -> Dict[str, float]:
        return {key: round(float(getattr(self.weights, key)), 6) for key in COMPONENT_KEYS}


def ablation_weights(component: str, base: Optional[RankingWeights] = None) -> RankingWeights:
    """Zero one composite component and renormalize the remaining weights to 1.0."""
    if component not in COMPONENT_KEYS:
        raise ValueError(f"Unknown component '{component}'; expected one of {COMPONENT_KEYS}")
    base = base or RankingWeights()
    remaining = {key: getattr(base, key) for key in COMPONENT_KEYS if key != component}
    total = sum(remaining.values())
    if total <= 0:
        raise ValueError(f"Cannot ablate '{component}': remaining weights sum to zero")
    values = {key: value / total for key, value in remaining.items()}
    values[component] = 0.0
    return RankingWeights(colley_share=base.colley_share, **values)


def _weights(resume: float, predictive: float, sor: float, sos: float) -> RankingWeights:
    return RankingWeights(resume=resume, predictive=predictive, sor=sor, sos=sos)


def default_experiments(base: Optional[RankingWeights] = None) -> List[ExperimentConfig]:
    """The v2.1 experiment set: baseline, four ablations, six sweeps, three optional."""
    base = base or RankingWeights()
    experiments: List[ExperimentConfig] = [
        ExperimentConfig(
            experiment_id="baseline",
            label="Baseline (production defaults)",
            description=(
                "Current production composite weights. All other experiments are "
                "measured as deltas against this configuration."
            ),
            changed_assumption="none",
            weights=base,
            group="baseline",
        ),
    ]

    ablation_labels = {
        "sor": "No SOR",
        "sos": "No SOS",
        "predictive": "No Predictive",
        "resume": "No Resume",
    }
    for component, label in ablation_labels.items():
        experiments.append(
            ExperimentConfig(
                experiment_id=f"no_{component}",
                label=label,
                description=(
                    f"Removes the {component} component entirely; remaining weights "
                    "renormalized to 1.0. Measures what that pillar contributes."
                ),
                changed_assumption=f"{component} weight set to 0",
                weights=ablation_weights(component, base),
                group="ablation",
            )
        )

    sweeps = [
        (
            "resume_heavy",
            "Resume-heavy",
            _weights(0.55, 0.20, 0.15, 0.10),
            "resume weight raised to 0.55",
        ),
        (
            "predictive_heavy",
            "Predictive-heavy",
            _weights(0.25, 0.50, 0.15, 0.10),
            "predictive weight raised to 0.50",
        ),
        (
            "sor_heavy",
            "SOR-heavy",
            _weights(0.35, 0.20, 0.35, 0.10),
            "SOR weight raised to 0.35",
        ),
        (
            "balanced",
            "Balanced 25/25/25/25",
            _weights(0.25, 0.25, 0.25, 0.25),
            "all four pillars weighted equally",
        ),
        (
            "committee_alignment_candidate",
            "Committee-alignment candidate",
            _weights(0.45, 0.25, 0.20, 0.10),
            "small resume tilt intended to track committee ordering",
        ),
        (
            "predictive_signal_candidate",
            "Predictive-signal candidate",
            _weights(0.30, 0.45, 0.15, 0.10),
            "predictive tilt intended to improve game-outcome signal",
        ),
    ]
    for experiment_id, label, weights, assumption in sweeps:
        experiments.append(
            ExperimentConfig(
                experiment_id=experiment_id,
                label=label,
                description=f"Weight sweep: {assumption}.",
                changed_assumption=assumption,
                weights=weights,
                group="sweep",
            )
        )

    optional = [
        (
            "sos_capped",
            "SOS capped",
            _weights(0.45, 0.30, 0.20, 0.05),
            "SOS halved to 0.05 (schedule strength de-emphasized)",
        ),
        (
            "sor_boosted",
            "SOR boosted",
            _weights(0.35, 0.25, 0.30, 0.10),
            "SOR raised to 0.30 at resume/predictive expense",
        ),
        (
            "predictive_only",
            "Predictive-only",
            _weights(0.0, 1.0, 0.0, 0.0),
            "pure predictive baseline (no resume/SOR/SOS)",
        ),
    ]
    for experiment_id, label, weights, assumption in optional:
        experiments.append(
            ExperimentConfig(
                experiment_id=experiment_id,
                label=label,
                description=f"Optional probe: {assumption}.",
                changed_assumption=assumption,
                weights=weights,
                group="optional",
            )
        )

    return experiments


def ppa_substitution_experiment(base: Optional[RankingWeights] = None) -> ExperimentConfig:
    """The v2.3 research-only component substitution: same weights, PPA predictive.

    Deliberately not part of ``default_experiments()`` — it needs CFBD PPA data,
    so it only runs when explicitly requested (``sroom calibrate --include-ppa``).
    """
    return ExperimentConfig(
        experiment_id="ppa_predictive_substitution",
        label="PPA predictive substitution",
        description=(
            "Uses CFBD PPA as the predictive component while keeping baseline weights unchanged."
        ),
        changed_assumption=(
            "predictive component replaced by CFBD per-game PPA "
            "(regular season through week 15); weights unchanged"
        ),
        weights=base or RankingWeights(),
        group="substitution",
        experiment_type="component_substitution",
        substitution={
            "component": "predictive",
            "baseline_source": "current_predictive",
            "candidate_source": "cfbd_ppa",
        },
    )


def sor_variant_experiments(base: Optional[RankingWeights] = None) -> List[ExperimentConfig]:
    """The v2.4 research-only SOR component variants: same weights, new SOR method.

    Deliberately not part of ``default_experiments()`` — they only run when
    explicitly requested (``sroom calibrate --include-sor-variants``). Each
    variant changes exactly one assumption in the SOR calculation; the
    production ``calculate_sor`` is never modified.
    """
    weights = base or RankingWeights()
    return [
        ExperimentConfig(
            experiment_id="sor_exact_poisson_binomial",
            label="SOR exact Poisson-binomial",
            description=(
                "Computes SOR with an exact dynamic-programming Poisson binomial "
                "instead of the averaged-win-probability binomial approximation, "
                "keeping baseline weights unchanged."
            ),
            changed_assumption=(
                "SOR aggregation replaced by exact Poisson-binomial DP — restores "
                "the distribution of opponent difficulty the averaged "
                "approximation smooths away; weights unchanged"
            ),
            weights=weights,
            group="variant",
            experiment_type="component_variant",
            variant={
                "component": "sor",
                "variant_id": "exact_poisson_binomial",
                "baseline_method": "binomial_with_averaged_win_probability",
                "candidate_method": "exact_poisson_binomial_dp",
            },
        ),
        ExperimentConfig(
            experiment_id="sor_home_field_adjustment",
            label="SOR home-field adjustment",
            description=(
                "Adjusts the hypothetical top-25 team's per-game win probability "
                "by venue (home up, away down, neutral unchanged), keeping "
                "baseline weights unchanged."
            ),
            changed_assumption=(
                "SOR win probabilities venue-adjusted with one documented "
                "rating-offset constant (research assumption, not a definitive "
                "home-field value); weights unchanged"
            ),
            weights=weights,
            group="variant",
            experiment_type="component_variant",
            variant={
                "component": "sor",
                "variant_id": "home_field_adjustment",
                "baseline_method": "venue_blind_win_probabilities",
                "candidate_method": "venue_adjusted_win_probabilities",
                "home_field_adjustment": {
                    "enabled": True,
                    "method": "rating_offset",
                    "rating_offset": 0.033,
                    "neutral_sites_adjusted": False,
                    "constant_source": "documented research assumption",
                },
            },
        ),
        ExperimentConfig(
            experiment_id="sor_opponent_rating_balanced",
            label="SOR balanced opponent ratings",
            description=(
                "Rates SOR opponents with a balanced 0.50 resume / 0.50 "
                "predictive blend instead of the resume-tilted provisional "
                "composite, keeping baseline weights unchanged."
            ),
            changed_assumption=(
                "SOR opponent ratings from a balanced resume/predictive blend — "
                "audits the resume double-count in the provisional composite; "
                "weights unchanged"
            ),
            weights=weights,
            group="variant",
            experiment_type="component_variant",
            variant={
                "component": "sor",
                "variant_id": "opponent_rating_balanced",
                "baseline_method": "provisional_composite_0.50_resume_0.30_predictive",
                "candidate_method": "balanced_0.50_resume_0.50_predictive",
            },
        ),
        ExperimentConfig(
            experiment_id="sor_opponent_rating_predictive",
            label="SOR predictive-leaning opponent ratings",
            description=(
                "Rates SOR opponents with a predictive-leaning 0.30 resume / "
                "0.70 predictive blend instead of the resume-tilted provisional "
                "composite, keeping baseline weights unchanged."
            ),
            changed_assumption=(
                "SOR opponent ratings from a predictive-leaning blend — audits "
                "the resume double-count in the provisional composite; weights "
                "unchanged"
            ),
            weights=weights,
            group="variant",
            experiment_type="component_variant",
            variant={
                "component": "sor",
                "variant_id": "opponent_rating_predictive_leaning",
                "baseline_method": "provisional_composite_0.50_resume_0.30_predictive",
                "candidate_method": "predictive_leaning_0.30_resume_0.70_predictive",
            },
        ),
    ]
