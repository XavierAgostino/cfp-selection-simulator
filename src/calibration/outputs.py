"""Calibration artifact writers: calibration.json / .md / .csv.

Research-mode outputs only — nothing here feeds the production pipeline or the
web app. The JSON payload is the contract; the markdown and CSV are
convenience views of the same data.
"""

from __future__ import annotations

import csv
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from src.calibration.harness import DELTA_KEYS, CalibrationResult, ExperimentResult, YearMetrics
from src.pipeline.weights import COMPONENT_KEYS

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1

CAVEATS = [
    (
        "Research mode: these results measure how transparent assumptions changed "
        "historical alignment and predictive signal. They do not identify a "
        "'correct' model and are not committee replication."
    ),
    "Default production weights are unchanged by calibration runs.",
    (
        "'Recommended' means the experiment cleared the research quality gate and "
        "is a candidate for follow-up testing — it is never an instruction to "
        "change production defaults."
    ),
    (
        "Weight experiments hold colley_share and all component definitions "
        "fixed; component scores are computed once per season and reweighted. "
        "Component-substitution experiments (only when explicitly requested, "
        "e.g. --include-ppa) keep the baseline weights and swap one component's "
        "data source; component-variant experiments (--include-sor-variants) "
        "keep the baseline weights and change how one component is calculated "
        "from the same data. Seasons with missing candidate data are reported "
        "as unavailable, never silently filled, and the production component "
        "calculations are never modified."
    ),
    (
        "Min-max normalization is per-season, so composite scores are relative to "
        "each season's team universe."
    ),
    (
        "Conference and champion labels are enriched once per 12-team season and "
        "reused across experiments (they are rank-independent when sourced from "
        "actual championship-game results)."
    ),
    (
        "Outlier seasons (2022) are never hidden: all-seasons and outlier-excluded "
        "views are both reported, and decisions use the outlier-excluded view with "
        "an overfitting check against the all-seasons view."
    ),
    (
        "Predictive metrics are retrospective scoring on completed regular-season "
        "games, not live forecasting; 2020 is a shortened COVID season."
    ),
    "Seeding metrics exist only for 2024, the lone completed 12-team season.",
    (
        "Thresholds are initial calibration-gate values chosen to prevent "
        "vibes-driven conclusions — not permanent scientific truth."
    ),
]

STATIC_NEXT_EXPERIMENTS = [
    "Add 2025 as a second modern-format holdout once the final field is published.",
    (
        "Replace per-axis sweeps with joint weight perturbation (Dirichlet-style) "
        "around any candidate that clears the gate."
    ),
    (
        "Fit per-era weights (4-team vs 12-team) to test whether the committee's "
        "revealed preferences shifted with the format change."
    ),
]


def _round(value: Optional[float], digits: int = 6) -> Optional[float]:
    return round(float(value), digits) if value is not None else None


def _round_map(values: Dict[str, Optional[float]]) -> Dict[str, Optional[float]]:
    return {
        key: (_round(value) if isinstance(value, float) else value) for key, value in values.items()
    }


def _year_row(row: YearMetrics) -> Dict[str, object]:
    return {
        "year": row.year,
        "is_outlier": row.is_outlier,
        "notes": row.notes,
        "spearman_top12": _round(row.spearman_top12),
        "top12_overlap": _round(row.top12_overlap),
        "bubble_overlap": _round(row.bubble_overlap),
        "field_overlap": _round(row.field_overlap),
        "correct_field_size": row.correct_field_size,
        "seeding_within_one": _round(row.seeding_within_one),
        "brier": _round(row.brier),
        "win_accuracy": _round(row.win_accuracy),
    }


def _experiment_entry(result: ExperimentResult) -> Dict[str, object]:
    config = result.config
    return {
        "experiment_id": config.experiment_id,
        "label": config.label,
        "description": config.description,
        "group": config.group,
        "weights": config.weights_dict(),
        "changed_assumption": config.changed_assumption,
        "experiment_type": config.experiment_type,
        "research_only": config.research_only,
        "substitution": dict(config.substitution) if config.substitution else None,
        "variant": dict(config.variant) if config.variant else None,
        "metrics": {
            "all_seasons": _round_map(result.metrics_all_seasons),
            "excluding_outliers": _round_map(result.metrics_excluding_outliers),
        },
        "per_year_metrics": [_year_row(row) for row in result.per_year],
        "baseline_delta": _round_map(result.baseline_delta),
        "baseline_delta_all_seasons": _round_map(result.baseline_delta_all_seasons),
        "holdout": {
            year: {
                "alignment_delta": _round(block.get("alignment_delta")),  # type: ignore[arg-type]
                "field_overlap_delta": _round(block.get("field_overlap_delta")),  # type: ignore[arg-type]
                "note": block.get("note"),
            }
            for year, block in result.holdout.items()
        },
        "flags": list(result.flags),
        "decision": result.decision,
        "reason": result.reason,
        "notes": "",
    }


def _recommended_next(result: CalibrationResult) -> List[str]:
    suggestions: List[str] = []
    for experiment in result.experiments:
        if experiment.decision in ("recommended", "promising"):
            weights = experiment.config.weights_dict()
            weight_str = "/".join(f"{weights[key]:.2f}" for key in COMPONENT_KEYS)
            suggestions.append(
                f"Refine '{experiment.config.experiment_id}' ({weight_str}) with "
                "smaller weight steps and confirm the tradeoff pattern holds per year."
            )
    suggestions.extend(STATIC_NEXT_EXPERIMENTS)
    return suggestions


def season_coverage(requested_years: List[int], evaluated_years: List[int]) -> Dict[str, object]:
    """Explicit season coverage so a partial run can never pass as a full one."""
    evaluated = set(evaluated_years)
    missing = [year for year in requested_years if year not in evaluated]
    return {
        "requested_years": list(requested_years),
        "evaluated_years": list(evaluated_years),
        "missing_years": missing,
        "complete": not missing,
    }


def build_calibration_payload(result: CalibrationResult) -> Dict[str, object]:
    """Build the calibration.json contract from a calibration run."""
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "years": result.evaluated_years,
        "requested_years": result.years,
        "season_coverage": season_coverage(result.years, result.evaluated_years),
        "target": "all",
        "outlier_years": result.outlier_years,
        "holdout_years": result.holdout_years,
        "baseline_config": {
            "weights": {
                key: float(getattr(result.baseline_weights, key)) for key in COMPONENT_KEYS
            },
            "colley_share": float(result.baseline_weights.colley_share),
            "source": "src/pipeline/weights.py RankingWeights defaults (production)",
        },
        "thresholds": {
            **result.thresholds.as_dict(),
            "note": "Initial go/no-go thresholds — starting points, not permanent scientific truth.",
        },
        "experiments": [_experiment_entry(experiment) for experiment in result.experiments],
        "recommended_next_experiments": _recommended_next(result),
        "caveats": list(CAVEATS),
    }


def _fmt(value: object, digits: int = 3) -> str:
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, float):
        return f"{value:.{digits}f}"
    return str(value)


def _fmt_delta(value: object, digits: int = 3) -> str:
    if value is None:
        return "—"
    return f"{float(value):+.{digits}f}"


def _markdown_report(payload: Dict[str, object]) -> str:
    lines: List[str] = []
    baseline = payload["baseline_config"]["weights"]  # type: ignore[index]
    weight_str = "/".join(
        f"{int(round(baseline[key] * 100))}" for key in COMPONENT_KEYS  # type: ignore[index]
    )
    lines.append("# Calibration Report (research mode)")
    lines.append("")
    lines.append(
        "This measures how transparent assumptions changed historical alignment "
        'and predictive signal. It does not identify a "correct" model, and the '
        f"production weights ({weight_str} resume/predictive/SOR/SOS) are unchanged."
    )
    lines.append("")
    lines.append(
        "**Recommended experiments are candidates for follow-up testing. They do "
        "not change the production model.**"
    )
    lines.append("")
    lines.append(f"- Generated: {payload['generated_at']}")
    lines.append(f"- Seasons evaluated: {', '.join(str(y) for y in payload['years'])}")
    coverage = payload["season_coverage"]  # type: ignore[index]
    lines.append(
        f"- Coverage: {len(coverage['evaluated_years'])} of "
        f"{len(coverage['requested_years'])} requested seasons evaluated"
        f"{'' if coverage['complete'] else ' — INCOMPLETE'}"
    )
    if not coverage["complete"]:
        missing_str = ", ".join(str(y) for y in coverage["missing_years"])
        lines.append("")
        lines.append(
            f"> **WARNING — incomplete season coverage.** Missing seasons: {missing_str}. "
            "These results cover only part of the requested range and must not be used "
            "for research conclusions; treat this run as plumbing verification only."
        )
    lines.append(
        f"- Outlier seasons (labeled, never hidden): "
        f"{', '.join(str(y) for y in payload['outlier_years'])}"
    )
    lines.append(
        f"- Holdout checks: {', '.join(str(y) for y in payload['holdout_years'])} "
        "(2022 = outlier stress test, 2024 = modern 12-team format)"
    )
    lines.append(
        "- Companion artifact: `committee-emulation.{json,md,csv}` (same "
        "directory) — the committee-alignment lens over these experiments"
    )
    lines.append("")

    lines.append("## Decisions")
    lines.append("")
    lines.append(
        "| Experiment | Group | Weights (R/P/SOR/SOS) | Δ Spearman | Δ Field overlap | "
        "Δ Brier | Decision |"
    )
    lines.append("|---|---|---|---|---|---|---|")
    for exp in payload["experiments"]:  # type: ignore[union-attr]
        weights = exp["weights"]
        weight_cell = "/".join(f"{weights[key]:.2f}" for key in COMPONENT_KEYS)
        delta = exp["baseline_delta"]
        lines.append(
            f"| {exp['label']} | {exp['group']} | {weight_cell} "
            f"| {_fmt_delta(delta.get('spearman_top12'))} "
            f"| {_fmt_delta(delta.get('field_overlap'))} "
            f"| {_fmt_delta(delta.get('brier'), 4)} "
            f"| **{exp['decision']}** |"
        )
    lines.append("")
    lines.append(
        "Deltas are vs the baseline on the outlier-excluded view; see per-experiment "
        "sections for all-seasons numbers and per-year detail."
    )
    lines.append("")

    for exp in payload["experiments"]:  # type: ignore[union-attr]
        lines.append(f"## {exp['label']} (`{exp['experiment_id']}`)")
        lines.append("")
        lines.append(f"{exp['description']}")
        lines.append("")
        lines.append(f"- Changed assumption: {exp['changed_assumption']}")
        if exp.get("substitution"):
            sub = exp["substitution"]
            lines.append(
                f"- Component substitution (research-only): {sub['component']} — "
                f"{sub['baseline_source']} → {sub['candidate_source']}; "
                "weights identical to baseline"
            )
        if exp.get("variant"):
            var = exp["variant"]
            lines.append(
                f"- Component variant (research-only): {var['component']} — "
                f"{var['baseline_method']} → {var['candidate_method']} "
                f"(variant `{var['variant_id']}`); weights identical to baseline"
            )
        lines.append(f"- Decision: **{exp['decision']}** — {exp['reason']}")
        if exp["flags"]:
            lines.append(f"- Flags: {', '.join(exp['flags'])}")
        for year, block in exp["holdout"].items():
            lines.append(f"- Holdout {year}: {block['note']}")
        if exp.get("substitution") or exp.get("variant"):
            for row in exp["per_year_metrics"]:
                if row.get("brier") is None:
                    lines.append(f"- Unavailable {row['year']}: {row['notes']}")
        lines.append("")
        lines.append("| View | Spearman | Top-12 ovl | Field ovl | Field size | Brier | Win acc |")
        lines.append("|---|---|---|---|---|---|---|")
        for view_key, view_label in (
            ("excluding_outliers", "Excl. outliers"),
            ("all_seasons", "All seasons"),
        ):
            metrics = exp["metrics"][view_key]
            lines.append(
                f"| {view_label} | {_fmt(metrics.get('spearman_top12'))} "
                f"| {_fmt(metrics.get('top12_overlap'))} "
                f"| {_fmt(metrics.get('field_overlap'))} "
                f"| {_fmt(metrics.get('correct_field_size_rate'), 2)} "
                f"| {_fmt(metrics.get('brier'), 4)} "
                f"| {_fmt(metrics.get('win_accuracy'))} |"
            )
        lines.append("")
        lines.append("| Year | Outlier | Spearman | Top-12 ovl | Field ovl | Brier | Win acc |")
        lines.append("|---|---|---|---|---|---|---|")
        for row in exp["per_year_metrics"]:
            lines.append(
                f"| {row['year']} | {'yes' if row['is_outlier'] else 'no'} "
                f"| {_fmt(row.get('spearman_top12'))} "
                f"| {_fmt(row.get('top12_overlap'))} "
                f"| {_fmt(row.get('field_overlap'))} "
                f"| {_fmt(row.get('brier'), 4)} "
                f"| {_fmt(row.get('win_accuracy'))} |"
            )
        lines.append("")

    lines.append("## Recommended next experiments")
    lines.append("")
    for item in payload["recommended_next_experiments"]:  # type: ignore[union-attr]
        lines.append(f"- {item}")
    lines.append("")
    lines.append("## Caveats")
    lines.append("")
    for item in payload["caveats"]:  # type: ignore[union-attr]
        lines.append(f"- {item}")
    lines.append("")
    return "\n".join(lines)


def _csv_rows(payload: Dict[str, object]) -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []
    for exp in payload["experiments"]:  # type: ignore[union-attr]
        metrics = exp["metrics"]["excluding_outliers"]
        row: Dict[str, object] = {
            "experiment_id": exp["experiment_id"],
            "label": exp["label"],
            "group": exp["group"],
            "experiment_type": exp.get("experiment_type", "reweighting"),
            "research_only": exp.get("research_only", True),
        }
        for key in COMPONENT_KEYS:
            row[f"weight_{key}"] = exp["weights"][key]
        row["seasons"] = metrics.get("seasons")
        for key in DELTA_KEYS:
            row[key] = metrics.get(key)
        for key in DELTA_KEYS:
            row[f"delta_{key}"] = exp["baseline_delta"].get(key)
        row["decision"] = exp["decision"]
        row["flags"] = ";".join(exp["flags"])
        rows.append(row)
    return rows


def write_calibration_outputs(
    result: CalibrationResult,
    output_dir: Path,
    *,
    payload: Optional[Dict[str, object]] = None,
) -> Dict[str, Path]:
    """Write calibration.json/.md/.csv; returns the written paths.

    ``payload`` lets callers that already built the contract (e.g. to feed the
    committee-emulation summary) reuse it instead of rebuilding.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    payload = payload or build_calibration_payload(result)
    paths: Dict[str, Path] = {}

    json_path = output_dir / "calibration.json"
    json_path.write_text(json.dumps(payload, indent=2) + "\n")
    paths["json"] = json_path

    try:
        md_path = output_dir / "calibration.md"
        md_path.write_text(_markdown_report(payload))
        paths["md"] = md_path
    except Exception as exc:  # noqa: BLE001 - report export must not kill the run
        logger.warning("Failed to write calibration.md: %s", exc)

    try:
        rows = _csv_rows(payload)
        csv_path = output_dir / "calibration.csv"
        with csv_path.open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        paths["csv"] = csv_path
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to write calibration.csv: %s", exc)

    return paths
