"""Research quality gate: decision labels for calibration experiments.

Every experiment is judged against the production baseline using initial
go/no-go thresholds. These thresholds stop vibes-driven research; they are
starting points, not permanent scientific truth. A single improved headline
metric never counts as success if a protected trust metric degrades.

Protected metrics (a material drop blocks "recommended"): mean field overlap,
mean Brier, and 2024 (modern 12-team format) field overlap.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# Flag vocabulary (fixed; the web/report layer can rely on these strings).
FLAG_IMPROVES_ALIGNMENT = "improves_alignment"
FLAG_IMPROVES_PREDICTIVE = "improves_predictive_signal"
FLAG_HURTS_ALIGNMENT = "hurts_alignment"
FLAG_HURTS_PREDICTIVE = "hurts_predictive_signal"
FLAG_OVERFITS_OUTLIERS = "overfits_outliers"
FLAG_HURTS_HOLDOUT_2022 = "hurts_2022_holdout"
FLAG_HURTS_HOLDOUT_2024 = "hurts_2024_holdout"

DECISIONS = ("recommended", "promising", "neutral", "rejected", "needs_more_data")


@dataclass(frozen=True)
class Thresholds:
    """Initial go/no-go thresholds (see docs/research/calibration.md)."""

    spearman_top12: float = 0.02  # meaningful alignment gain
    top12_overlap: float = 0.03  # +3 percentage points
    field_overlap: float = 0.03  # +3 percentage points (protected on the downside)
    brier: float = 0.005  # lower is better (protected on the downside)
    holdout_alignment_collapse: float = 0.05  # 2022 spearman drop that flags a collapse

    def as_dict(self) -> Dict[str, float]:
        return {
            "spearman_top12": self.spearman_top12,
            "top12_overlap": self.top12_overlap,
            "field_overlap": self.field_overlap,
            "brier": self.brier,
            "holdout_alignment_collapse": self.holdout_alignment_collapse,
        }


def _fmt_delta(value: Optional[float], digits: int = 3) -> str:
    if value is None:
        return "n/a"
    return f"{value:+.{digits}f}"


def decide(
    deltas: Dict[str, Optional[float]],
    deltas_all_seasons: Dict[str, Optional[float]],
    holdout: Dict[str, Dict[str, object]],
    *,
    thresholds: Optional[Thresholds] = None,
    is_baseline: bool = False,
) -> Tuple[str, str, List[str]]:
    """
    Apply the research quality gate to one experiment.

    ``deltas`` / ``deltas_all_seasons`` are outlier-excluded and all-seasons
    deltas vs baseline (keys: spearman_top12, top12_overlap, field_overlap,
    correct_field_size_rate, brier, win_accuracy). ``holdout`` maps year
    strings ("2022", "2024") to blocks containing ``alignment_delta`` and
    ``field_overlap_delta``. Returns (decision, reason, flags).
    """
    t = thresholds or Thresholds()

    if is_baseline:
        return (
            "neutral",
            "Baseline reference configuration — all deltas are zero by construction.",
            [],
        )

    def d(key: str, source: Dict[str, Optional[float]] = deltas) -> Optional[float]:
        value = source.get(key)
        return float(value) if value is not None else None

    # --- improvements / harms on the outlier-excluded view --------------------
    improvements: List[str] = []
    harms: List[str] = []

    checks = [
        ("spearman_top12", d("spearman_top12"), t.spearman_top12, False),
        ("top12_overlap", d("top12_overlap"), t.top12_overlap, False),
        ("field_overlap", d("field_overlap"), t.field_overlap, False),
        ("brier", d("brier"), t.brier, True),  # lower is better
    ]
    for name, delta, threshold, lower_is_better in checks:
        if delta is None:
            continue
        gain = -delta if lower_is_better else delta
        if gain >= threshold:
            improvements.append(name)
        elif gain <= -threshold:
            harms.append(name)

    protected_harms = [name for name in harms if name in ("field_overlap", "brier")]

    # --- holdout behavior ------------------------------------------------------
    flags: List[str] = []
    holdout_2022 = holdout.get("2022", {})
    holdout_2024 = holdout.get("2024", {})
    collapse_2022 = False
    if isinstance(holdout_2022.get("alignment_delta"), (int, float)):
        if float(holdout_2022["alignment_delta"]) <= -t.holdout_alignment_collapse:
            collapse_2022 = True
            flags.append(FLAG_HURTS_HOLDOUT_2022)
    if isinstance(holdout_2024.get("field_overlap_delta"), (int, float)):
        if float(holdout_2024["field_overlap_delta"]) <= -t.field_overlap:
            flags.append(FLAG_HURTS_HOLDOUT_2024)
            protected_harms.append("field_overlap_2024")

    # --- overfitting detection --------------------------------------------------
    # A gain that only exists when outlier seasons are included is being driven
    # by 2022, not by a genuinely better assumption.
    overfits = False
    for name, _, threshold, lower_is_better in checks:
        excl = d(name)
        incl = d(name, deltas_all_seasons)
        if excl is None or incl is None:
            continue
        gain_excl = -excl if lower_is_better else excl
        gain_incl = -incl if lower_is_better else incl
        if gain_incl >= threshold and gain_excl < threshold / 2:
            overfits = True
    if overfits:
        flags.append(FLAG_OVERFITS_OUTLIERS)

    # --- direction flags ---------------------------------------------------------
    if any(name in improvements for name in ("spearman_top12", "top12_overlap")):
        flags.append(FLAG_IMPROVES_ALIGNMENT)
    if any(name in harms for name in ("spearman_top12", "top12_overlap")):
        flags.append(FLAG_HURTS_ALIGNMENT)
    if "brier" in improvements:
        flags.append(FLAG_IMPROVES_PREDICTIVE)
    if "brier" in harms:
        flags.append(FLAG_HURTS_PREDICTIVE)

    summary = (
        f"spearman {_fmt_delta(d('spearman_top12'))}, "
        f"top-12 overlap {_fmt_delta(d('top12_overlap'))}, "
        f"field overlap {_fmt_delta(d('field_overlap'))}, "
        f"Brier {_fmt_delta(d('brier'), 4)} vs baseline (outliers excluded)"
    )

    # --- decision ladder ----------------------------------------------------------
    if not improvements and not harms:
        return ("neutral", f"No meaningful movement on any primary metric: {summary}.", flags)

    if not improvements:
        return (
            "rejected",
            f"Materially hurts {', '.join(harms)} with no compensating gain: {summary}.",
            flags,
        )

    if protected_harms:
        return (
            "neutral",
            (
                f"Gains on {', '.join(improvements)} are blocked by a material drop in "
                f"protected metric(s) {', '.join(sorted(set(protected_harms)))}: {summary}."
            ),
            flags,
        )

    if overfits:
        return (
            "needs_more_data",
            (
                f"Apparent gain on {', '.join(improvements)} only holds when outlier "
                f"seasons are included — likely driven by 2022, not a better assumption: "
                f"{summary}."
            ),
            flags,
        )

    if harms:  # non-protected tradeoff (alignment traded for signal or vice versa)
        return (
            "promising",
            (
                f"Improves {', '.join(improvements)} but trades away {', '.join(harms)}; "
                f"an intentional-divergence candidate, not a free win: {summary}."
            ),
            flags,
        )

    if collapse_2022:
        return (
            "promising",
            (
                f"Improves {', '.join(improvements)} without hurting protected metrics, "
                f"but degrades the 2022 outlier stress test "
                f"({_fmt_delta(d('spearman_top12'))} overall, "
                f"{holdout_2022.get('alignment_delta')} on 2022): {summary}."
            ),
            flags,
        )

    return (
        "recommended",
        f"Improves {', '.join(improvements)} with no material drop elsewhere: {summary}.",
        flags,
    )
