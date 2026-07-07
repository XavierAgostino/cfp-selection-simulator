"""Revealed preferences artifact writers: revealed-preferences.json / .md / .csv."""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from src.calibration.revealed_preferences import (
    CANONICAL_DISCLAIMER,
    COMPONENT_DISPLAY,
    EDGE_WEIGHT_HIGH,
    EDGE_WEIGHT_LOW,
    NEAR_OPTIMAL_SPREAD_DIRECTIONAL_PP,
    FitResult,
    RevealedPreferencesResult,
    miami_notre_dame_attribution,
)
from src.pipeline.weights import COMPONENT_KEYS

SCHEMA_VERSION = 1

CAVEATS = [
    CANONICAL_DISCLAIMER,
    "Research mode only: fitted weights never change production defaults.",
    (
        "Fitted weights are descriptive approximations, not normative recommendations "
        "and not the committee's secret formula."
    ),
    (
        "Near-optimal regions mean multiple weight blends fit similarly; treat deltas "
        "as directional, not exact."
    ),
    (
        "Weekly fits are noisier than final-field fits; early-season shifts are "
        "directional signals only."
    ),
]


def _round(value: Optional[float], digits: int = 4) -> Optional[float]:
    return round(float(value), digits) if value is not None else None


def _weights_dict(weights: object) -> Dict[str, float]:
    return {key: round(float(getattr(weights, key)), 4) for key in COMPONENT_KEYS}


def _fit_entry(fit: FitResult) -> Dict[str, object]:
    return {
        "research_only": True,
        "objective": fit.objective,
        "search_step": fit.search_step,
        "committee_rank_source": fit.committee_rank_source,
        "year": fit.year,
        "week": fit.week,
        "fitted_weights": _weights_dict(fit.fitted_weights),
        "near_optimal_count": fit.near_optimal_count,
        "near_optimal_spread_pp": fit.near_optimal_spread_pp,
        "near_optimal_region": [
            {
                "weights": _weights_dict(candidate.weights),
                "rank_error": _round(candidate.rank_error),
                "spearman_top12": _round(candidate.spearman_top12),
            }
            for candidate in fit.near_optimal_region[:20]
        ],
        "baseline_delta_pp": fit.baseline_delta_pp,
        "fit_quality": {
            "rank_error": _round(fit.fit_quality.rank_error),
            "spearman_top12": _round(fit.fit_quality.spearman_top12),
            "baseline_rank_error": _round(fit.fit_quality.baseline_rank_error),
            "top12_overlap": _round(fit.fit_quality.top12_overlap),
            "field_overlap": _round(fit.fit_quality.field_overlap),
            "brier": _round(fit.fit_quality.brier),
        },
        "fit_warning": fit.fit_warning,
        "interpretation": {
            "headline": fit.interpretation.headline,
            "confidence": fit.interpretation.confidence,
            "warning": fit.interpretation.warning,
        },
        "teams_helped": [
            {
                "team": t.team,
                "committee_rank": t.committee_rank,
                "baseline_rank": t.baseline_rank,
                "fitted_rank": t.fitted_rank,
                "rank_delta": t.rank_delta,
            }
            for t in fit.teams_helped
        ],
        "teams_hurt": [
            {
                "team": t.team,
                "committee_rank": t.committee_rank,
                "baseline_rank": t.baseline_rank,
                "fitted_rank": t.fitted_rank,
                "rank_delta": t.rank_delta,
            }
            for t in fit.teams_hurt
        ],
    }


def _join_component_names(keys: List[str]) -> str:
    names = [COMPONENT_DISPLAY[k] for k in keys]
    if len(names) <= 2:
        return " and ".join(names)
    return ", ".join(names[:-1]) + ", and " + names[-1]


def _explanation_scope(
    entry: Dict[str, object],
    public_case: Optional[Dict[str, object]],
) -> Dict[str, List[str]]:
    """Derive an honest 'explains / does not explain' summary from a fit entry."""
    explains: List[str] = []
    does_not: List[str] = []

    weights = entry.get("fitted_weights", {})
    fit_quality = entry.get("fit_quality", {})
    deltas = entry.get("baseline_delta_pp", {})
    production_delta = deltas.get("production", {}) if isinstance(deltas, dict) else {}

    heavier = [k for k in COMPONENT_KEYS if production_delta.get(k, 0) >= 5]
    lighter = [k for k in COMPONENT_KEYS if production_delta.get(k, 0) <= -5]
    if heavier:
        names = _join_component_names(heavier)
        explains.append(
            f"The committee's ranking is better approximated by a heavier {names} "
            "emphasis than the production baseline."
        )
    if lighter:
        names = _join_component_names(lighter)
        explains.append(
            f"A lighter {names} emphasis fits the committee's order better than "
            "the baseline blend."
        )
    rank_error = fit_quality.get("rank_error")
    baseline_error = fit_quality.get("baseline_rank_error")
    if rank_error is not None and baseline_error is not None:
        explains.append(
            "The fitted blend reduces mean absolute rank error against the "
            f"committee from {baseline_error} to {rank_error}."
        )
    helped = [
        t.get("team")
        for t in entry.get("teams_helped", [])
        if isinstance(t, dict) and t.get("team")
    ]
    if helped:
        explains.append(
            "Teams moved toward their committee position: " + ", ".join(helped[:3]) + "."
        )

    if public_case and public_case.get("reproduces_committee_order") is False:
        does_not.append(
            "The fitted blend still ranks Notre Dame above Miami: no searched "
            "reweighting of the four factors reproduces the committee's "
            "Miami-over-Notre-Dame ordering."
        )
    collapsed = [k for k in COMPONENT_KEYS if float(weights.get(k, 0.0)) <= EDGE_WEIGHT_LOW]
    if collapsed:
        names = _join_component_names(collapsed)
        does_not.append(
            f"{names.capitalize()} collapses to ~0% in the fit. That more likely "
            "means the remaining components absorb its signal (résumé and SOR "
            "already embed schedule treatment) than that the committee ignores it."
        )
    maxed = [k for k in COMPONENT_KEYS if float(weights.get(k, 0.0)) >= EDGE_WEIGHT_HIGH]
    if maxed:
        names = _join_component_names(maxed)
        does_not.append(
            f"The {names} weight sits at the edge of the searched simplex, so its "
            "exact magnitude is directional, not identified."
        )
    spread = entry.get("near_optimal_spread_pp")
    if isinstance(spread, dict) and spread:
        max_spread = max(spread.values())
        if max_spread >= NEAR_OPTIMAL_SPREAD_DIRECTIONAL_PP:
            does_not.append(
                "Several nearby blends fit almost equally well (component spread up "
                f"to {max_spread}pp), so the exact split between components is not "
                "identifiable from this season alone."
            )
    does_not.append(
        "Rank-error magnitudes are not yet comparable across seasons; treat "
        "cross-year fit-quality comparisons as an open question."
    )
    return {"explains": explains, "does_not_explain": does_not}


def build_revealed_preferences_payload(
    result: RevealedPreferencesResult,
) -> Dict[str, object]:
    entries = [_fit_entry(fit) for fit in result.evaluated_entries]
    public_case = None
    for fit in result.evaluated_entries:
        if fit.year == 2025 and fit.week == 15:
            public_case = miami_notre_dame_attribution(fit)
            break

    for entry in entries:
        case = (
            public_case
            if public_case is not None and entry.get("year") == 2025 and entry.get("week") == 15
            else None
        )
        entry["explanation_scope"] = _explanation_scope(entry, case)

    return {
        "schema_version": SCHEMA_VERSION,
        "research_only": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "requested_years": result.requested_years,
        "production_baseline": _weights_dict(result.production_baseline),
        "entries": entries,
        "public_case_2025": public_case,
        "caveats": CAVEATS,
    }


def _weekly_drift_lines(entries: List[FitResult]) -> List[str]:
    lines: List[str] = []
    by_year: Dict[int, List[FitResult]] = {}
    for fit in entries:
        by_year.setdefault(fit.year, []).append(fit)
    for year in sorted(by_year):
        season_entries = sorted(by_year[year], key=lambda f: f.week)
        if len(season_entries) < 2:
            continue
        lines.append(f"### {year}")
        for prev, curr in zip(season_entries, season_entries[1:]):
            prior_delta = curr.baseline_delta_pp.get("prior_week")
            if prior_delta:
                parts = [f"{key} {prior_delta[key]:+d}" for key in COMPONENT_KEYS]
            else:
                parts = [
                    f"{key} "
                    f"{int(round((getattr(curr.fitted_weights, key) - getattr(prev.fitted_weights, key)) * 100)):+d}"
                    for key in COMPONENT_KEYS
                ]
            lines.append(f"Week {prev.week} -> Week {curr.week}: " + ", ".join(parts))
    return lines


def _markdown_report(payload: Dict[str, object]) -> str:
    lines = [
        "# Revealed Committee Preferences",
        "",
        CANONICAL_DISCLAIMER,
        "",
        "## Caveats",
        "",
    ]
    # The canonical disclaimer already opens the report; don't repeat it here.
    for caveat in payload.get("caveats", []):
        if caveat == CANONICAL_DISCLAIMER:
            continue
        lines.append(f"- {caveat}")

    lines.extend(["", "## Fits", ""])
    for entry in payload.get("entries", []):
        if not isinstance(entry, dict):
            continue
        year = entry.get("year")
        week = entry.get("week")
        w = entry.get("fitted_weights", {})
        fq = entry.get("fit_quality", {})
        interp = entry.get("interpretation", {})
        lines.append(f"### {year} week {week}")
        lines.append(
            f"- Weights: resume {w.get('resume')} / predictive {w.get('predictive')} "
            f"/ SOR {w.get('sor')} / SOS {w.get('sos')}"
        )
        lines.append(
            f"- Rank error {fq.get('rank_error')} (baseline {fq.get('baseline_rank_error')}), "
            f"Spearman top-12 {fq.get('spearman_top12')}, near-optimal {entry.get('near_optimal_count')}"
        )
        spread = entry.get("near_optimal_spread_pp")
        if isinstance(spread, dict) and spread:
            spread_str = ", ".join(f"{key} {value}pp" for key, value in spread.items())
            lines.append(f"- Near-optimal spread: {spread_str}")
        lines.append(f"- {interp.get('headline')} [{interp.get('confidence')}]")
        if entry.get("fit_warning"):
            lines.append(f"- Warning: {entry.get('fit_warning')}")
        scope = entry.get("explanation_scope")
        if isinstance(scope, dict):
            lines.extend(["", "**What this fit explains:**", ""])
            for item in scope.get("explains", []):
                lines.append(f"- {item}")
            lines.extend(["", "**What it does not explain:**", ""])
            for item in scope.get("does_not_explain", []):
                lines.append(f"- {item}")
        lines.append("")

    drift = _weekly_drift_lines([fit for fit in _entries_from_payload(payload)])
    if drift:
        lines.extend(["## Committee preference drift by week", ""])
        lines.extend(drift)
        lines.append("")

    public_case = payload.get("public_case_2025")
    if isinstance(public_case, dict):
        lines.extend(["## 2025 public-case diagnostic (Miami / Notre Dame)", ""])
        fitted_shift = public_case.get("fitted_shift")
        if isinstance(fitted_shift, dict) and fitted_shift:
            lines.append("| Team | Committee | Baseline | Fitted |")
            lines.append("|------|-----------|----------|--------|")
            for team, ranks in fitted_shift.items():
                if not isinstance(ranks, dict):
                    continue
                lines.append(
                    f"| {team} | {ranks.get('committee_rank')} "
                    f"| {ranks.get('baseline_rank')} | {ranks.get('fitted_rank')} |"
                )
            lines.append("")
        reproduces = public_case.get("reproduces_committee_order")
        lines.append(
            "Reproduces committee's Miami-over-Notre-Dame order: "
            f"{'yes' if reproduces else 'no'}"
        )
        lines.append("")
        lines.append(public_case.get("explanation", ""))
        lines.append("")
        lines.append(f"Headline: {public_case.get('headline')}")
        lines.append("")

    return "\n".join(lines)


def _entries_from_payload(payload: Dict[str, object]) -> List[FitResult]:
    """Reconstruct minimal FitResult list for drift formatting from payload."""
    from src.calibration.revealed_preferences import FitQuality, Interpretation
    from src.pipeline.weights import RankingWeights

    fits: List[FitResult] = []
    for entry in payload.get("entries", []):
        if not isinstance(entry, dict):
            continue
        weights_raw = entry.get("fitted_weights", {})
        weights = RankingWeights(
            resume=float(weights_raw.get("resume", 0.4)),
            predictive=float(weights_raw.get("predictive", 0.3)),
            sor=float(weights_raw.get("sor", 0.2)),
            sos=float(weights_raw.get("sos", 0.1)),
        )
        fq_raw = entry.get("fit_quality", {})
        interp_raw = entry.get("interpretation", {})
        fits.append(
            FitResult(
                year=int(entry["year"]),
                week=int(entry["week"]),
                fitted_weights=weights,
                near_optimal_region=[],
                near_optimal_count=int(entry.get("near_optimal_count", 0)),
                fit_quality=FitQuality(
                    rank_error=fq_raw.get("rank_error"),
                    baseline_rank_error=fq_raw.get("baseline_rank_error"),
                    spearman_top12=fq_raw.get("spearman_top12"),
                ),
                baseline_delta_pp=entry.get("baseline_delta_pp", {}),
                interpretation=Interpretation(
                    headline=str(interp_raw.get("headline", "")),
                    confidence=interp_raw.get("confidence", "directional"),
                    warning=interp_raw.get("warning"),
                ),
                fit_warning=entry.get("fit_warning"),
            )
        )
    return fits


def write_revealed_preferences_outputs(
    result: RevealedPreferencesResult,
    out_dir: Path,
    *,
    payload: Optional[Dict[str, object]] = None,
) -> Dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    payload = payload or build_revealed_preferences_payload(result)

    json_path = out_dir / "revealed-preferences.json"
    md_path = out_dir / "revealed-preferences.md"
    csv_path = out_dir / "revealed-preferences.csv"

    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    md_path.write_text(_markdown_report(payload), encoding="utf-8")

    fieldnames = [
        "season",
        "week",
        "resume",
        "predictive",
        "sor",
        "sos",
        "rank_error",
        "spearman_top12",
        "top12_overlap",
        "near_optimal_count",
        "confidence",
        "headline",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for entry in payload.get("entries", []):
            if not isinstance(entry, dict):
                continue
            w = entry.get("fitted_weights", {})
            fq = entry.get("fit_quality", {})
            interp = entry.get("interpretation", {})
            writer.writerow(
                {
                    "season": entry.get("year"),
                    "week": entry.get("week"),
                    "resume": w.get("resume"),
                    "predictive": w.get("predictive"),
                    "sor": w.get("sor"),
                    "sos": w.get("sos"),
                    "rank_error": fq.get("rank_error"),
                    "spearman_top12": fq.get("spearman_top12"),
                    "top12_overlap": fq.get("top12_overlap"),
                    "near_optimal_count": entry.get("near_optimal_count"),
                    "confidence": interp.get("confidence"),
                    "headline": interp.get("headline"),
                }
            )

    return {"json": json_path, "markdown": md_path, "csv": csv_path}
