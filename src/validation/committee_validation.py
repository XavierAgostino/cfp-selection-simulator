"""Committee replication validation metrics."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import pandas as pd

from src.validation.historical import (
    OUTLIER_YEARS,
    historical_top12,
    historical_top25,
    validation_note,
)
from src.validation.metrics import average_rank_error, spearman_on_list, subset_overlap


@dataclass
class CommitteeValidationResult:
    year: int
    spearman_top25: Optional[float]
    spearman_top12: Optional[float]
    spearman_top25_p: Optional[float]
    avg_rank_error_top25: Optional[float]
    top12_overlap_label: str
    top12_overlap_ratio: float
    bubble_overlap_label: str
    bubble_overlap_ratio: float
    top25_depth: int
    is_outlier: bool
    notes: str


def validate_committee_replication(
    year: int,
    rankings_df: pd.DataFrame,
) -> Optional[CommitteeValidationResult]:
    """Compare simulator rankings to published CFP committee orderings."""
    top25 = historical_top25(year)
    top12 = historical_top12(year)
    if not top25 or not top12:
        return None

    spearman25, p25 = spearman_on_list(rankings_df, top25)
    spearman12, _ = spearman_on_list(rankings_df, top12)
    rank_error = average_rank_error(rankings_df, top25)

    top12_overlap = subset_overlap(rankings_df, top25, start_rank=1, end_rank=12)
    bubble_overlap = subset_overlap(rankings_df, top25, start_rank=10, end_rank=12)

    return CommitteeValidationResult(
        year=year,
        spearman_top25=spearman25,
        spearman_top12=spearman12,
        spearman_top25_p=p25,
        avg_rank_error_top25=rank_error,
        top12_overlap_label=str(top12_overlap["overlap_label"]),
        top12_overlap_ratio=float(top12_overlap["overlap_ratio"]),
        bubble_overlap_label=str(bubble_overlap["overlap_label"]),
        bubble_overlap_ratio=float(bubble_overlap["overlap_ratio"]),
        top25_depth=len(top25),
        is_outlier=year in OUTLIER_YEARS,
        notes=validation_note(year),
    )


def committee_result_to_row(result: CommitteeValidationResult) -> Dict[str, object]:
    return {
        "year": result.year,
        "spearman_top25": result.spearman_top25,
        "spearman_top12": result.spearman_top12,
        "avg_rank_error_top25": result.avg_rank_error_top25,
        "top12_overlap": result.top12_overlap_label,
        "top12_overlap_ratio": result.top12_overlap_ratio,
        "bubble_overlap": result.bubble_overlap_label,
        "bubble_overlap_ratio": result.bubble_overlap_ratio,
        "top25_depth": result.top25_depth,
        "is_outlier": result.is_outlier,
        "notes": result.notes,
    }
