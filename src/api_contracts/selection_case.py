"""Selection case ("why in" / "concerns") bullet builder.

Pure engine-side logic with zero Streamlit dependencies — used by both the
Streamlit dashboard (app/components/ui.py re-exports this) and the JSON API
export layer (src/api_contracts/build.py) for team-resumes.json.
"""

from __future__ import annotations

from typing import List, Optional, Tuple

import pandas as pd

from src.selection.field import PlayoffSelection


def build_selection_case(
    team_name: str,
    row: pd.Series,
    selection: Optional[PlayoffSelection],
    seeded: Optional[pd.DataFrame],
) -> Tuple[List[str], List[str]]:
    """Template-based selection case bullets from existing data."""
    why: List[str] = []
    concerns: List[str] = []

    if selection is None:
        return why, concerns

    if any(t["team"] == team_name for t in selection.auto_bids):
        why.append("Conference champion with an automatic bid")
    if any(t["team"] == team_name for t in selection.at_large_bids):
        why.append("Selected as an at-large bid based on composite ranking")

    if int(row["rank"]) == 1:
        why.append("Highest composite score in the field")

    if seeded is not None:
        seed_rows = seeded[seeded["team"] == team_name]
        if not seed_rows.empty:
            seed_val = int(seed_rows.iloc[0]["seed"])
            why.append(f"Playoff seed #{seed_val}")
            if bool(seed_rows.iloc[0].get("is_bye")):
                why.append("Top-four overall seed, receives first-round bye")

    if selection.displaced_team and selection.displaced_team.get("team") == team_name:
        concerns.append("Displaced from the field by a guaranteed conference champion")

    resume = float(row.get("resume_score", 0))
    predictive = float(row.get("predictive_score", 0))
    if predictive + 0.08 < resume:
        concerns.append("Predictive score trails resume score")
    elif resume + 0.08 < predictive:
        concerns.append("Resume score trails predictive strength")

    if not why and int(row["rank"]) <= 25:
        why.append("Ranked in the composite top 25")

    return why, concerns
