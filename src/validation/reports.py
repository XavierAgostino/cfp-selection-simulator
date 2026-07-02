"""Validation report writers (CSV, Markdown, manifest)."""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

from src.validation.committee_validation import CommitteeValidationResult, committee_result_to_row
from src.validation.era import get_era_spec
from src.validation.historical import OUTLIER_YEARS
from src.validation.predictive_validation import PredictiveMetrics
from src.validation.selection_validation import SelectionValidationResult, selection_result_to_row


def _fmt_float(value: Optional[float], digits: int = 3) -> str:
    if value is None:
        return "—"
    return f"{value:.{digits}f}"


def write_validation_outputs(
    out_dir: Path,
    *,
    committee: List[CommitteeValidationResult],
    selection: List[SelectionValidationResult],
    predictive: List[PredictiveMetrics],
    years: List[int],
    target: str,
) -> Dict[str, Path]:
    """Write all validation artifacts and return path map."""
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: Dict[str, Path] = {}

    if committee:
        df = pd.DataFrame([committee_result_to_row(r) for r in committee])
        paths["committee"] = out_dir / "committee_replication.csv"
        df.to_csv(paths["committee"], index=False)

    if selection:
        for result in selection:
            if not result.notes:
                result.notes = get_era_spec(result.year).rule_target
        df = pd.DataFrame([selection_result_to_row(r) for r in selection])
        paths["selection"] = out_dir / "era_selection_validation.csv"
        df.to_csv(paths["selection"], index=False)

    if predictive:
        df = pd.DataFrame([asdict(m) for m in predictive])
        paths["predictive"] = out_dir / "predictive_validation.csv"
        df.to_csv(paths["predictive"], index=False)

    summary_path = out_dir / "validation_summary.md"
    summary_path.write_text(build_summary_markdown(committee, selection, predictive, years, target))
    paths["summary"] = summary_path

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "years": years,
        "target": target,
        "outlier_years": sorted(OUTLIER_YEARS),
        "outputs": {key: str(path) for key, path in paths.items()},
    }
    manifest_path = out_dir / "validation_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    paths["manifest"] = manifest_path

    if committee:
        legacy = pd.DataFrame([committee_result_to_row(r) for r in committee])
        legacy = legacy.rename(
            columns={
                "top12_overlap_ratio": "selection_accuracy",
                "spearman_top12": "spearman_correlation",
            }
        )
        legacy["model"] = "composite"
        legacy_path = out_dir / "backtest_results.csv"
        legacy.to_csv(legacy_path, index=False)
        paths["legacy"] = legacy_path

    return paths


def build_summary_markdown(
    committee: List[CommitteeValidationResult],
    selection: List[SelectionValidationResult],
    predictive: List[PredictiveMetrics],
    years: List[int],
    target: str,
) -> str:
    lines = [
        "# CFP Simulator Validation Summary",
        "",
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"Seasons: {min(years)}–{max(years)} ({len(years)} years)",
        f"Target: `{target}`",
        "",
        "Validation is split into three tracks: **committee replication**, "
        "**era-correct selection**, and **predictive** forecasting. "
        "Pre-2024 field validation uses the actual **4-team** bracket, not top-12 overlap.",
        "",
    ]

    if selection:
        lines.extend(["## Era-correct selection validation", ""])
        lines.append(
            "| Year | Era | Rule Target | Spearman (top-12) | Field Overlap | "
            "Correct Size | Auto | At-Large | Notes |"
        )
        lines.append(
            "|------|-----|-------------|-------------------|---------------|"
            "--------------|------|----------|-------|"
        )
        committee_by_year = {r.year: r for r in committee}
        for row in selection:
            comm = committee_by_year.get(row.year)
            spearman = _fmt_float(comm.spearman_top12 if comm else None)
            outlier = " ⚠ outlier" if row.year in OUTLIER_YEARS else ""
            note = (row.notes or "") + outlier
            lines.append(
                f"| {row.year} | {row.era} | {row.rule_target} | {spearman} | "
                f"{row.field_overlap_label} | {'Yes' if row.correct_field_size else 'No'} | "
                f"{row.auto_bids_label or '—'} | {row.at_large_label or '—'} | {note.strip()} |"
            )
        lines.append("")

        non_outlier = [r for r in selection if r.year not in OUTLIER_YEARS]
        if non_outlier:
            avg_overlap = sum(r.field_overlap_ratio for r in non_outlier) / len(non_outlier)
            lines.append(
                f"**Average field overlap (excl. outliers):** "
                f"{avg_overlap:.1%} across {len(non_outlier)} seasons."
            )
            lines.append("")

    if committee:
        lines.extend(["## Committee replication", ""])
        lines.append(
            "| Year | Spearman (top-25) | Spearman (top-12) | Avg rank error | "
            "Top-12 overlap | Bubble (10–12) | Outlier |"
        )
        lines.append(
            "|------|-------------------|-------------------|----------------|"
            "----------------|----------------|---------|"
        )
        for row in committee:
            lines.append(
                f"| {row.year} | {_fmt_float(row.spearman_top25)} | "
                f"{_fmt_float(row.spearman_top12)} | {_fmt_float(row.avg_rank_error_top25, 2)} | "
                f"{row.top12_overlap_label} | {row.bubble_overlap_label} | "
                f"{'Yes' if row.is_outlier else 'No'} |"
            )
        non_outlier = [r for r in committee if not r.is_outlier]
        if non_outlier:
            avg_s = sum(r.spearman_top12 or 0 for r in non_outlier) / len(non_outlier)
            lines.append("")
            lines.append(f"**Average top-12 Spearman (excl. outliers):** {_fmt_float(avg_s)}")
        lines.append("")

    if predictive:
        lines.extend(["## Predictive validation (composite)", ""])
        composite = [p for p in predictive if p.model == "composite"]
        if composite:
            lines.append("| Year | Brier | Win accuracy | Margin MAE |")
            lines.append("|------|-------|--------------|------------|")
            for row in composite:
                lines.append(
                    f"| {row.year} | {_fmt_float(row.brier_score, 4)} | "
                    f"{row.win_accuracy:.1%} | {_fmt_float(row.margin_mae, 2)} |"
                )
            avg_brier = sum(p.brier_score for p in composite) / len(composite)
            lines.append("")
            lines.append(f"**Average Brier (composite):** {_fmt_float(avg_brier, 4)}")
        lines.append("")

    lines.extend(
        [
            "## Interpretation",
            "",
            "- **Field overlap** is the primary selection KPI (4-team or 12-team by era).",
            "- **Top-12 overlap** measures committee rank imitation, not era-correct selection pre-2024.",
            "- **Seeding** metrics are diagnostic only; do not use as headline accuracy.",
            "- **2022** is flagged as an outlier year in aggregate summaries.",
        ]
    )
    return "\n".join(lines) + "\n"


def print_validation_summary(
    committee: List[CommitteeValidationResult],
    selection: List[SelectionValidationResult],
    predictive: List[PredictiveMetrics],
) -> None:
    """Console summary aligned with the three validation tracks."""
    print(f"\n{'=' * 80}")
    print("ERA-AWARE VALIDATION SUMMARY")
    print(f"{'=' * 80}")

    if committee:
        non_outlier = [r for r in committee if not r.is_outlier]
        avg_s = (
            sum(r.spearman_top12 or 0 for r in non_outlier) / len(non_outlier)
            if non_outlier
            else 0.0
        )
        print("\nCommittee replication (composite):")
        print(f"  Avg top-12 Spearman (excl. outliers): {avg_s:.4f}")
        if any(r.is_outlier for r in committee):
            print(f"  Outlier years excluded from aggregate: {sorted(OUTLIER_YEARS)}")

    if selection:
        non_outlier = [r for r in selection if r.year not in OUTLIER_YEARS]
        avg_field = (
            sum(r.field_overlap_ratio for r in non_outlier) / len(non_outlier)
            if non_outlier
            else 0.0
        )
        print("\nEra-correct selection:")
        print(f"  Avg field overlap (excl. outliers): {avg_field:.1%}")
        for row in selection:
            flag = " [outlier]" if row.year in OUTLIER_YEARS else ""
            print(f"  {row.year} ({row.rule_target}): {row.field_overlap_label}{flag}")

    if predictive:
        composite = [p for p in predictive if p.model == "composite"]
        if composite:
            avg_brier = sum(p.brier_score for p in composite) / len(composite)
            print("\nPredictive (composite):")
            print(f"  Avg Brier score: {avg_brier:.4f}")
