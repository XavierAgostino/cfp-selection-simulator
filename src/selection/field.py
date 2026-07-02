"""
12-team CFP field selection: 5 automatic conference champion bids + 7 at-large.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import pandas as pd

from src.config.formats import PlayoffFormat
from src.selection.audit import AuditStep, SelectionAudit


@dataclass
class PlayoffSelection:
    """Results of 12-team playoff selection."""

    playoff_teams: List[Dict]
    auto_bids: List[Dict]
    at_large_bids: List[Dict]
    first_four_out: List[Dict]
    displaced_team: Optional[Dict]
    champ_pulled_in: bool
    audit_log: List[str]
    audit: SelectionAudit


def select_playoff_field(
    rankings_df: pd.DataFrame,
    conference_col: str = "conference",
    conf_champ_col: str = "conf_champ",
    n_auto_bids: int = 5,
    n_at_large: int = 7,
    format_rules: Optional[PlayoffFormat] = None,
) -> PlayoffSelection:
    """
    Select a 12-team playoff field using the 5+7 protocol.

    Protocol:
    1. Five highest-ranked conference champions receive automatic bids.
    2. Remaining spots filled by highest-ranked teams not already selected.
    3. If an automatic bid team ranks outside the top 12, they still qualify;
       the lowest-ranked at-large candidate is displaced and recorded in the audit.

    Parameters
    ----------
    rankings_df
        Must contain rank, team, composite_score, conference_col, conf_champ_col.
    format_rules
        Optional PlayoffFormat; when provided, auto_bids/at_large come from format.
    """
    if format_rules is not None:
        n_auto_bids = format_rules.auto_bids
        n_at_large = format_rules.at_large

    audit = SelectionAudit()
    total_teams = n_auto_bids + n_at_large

    rankings_df = rankings_df.sort_values("rank").reset_index(drop=True)

    champs_df = rankings_df[rankings_df[conf_champ_col].str.contains("Yes", na=False)].copy()
    audit.add(AuditStep.FOUND_CHAMPIONS, f"Found {len(champs_df)} conference champions")

    if len(champs_df) < n_auto_bids:
        audit.add(
            AuditStep.FOUND_CHAMPIONS,
            f"WARNING: Only {len(champs_df)} champions found, need {n_auto_bids}",
        )
        n_auto_bids = len(champs_df)
        n_at_large = total_teams - n_auto_bids

    auto_bid_teams = champs_df.head(n_auto_bids).to_dict("records")
    auto_bid_names = {team["team"] for team in auto_bid_teams}

    audit.add(AuditStep.AUTO_BIDS, f"Automatic bids (top {n_auto_bids} conference champions):")
    for i, team in enumerate(auto_bid_teams, 1):
        audit.add(
            AuditStep.AUTO_BIDS,
            f"  {i}. #{team['rank']} {team['team']} ({team[conf_champ_col]})",
        )

    eligible_at_large = rankings_df[~rankings_df["team"].isin(auto_bid_names)].copy()
    at_large_teams = eligible_at_large.head(n_at_large).to_dict("records")

    audit.add(AuditStep.AT_LARGE, f"At-large bids ({n_at_large} spots):")
    for i, team in enumerate(at_large_teams, 1):
        audit.add(AuditStep.AT_LARGE, f"  {i}. #{team['rank']} {team['team']}")

    playoff_names = {t["team"] for t in auto_bid_teams} | {t["team"] for t in at_large_teams}
    champ_pulled_in = any(team["rank"] > total_teams for team in auto_bid_teams)
    displaced_team: Optional[Dict] = None

    if champ_pulled_in:
        low_auto = max(auto_bid_teams, key=lambda x: x["rank"])
        audit.add(
            AuditStep.DISPLACEMENT,
            f"CHAMPION PULLED IN: #{low_auto['rank']} {low_auto['team']} "
            f"(auto bid outside top {total_teams})",
        )
        if len(eligible_at_large) > n_at_large:
            displaced_team = eligible_at_large.iloc[n_at_large].to_dict()
            audit.add(
                AuditStep.DISPLACEMENT,
                f"DISPLACED: #{displaced_team['rank']} {displaced_team['team']}",
            )

    playoff_teams = sorted(auto_bid_teams + at_large_teams, key=lambda x: x["rank"])
    first_four_out = (
        rankings_df[~rankings_df["team"].isin(playoff_names)].head(4).to_dict("records")
    )

    audit.add(AuditStep.FINAL_FIELD, "Final 12-team playoff field:")
    for i, team in enumerate(playoff_teams, 1):
        status = "AUTO" if team["team"] in auto_bid_names else "AT-LARGE"
        audit.add(AuditStep.FINAL_FIELD, f"  {i}. #{team['rank']} {team['team']} ({status})")

    if first_four_out:
        audit.add(AuditStep.FIRST_FOUR_OUT, "First four out:")
        for i, team in enumerate(first_four_out, 1):
            audit.add(
                AuditStep.FIRST_FOUR_OUT,
                f"  {i}. #{team['rank']} {team['team']}",
            )

    return PlayoffSelection(
        playoff_teams=playoff_teams,
        auto_bids=auto_bid_teams,
        at_large_bids=at_large_teams,
        first_four_out=first_four_out,
        displaced_team=displaced_team,
        champ_pulled_in=champ_pulled_in,
        audit_log=audit.to_log(),
        audit=audit,
    )
