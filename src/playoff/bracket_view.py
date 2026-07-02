"""Pure bracket pod data model for CFP 12-team bracket UI rendering."""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

import pandas as pd

PodDict = Dict[str, Any]
TeamDict = Dict[str, Any]

POD_SPECS: Tuple[Tuple[str, Tuple[int, int], int, str, str], ...] = (
    ("top_1", (8, 9), 1, "QF1", "top"),
    ("top_2", (5, 12), 4, "QF2", "top"),
    ("bottom_1", (6, 11), 3, "QF3", "bottom"),
    ("bottom_2", (7, 10), 2, "QF4", "bottom"),
)


def _teams_by_seed(seeded_field: pd.DataFrame) -> Dict[int, TeamDict]:
    if seeded_field.empty:
        return {}
    required = {"seed", "team"}
    missing = required - set(seeded_field.columns)
    if missing:
        raise ValueError(f"seeded_field missing columns: {sorted(missing)}")
    return {int(row["seed"]): row.to_dict() for _, row in seeded_field.iterrows()}


def build_bracket_pods(seeded_field: pd.DataFrame) -> List[PodDict]:
    """
    Build CFP-specific 12-team bracket pods from a seeded playoff field.

    Pod layout:
    - 8/9 winner plays 1
    - 5/12 winner plays 4
    - 6/11 winner plays 3
    - 7/10 winner plays 2
    """
    teams = _teams_by_seed(seeded_field)
    if len(teams) < 12:
        raise ValueError(f"Expected 12 seeded teams, got {len(teams)}")

    pods: List[PodDict] = []
    for pod_id, fr_seeds, bye_seed, qf_id, semi_side in POD_SPECS:
        hi, lo = fr_seeds
        if hi not in teams or lo not in teams or bye_seed not in teams:
            raise ValueError(f"Missing seed(s) for pod {pod_id}: {fr_seeds}, bye {bye_seed}")
        pods.append(
            {
                "pod_id": pod_id,
                "first_round": [teams[hi], teams[lo]],
                "bye": teams[bye_seed],
                "quarterfinal_id": qf_id,
                "semifinal_side": semi_side,
            }
        )
    return pods


def build_bracket_rounds(pods: List[PodDict]) -> Dict[str, Any]:
    """Flatten pods into round-oriented structure for Round View rendering."""
    first_round: List[Dict[str, Any]] = []
    quarterfinals: List[Dict[str, Any]] = []
    for pod in pods:
        a, b = pod["first_round"]
        first_round.append(
            {
                "game_id": f"{pod['pod_id']}_r1",
                "team_a": a,
                "team_b": b,
                "winner_to_seed": int(pod["bye"]["seed"]),
            }
        )
        quarterfinals.append(
            {
                "game_id": pod["quarterfinal_id"],
                "bye_team": pod["bye"],
                "feeds_from": f"Winner {int(a['seed'])}/{int(b['seed'])}",
            }
        )

    top_pods = [p for p in pods if p["semifinal_side"] == "top"]
    bottom_pods = [p for p in pods if p["semifinal_side"] == "bottom"]

    return {
        "first_round": first_round,
        "quarterfinals": quarterfinals,
        "semifinals": [
            {"side": "top", "pods": [p["quarterfinal_id"] for p in top_pods]},
            {"side": "bottom", "pods": [p["quarterfinal_id"] for p in bottom_pods]},
        ],
        "championship": {"label": "National Championship"},
    }
