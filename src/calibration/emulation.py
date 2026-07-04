"""Committee Emulation lite (v2.2 research mode).

Characterizes which transparent assumptions increase or decrease alignment
with historical committee behavior, using calibration harness results as the
only input. This is interpretive and comparative — it builds no new model,
touches no new data sources, and never changes production defaults.

Framing guardrail: the goal is never "copy the committee." A committee-aligned
candidate is a weight profile worth follow-up research because it tracked
historical committee ordering without failing the protected trust metrics.

Determinism: the summary is a pure function of the calibration payload
(calibration.json content). Same payload in, byte-identical summary out — it
carries the calibration run's timestamp instead of minting its own.
"""

from __future__ import annotations

import csv
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

from src.calibration.decisions import FLAG_HURTS_HOLDOUT_2024
from src.pipeline.weights import COMPONENT_KEYS

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1

# Candidate statuses (fixed vocabulary).
STATUS_CANDIDATE = "committee_aligned_candidate"
STATUS_BLOCKED = "blocked"
STATUS_NOT_ALIGNED = "not_committee_aligned"

FRAMING = (
    "Committee Emulation lite measures which transparent assumptions increase "
    "or decrease alignment with historical committee behavior. It is not "
    "committee replication and does not identify a 'correct' model. "
    "Committee-aligned candidates are follow-up research candidates only — "
    "they do not change the production model."
)

CAVEATS = [
    (
        "Derived entirely from calibration harness results — no new data sources, "
        "no new model, no production default changes."
    ),
    (
        "A committee-aligned candidate is a follow-up candidate, not an approved "
        "configuration; promoting one to production remains a deliberate product "
        "decision made outside research mode."
    ),
    (
        "Alignment and predictive signal are different tracks and are never "
        "averaged together; every candidate reports its predictive tradeoff "
        "explicitly."
    ),
    (
        "Candidates that fail protected metrics (field overlap, Brier, or the "
        "2024 modern-format holdout) are blocked regardless of how much they "
        "improve alignment."
    ),
    (
        "Committee alignment has a practical ceiling (top-12 Spearman ~0.75-0.85); "
        "chasing alignment beyond it means overfitting the committee, which this "
        "track deliberately avoids."
    ),
]


def _num(value: object) -> Optional[float]:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _tradeoff_label(delta: Optional[float], threshold: float, *, lower_is_better: bool) -> str:
    if delta is None:
        return "unknown"
    gain = -delta if lower_is_better else delta
    if gain >= threshold:
        return "improves"
    if gain <= -threshold:
        return "degrades"
    return "neutral"


def _assess_experiment(exp: Dict[str, object], thresholds: Dict[str, object]) -> Dict[str, object]:
    """Classify one calibration experiment for the committee-emulation track."""
    delta = exp["baseline_delta"]  # type: ignore[index]
    holdout = exp.get("holdout", {})  # type: ignore[assignment]
    flags = list(exp.get("flags", []))  # type: ignore[arg-type]

    t_spearman = float(thresholds["spearman_top12"])  # type: ignore[index]
    t_top12 = float(thresholds["top12_overlap"])  # type: ignore[index]
    t_field = float(thresholds["field_overlap"])  # type: ignore[index]
    t_brier = float(thresholds["brier"])  # type: ignore[index]

    d_spearman = _num(delta.get("spearman_top12"))  # type: ignore[union-attr]
    d_top12 = _num(delta.get("top12_overlap"))  # type: ignore[union-attr]
    d_field = _num(delta.get("field_overlap"))  # type: ignore[union-attr]
    d_brier = _num(delta.get("brier"))  # type: ignore[union-attr]

    improves_alignment = (d_spearman is not None and d_spearman >= t_spearman) or (
        d_top12 is not None and d_top12 >= t_top12
    )

    # Protected failures: same trust metrics the calibration gate protects.
    protected_failures: List[str] = []
    if d_field is not None and d_field <= -t_field:
        protected_failures.append("field_overlap")
    if d_brier is not None and d_brier >= t_brier:
        protected_failures.append("brier")
    holdout_2024 = holdout.get("2024", {}) if isinstance(holdout, dict) else {}
    h24_field = _num(holdout_2024.get("field_overlap_delta"))
    if FLAG_HURTS_HOLDOUT_2024 in flags or (h24_field is not None and h24_field <= -t_field):
        protected_failures.append("2024_holdout_field_overlap")

    if not improves_alignment:
        status = STATUS_NOT_ALIGNED
        status_reason = (
            "Does not meaningfully improve committee alignment vs baseline "
            f"(Δspearman {_fmt_delta(d_spearman)}, "
            f"Δtop-12 overlap {_fmt_delta(d_top12)})."
        )
    elif protected_failures:
        status = STATUS_BLOCKED
        status_reason = (
            "Improves committee alignment but fails protected metric(s): "
            f"{', '.join(sorted(set(protected_failures)))}. Not safe as a "
            "follow-up candidate."
        )
    else:
        status = STATUS_CANDIDATE
        status_reason = (
            "Improves committee alignment without failing protected metrics or "
            "holdouts — a committee-aligned follow-up candidate, not a production "
            "change."
        )

    return {
        "experiment_id": exp["experiment_id"],
        "label": exp["label"],
        "group": exp["group"],
        "weights": exp["weights"],
        "changed_assumption": exp["changed_assumption"],
        "alignment_delta": {
            "spearman_top12": d_spearman,
            "top12_overlap": d_top12,
        },
        "field_tradeoff": {
            "field_overlap": d_field,
            "correct_field_size_rate": _num(delta.get("correct_field_size_rate")),  # type: ignore[union-attr]
            "label": _tradeoff_label(d_field, t_field, lower_is_better=False),
        },
        "predictive_tradeoff": {
            "brier": d_brier,
            "win_accuracy": _num(delta.get("win_accuracy")),  # type: ignore[union-attr]
            "label": _tradeoff_label(d_brier, t_brier, lower_is_better=True),
        },
        "holdout": holdout,
        "protected_failures": sorted(set(protected_failures)),
        "calibration_decision": exp["decision"],
        "calibration_reason": exp["reason"],
        "status": status,
        "status_reason": status_reason,
    }


def build_committee_emulation_summary(payload: Dict[str, object]) -> Dict[str, object]:
    """Pure, deterministic transform: calibration payload -> emulation summary."""
    thresholds = payload["thresholds"]  # type: ignore[index]
    experiments = [e for e in payload["experiments"] if e["experiment_id"] != "baseline"]  # type: ignore[union-attr]
    baseline = next(e for e in payload["experiments"] if e["experiment_id"] == "baseline")  # type: ignore[union-attr]

    assessments = [_assess_experiment(exp, thresholds) for exp in experiments]  # type: ignore[arg-type]

    def _sort_key(entry: Dict[str, object]):
        status_order = {STATUS_CANDIDATE: 0, STATUS_BLOCKED: 1, STATUS_NOT_ALIGNED: 2}
        spearman = entry["alignment_delta"]["spearman_top12"]  # type: ignore[index]
        return (
            status_order[str(entry["status"])],
            -(spearman if isinstance(spearman, float) else float("-inf")),
            str(entry["experiment_id"]),
        )

    assessments.sort(key=_sort_key)
    candidate_ids = [
        str(a["experiment_id"]) for a in assessments if a["status"] == STATUS_CANDIDATE
    ]
    blocked_ids = [str(a["experiment_id"]) for a in assessments if a["status"] == STATUS_BLOCKED]

    baseline_metrics = baseline["metrics"]  # type: ignore[index]
    return {
        "schema_version": SCHEMA_VERSION,
        "source": "calibration.json",
        "source_generated_at": payload["generated_at"],
        "years": payload["years"],
        "outlier_years": payload["outlier_years"],
        "holdout_years": payload["holdout_years"],
        "framing": FRAMING,
        "baseline": {
            "weights": payload["baseline_config"]["weights"],  # type: ignore[index]
            "alignment": {
                view: {
                    key: baseline_metrics[view].get(key)  # type: ignore[index]
                    for key in ("spearman_top12", "top12_overlap", "bubble_overlap")
                }
                for view in ("excluding_outliers", "all_seasons")
            },
        },
        "thresholds": thresholds,
        "candidates": assessments,
        "committee_aligned_candidates": candidate_ids,
        "blocked_candidates": blocked_ids,
        "summary": {
            "n_experiments": len(assessments),
            "n_committee_aligned_candidates": len(candidate_ids),
            "n_blocked": len(blocked_ids),
            "top_candidate": candidate_ids[0] if candidate_ids else None,
        },
        "caveats": list(CAVEATS),
    }


def _fmt_delta(value: object, digits: int = 3) -> str:
    if not isinstance(value, float):
        return "—"
    return f"{value:+.{digits}f}"


def _fmt_value(value: object, digits: int = 3) -> str:
    if not isinstance(value, float):
        return "—"
    return f"{value:.{digits}f}"


def _markdown_report(summary: Dict[str, object]) -> str:
    lines: List[str] = []
    lines.append("# Committee Emulation Lite (research mode)")
    lines.append("")
    lines.append(str(summary["framing"]))
    lines.append("")
    lines.append(
        "**Committee-aligned candidates are follow-up research candidates. They "
        "do not change the production model.**"
    )
    lines.append("")
    lines.append(
        f"- Derived from `calibration.json` (same directory), generated "
        f"{summary['source_generated_at']}"
    )
    lines.append(f"- Seasons: {', '.join(str(y) for y in summary['years'])}")
    lines.append(
        f"- Holdouts: {', '.join(str(y) for y in summary['holdout_years'])} "
        "(2022 = outlier stress test, 2024 = modern 12-team format)"
    )
    baseline = summary["baseline"]  # type: ignore[index]
    excl = baseline["alignment"]["excluding_outliers"]  # type: ignore[index]
    lines.append(
        f"- Baseline alignment (excl. outliers): spearman "
        f"{_fmt_value(excl.get('spearman_top12'))}, "
        f"top-12 overlap {_fmt_value(excl.get('top12_overlap'))}"
    )
    lines.append("")

    lines.append("## Candidate board")
    lines.append("")
    lines.append(
        "| Experiment | Weights (R/P/SOR/SOS) | Δ Spearman | Δ Top-12 ovl | "
        "Field tradeoff | Predictive tradeoff | 2024 holdout | Status |"
    )
    lines.append("|---|---|---|---|---|---|---|---|")
    for entry in summary["candidates"]:  # type: ignore[union-attr]
        weights = entry["weights"]
        weight_cell = "/".join(f"{weights[key]:.2f}" for key in COMPONENT_KEYS)
        h24 = entry["holdout"].get("2024", {})
        h24_cell = _fmt_delta(h24.get("field_overlap_delta")) if h24 else "—"
        lines.append(
            f"| {entry['label']} | {weight_cell} "
            f"| {_fmt_delta(entry['alignment_delta']['spearman_top12'])} "
            f"| {_fmt_delta(entry['alignment_delta']['top12_overlap'])} "
            f"| {entry['field_tradeoff']['label']} "
            f"({_fmt_delta(entry['field_tradeoff']['field_overlap'])}) "
            f"| {entry['predictive_tradeoff']['label']} "
            f"(Brier {_fmt_delta(entry['predictive_tradeoff']['brier'], 4)}) "
            f"| {h24_cell} "
            f"| **{entry['status']}** |"
        )
    lines.append("")

    for entry in summary["candidates"]:  # type: ignore[union-attr]
        lines.append(f"## {entry['label']} (`{entry['experiment_id']}`)")
        lines.append("")
        lines.append(f"- Changed assumption: {entry['changed_assumption']}")
        lines.append(f"- Status: **{entry['status']}** — {entry['status_reason']}")
        lines.append(
            f"- Calibration decision: {entry['calibration_decision']} — "
            f"{entry['calibration_reason']}"
        )
        for year, block in entry["holdout"].items():
            lines.append(f"- Holdout {year}: {block.get('note')}")
        if entry["protected_failures"]:
            lines.append(f"- Protected failures: {', '.join(entry['protected_failures'])}")
        lines.append("")

    lines.append("## Caveats")
    lines.append("")
    for item in summary["caveats"]:  # type: ignore[union-attr]
        lines.append(f"- {item}")
    lines.append("")
    return "\n".join(lines)


def _csv_rows(summary: Dict[str, object]) -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []
    for entry in summary["candidates"]:  # type: ignore[union-attr]
        row: Dict[str, object] = {
            "experiment_id": entry["experiment_id"],
            "label": entry["label"],
            "group": entry["group"],
        }
        for key in COMPONENT_KEYS:
            row[f"weight_{key}"] = entry["weights"][key]  # type: ignore[index]
        row["delta_spearman_top12"] = entry["alignment_delta"]["spearman_top12"]  # type: ignore[index]
        row["delta_top12_overlap"] = entry["alignment_delta"]["top12_overlap"]  # type: ignore[index]
        row["delta_field_overlap"] = entry["field_tradeoff"]["field_overlap"]  # type: ignore[index]
        row["delta_brier"] = entry["predictive_tradeoff"]["brier"]  # type: ignore[index]
        row["field_tradeoff"] = entry["field_tradeoff"]["label"]  # type: ignore[index]
        row["predictive_tradeoff"] = entry["predictive_tradeoff"]["label"]  # type: ignore[index]
        row["protected_failures"] = ";".join(entry["protected_failures"])  # type: ignore[arg-type]
        row["calibration_decision"] = entry["calibration_decision"]
        row["status"] = entry["status"]
        rows.append(row)
    return rows


def write_committee_emulation_outputs(
    summary: Dict[str, object], output_dir: Path
) -> Dict[str, Path]:
    """Write committee-emulation.json/.md/.csv; returns the written paths."""
    output_dir.mkdir(parents=True, exist_ok=True)
    paths: Dict[str, Path] = {}

    json_path = output_dir / "committee-emulation.json"
    json_path.write_text(json.dumps(summary, indent=2) + "\n")
    paths["json"] = json_path

    try:
        md_path = output_dir / "committee-emulation.md"
        md_path.write_text(_markdown_report(summary))
        paths["md"] = md_path
    except Exception as exc:  # noqa: BLE001 - report export must not kill the run
        logger.warning("Failed to write committee-emulation.md: %s", exc)

    try:
        rows = _csv_rows(summary)
        csv_path = output_dir / "committee-emulation.csv"
        with csv_path.open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        paths["csv"] = csv_path
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to write committee-emulation.csv: %s", exc)

    return paths
