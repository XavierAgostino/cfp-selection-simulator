"""Run-grounded selection case builder for team resumes.

Generates ``why_in`` / ``concerns`` (and optional ``selection_case`` block)
from the active run payload: rank, seed, bid type, field status, component
ranks, ruleset, cutoff context, displacement, stability, and record metadata.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Literal, Optional

import pandas as pd

from src.api_contracts.models import RecordMeta
from src.selection.field import PlayoffSelection

SelectionCaseStatus = Literal["selected", "out", "bubble", "summary"]

RANK_GAP_THRESHOLD = 10
SCORE_GAP_THRESHOLD = 0.08
SOS_BUBBLE_RANK_THRESHOLD = 50
SOR_RANK_GAP_THRESHOLD = 15


@dataclass(frozen=True)
class SelectionCaseResult:
    status: SelectionCaseStatus
    headline: str
    reasons: List[str]
    concerns: List[str]


def _team_dicts(teams: List[dict], name: str) -> Optional[dict]:
    for team in teams:
        if team.get("team") == name:
            return team
    return None


def _last_at_large(selection: PlayoffSelection) -> Optional[dict]:
    if not selection.at_large_bids:
        return None
    return max(selection.at_large_bids, key=lambda t: t["rank"])


def _first_team_out(selection: PlayoffSelection) -> Optional[dict]:
    if not selection.first_four_out:
        return None
    return selection.first_four_out[0]


def _next_four_out_names(
    rankings_df: Optional[pd.DataFrame], selection: PlayoffSelection
) -> set[str]:
    if rankings_df is None:
        return set()
    excluded = {t["team"] for t in selection.playoff_teams} | {
        t["team"] for t in selection.first_four_out
    }
    pool = rankings_df[~rankings_df["team"].isin(excluded)].sort_values("rank")
    return {row["team"] for _, row in pool.head(4).iterrows()}


def _composite_gap_text(team_row: pd.Series, reference: dict, *, direction: str) -> Optional[str]:
    team_score = float(team_row.get("composite_score", 0.0))
    ref_score = float(reference.get("composite_score", 0.0))
    gap = abs(ref_score - team_score)
    ref_team = reference.get("team", "the final at-large team")
    if direction == "above":
        return (
            f"Finished above the final at-large cutoff ({ref_team}) "
            f"by {gap:.3f} composite points."
        )
    return f"First team out behind {ref_team} by {gap:.3f} composite points."


def _component_concerns(
    rank: int,
    component_ranks: Dict[str, int],
    scores: pd.Series,
    *,
    bubble_scope: bool,
) -> List[str]:
    concerns: List[str] = []
    resume_rank = component_ranks.get("resume", rank)
    predictive_rank = component_ranks.get("predictive", rank)
    sor_rank = component_ranks.get("sor", rank)
    sos_rank = component_ranks.get("sos", rank)

    if resume_rank + RANK_GAP_THRESHOLD <= predictive_rank:
        concerns.append(
            "Resume profile trails team-strength indicators "
            f"(resume rank #{resume_rank}, predictive rank #{predictive_rank})."
        )
    elif predictive_rank + RANK_GAP_THRESHOLD <= resume_rank:
        concerns.append(
            "Predictive profile trails resume profile "
            f"(predictive rank #{predictive_rank}, resume rank #{resume_rank})."
        )
    else:
        resume_score = float(scores.get("resume_score", 0.0))
        predictive_score = float(scores.get("predictive_score", 0.0))
        if predictive_score + SCORE_GAP_THRESHOLD < resume_score:
            concerns.append("Predictive profile trails resume profile.")
        elif resume_score + SCORE_GAP_THRESHOLD < predictive_score:
            concerns.append("Resume profile trails team-strength indicators.")

    if bubble_scope and sos_rank >= SOS_BUBBLE_RANK_THRESHOLD:
        concerns.append(
            "Schedule strength is a concern relative to other bubble teams "
            f"(SOS rank #{sos_rank})."
        )

    if sor_rank >= rank + SOR_RANK_GAP_THRESHOLD:
        concerns.append(
            "Strength-of-record rank trails composite rank "
            f"(SOR rank #{sor_rank}, composite rank #{rank})."
        )

    return concerns


def _record_meta_notes(record_meta: Optional[RecordMeta]) -> List[str]:
    if record_meta is None or not record_meta.is_demo_fixture:
        return []
    return ["Demo fixture with a partial schedule; records and resume details are illustrative."]


def _bye_reason(
    *,
    ruleset: Optional[str],
    seeding_mode: Optional[str],
    seed: int,
    is_bye: bool,
) -> Optional[str]:
    if not is_bye or seed > 4:
        return None
    if ruleset == "2024" or seeding_mode == "champion_byes":
        return (
            "Receives a first-round bye as one of the top four conference champions "
            "under the 2024 ruleset."
        )
    return "Receives a first-round bye as a top-four overall seed under this ruleset."


def _conference_champion_label(row: pd.Series, champion_of: Optional[str] = None) -> str:
    if champion_of:
        return champion_of
    conference = row.get("conference")
    if conference and str(conference).lower() not in ("", "nan", "none"):
        return str(conference)
    conf = row.get("conf_champ")
    if conf is not None:
        label = str(conf)
        if "(" in label:
            return label.split("(", 1)[1].rstrip(")")
    return "conference"


def build_selection_case(
    team_name: str,
    row: pd.Series,
    selection: Optional[PlayoffSelection],
    seeded: Optional[pd.DataFrame],
    *,
    component_ranks: Optional[Dict[str, int]] = None,
    ruleset: Optional[str] = None,
    seeding_mode: Optional[str] = None,
    in_field: bool = False,
    bid_type: Optional[str] = None,
    detail_level: str = "full",
    record_meta: Optional[RecordMeta] = None,
    stability_status: Optional[str] = None,
    rankings_df: Optional[pd.DataFrame] = None,
    champion_of: Optional[str] = None,
) -> SelectionCaseResult:
    """Build selection case bullets from the active run context."""
    rank = int(row["rank"])
    comp_ranks = component_ranks or {}
    reasons: List[str] = [f"Ranked #{rank} by the composite model."]
    concerns: List[str] = []

    if selection is None:
        return SelectionCaseResult(
            status="summary",
            headline="Selection case unavailable",
            reasons=reasons,
            concerns=_record_meta_notes(record_meta),
        )

    seed_val: Optional[int] = None
    is_bye = False
    if seeded is not None:
        seed_rows = seeded[seeded["team"] == team_name]
        if not seed_rows.empty:
            seed_val = int(seed_rows.iloc[0]["seed"])
            is_bye = bool(seed_rows.iloc[0].get("is_bye"))

    first_four_names = {t["team"] for t in selection.first_four_out}
    next_four_names = _next_four_out_names(rankings_df, selection)
    bubble_scope = in_field or team_name in first_four_names or team_name in next_four_names
    last_at_large = _last_at_large(selection)
    first_out = _first_team_out(selection)

    if detail_level == "summary":
        status: SelectionCaseStatus = "summary"
        headline = "Selection summary"
        if in_field:
            headline = "Projected selection"
        elif team_name in first_four_names or team_name in next_four_names:
            status = "bubble"
            headline = "Bubble position"
        else:
            reasons.append("Outside the projected CFP field under this ruleset.")
            reasons.append(
                "Detailed schedule notes are available for projected field and bubble teams."
            )
        concerns.extend(_component_concerns(rank, comp_ranks, row, bubble_scope=bubble_scope))
        concerns.extend(_record_meta_notes(record_meta))
        return SelectionCaseResult(
            status=status, headline=headline, reasons=reasons, concerns=concerns
        )

    if in_field:
        status = "selected"
        headline = "Projected selection"
        effective_bid = bid_type
        if effective_bid is None:
            if _team_dicts(selection.auto_bids, team_name):
                effective_bid = "auto"
            elif _team_dicts(selection.at_large_bids, team_name):
                effective_bid = "at_large"

        if effective_bid == "auto":
            conf = _conference_champion_label(row, champion_of)
            reasons.append(f"Automatic bid as {conf} champion.")
            bye_line = _bye_reason(
                ruleset=ruleset,
                seeding_mode=seeding_mode,
                seed=seed_val or 99,
                is_bye=is_bye,
            )
            if bye_line:
                reasons.append(bye_line)
        elif effective_bid == "at_large":
            reasons.append("Selected as one of the seven at-large teams.")
            if last_at_large is not None:
                reasons.append(
                    f"Ranked #{rank}, above the final at-large cutoff "
                    f"(#{last_at_large['rank']} {last_at_large['team']})."
                )
                gap_line = _composite_gap_text(row, last_at_large, direction="above")
                if gap_line and rank > last_at_large["rank"]:
                    reasons.append(gap_line)
            else:
                reasons.append("Finished above the final at-large cutoff.")
        else:
            reasons.append("Projected in the 12-team field under this ruleset.")

        if seed_val is not None:
            reasons.append(f"Playoff seed #{seed_val} under this ruleset.")

    elif team_name in first_four_names:
        status = "bubble"
        headline = "First four out"
        reasons.append("Outside the projected 12-team field after automatic bids were applied.")
        reasons.append("Among the first four teams out.")
        if (
            first_out is not None
            and first_out.get("team") == team_name
            and last_at_large is not None
        ):
            gap_line = _composite_gap_text(row, last_at_large, direction="below")
            if gap_line:
                reasons.append(gap_line)
        if selection.displaced_team and selection.displaced_team.get("team") == team_name:
            reasons.append(
                "Displaced from the projected field by an automatic conference champion."
            )

    elif team_name in next_four_names:
        status = "bubble"
        headline = "Next four out"
        reasons.append("Outside the projected 12-team field.")
        reasons.append("Among the next four teams outside the projected field.")

    else:
        status = "out"
        headline = "Outside projected field"
        reasons.append("Outside the projected CFP field under this ruleset.")

    if (
        selection.displaced_team
        and selection.displaced_team.get("team") == team_name
        and team_name not in first_four_names
    ):
        concerns.append("Displaced from the projected field by an automatic conference champion.")

    concerns.extend(_component_concerns(rank, comp_ranks, row, bubble_scope=bubble_scope))

    if stability_status in ("bubble", "likely_out"):
        concerns.append("Selection depends heavily on model-weight assumptions under this run.")

    concerns.extend(_record_meta_notes(record_meta))

    return SelectionCaseResult(status=status, headline=headline, reasons=reasons, concerns=concerns)
