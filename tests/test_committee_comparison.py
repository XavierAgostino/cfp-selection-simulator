"""Model vs committee comparison artifact (committee.json).

Uses the checked-in 2025 committee reference data (src/validation/historical.py)
against a synthetic model ranking, so assertions stay deterministic and no
network or CFBD quota is involved.
"""

from typing import List, Optional

import pytest

from src.api_contracts.build import build_committee_comparison_payload
from src.api_contracts.export import FLAT_FILE_NAMES
from src.api_contracts.models import (
    CommitteeComparisonPayload,
    RankingsPayload,
    RankingsTeam,
    Record,
)
from src.config.simulator import SimulatorConfig
from src.validation.historical import (
    HISTORICAL_CFP_TOP25,
    HISTORICAL_CFP_TWELVE_TEAM_FIELD,
)
from src.worker.artifact_keys import PER_RUN_ARTIFACT_FILES


def _team(
    rank: int,
    name: str,
    *,
    in_field: bool = False,
    seed: Optional[int] = None,
    bid_type: Optional[str] = None,
) -> RankingsTeam:
    score = 1.0 - rank * 0.02
    return RankingsTeam(
        rank=rank,
        team=name,
        composite_score=score,
        resume_score=score,
        predictive_score=score,
        sor=score,
        sos=score,
        is_conference_champion=bid_type == "auto",
        record=Record(wins=11, losses=1),
        in_field=in_field,
        bid_type=bid_type,
        seed=seed,
    )


def _rankings_2025() -> RankingsPayload:
    """Synthetic model projection mirroring the real 2025 disagreement:
    the model takes Notre Dame, the committee took Miami."""
    field = [
        ("Indiana", "auto"),
        ("Ohio State", "at_large"),
        ("Georgia", "auto"),
        ("Texas Tech", "auto"),
        ("Oregon", "at_large"),
        ("Ole Miss", "at_large"),
        ("Texas A&M", "at_large"),
        ("Notre Dame", "at_large"),
        ("Oklahoma", "at_large"),
        ("Alabama", "at_large"),
        ("Tulane", "auto"),
        ("James Madison", "auto"),
    ]
    teams: List[RankingsTeam] = []
    for i, (name, bid) in enumerate(field):
        teams.append(_team(i + 1, name, in_field=True, seed=i + 1, bid_type=bid))
    for j, name in enumerate(["Miami", "BYU", "Texas", "Vanderbilt", "Utah"]):
        teams.append(_team(len(field) + j + 1, name))
    return RankingsPayload(season=2025, week=15, generated_at="2025-12-08T00:00:00Z", teams=teams)


@pytest.fixture()
def payload() -> CommitteeComparisonPayload:
    config = SimulatorConfig(year=2025, week=15)
    result = build_committee_comparison_payload(config, _rankings_2025(), use_sample=True)
    assert result is not None
    return result


def test_absent_for_seasons_without_committee_data():
    config = SimulatorConfig(year=2026, week=15)
    rankings = RankingsPayload(season=2026, week=15, generated_at="x", teams=[])
    assert build_committee_comparison_payload(config, rankings, use_sample=True) is None


def test_summary_overlap_and_disagreements(payload: CommitteeComparisonPayload):
    s = payload.summary
    assert s.committee_field_size == 12
    assert s.model_field_size == 12
    assert s.field_overlap_count == 11
    assert s.field_overlap_ratio == pytest.approx(11 / 12, abs=1e-4)
    assert s.model_only_field == ["Notre Dame"]
    assert s.committee_only_field == ["Miami"]
    assert s.model_first_team_out == "Miami"
    assert s.committee_first_team_out == "Notre Dame"
    assert payload.field_comparable is True
    assert s.seed_exact_matches is not None


def test_agreement_classification(payload: CommitteeComparisonPayload):
    by_team = {row.team: row for row in payload.teams}
    assert by_team["Indiana"].agreement == "both_in"
    assert by_team["Notre Dame"].agreement == "model_only"
    assert by_team["Miami"].agreement == "committee_only"
    assert by_team["Texas"].agreement == "both_out"


def test_rank_delta_sign_convention(payload: CommitteeComparisonPayload):
    """rank_delta = committee_rank - model_rank; positive = model ranks the team higher."""
    by_team = {row.team: row for row in payload.teams}
    nd = by_team["Notre Dame"]
    assert nd.model_rank == 8
    assert nd.committee_rank == 11
    assert nd.rank_delta == 3

    miami = by_team["Miami"]
    assert miami.model_rank == 13
    assert miami.committee_rank == 10
    assert miami.rank_delta == -3


def test_committee_seed_and_bid_type(payload: CommitteeComparisonPayload):
    by_team = {row.team: row for row in payload.teams}
    committee_field = HISTORICAL_CFP_TWELVE_TEAM_FIELD[2025]
    for seed, name in enumerate(committee_field, start=1):
        assert by_team[name].committee_seed == seed
        assert by_team[name].committee_in_field is True
    assert by_team["Tulane"].committee_bid_type == "auto"
    assert by_team["Miami"].committee_bid_type == "at_large"
    assert by_team["Notre Dame"].committee_bid_type is None
    assert by_team["Notre Dame"].committee_seed is None


def test_roster_covers_committee_top25(payload: CommitteeComparisonPayload):
    names = {row.team for row in payload.teams}
    assert set(HISTORICAL_CFP_TOP25[2025]) <= names


def test_rows_sorted_by_committee_rank_first(payload: CommitteeComparisonPayload):
    ranked = [row for row in payload.teams if row.committee_rank is not None]
    assert [row.committee_rank for row in ranked] == sorted(row.committee_rank for row in ranked)
    # Committee-unranked rows sort after all ranked rows.
    tail = payload.teams[len(ranked) :]
    assert all(row.committee_rank is None for row in tail)


def test_payload_identity_and_serialization(payload: CommitteeComparisonPayload):
    assert payload.season == 2025
    assert payload.reference == "final"
    assert "2025" in payload.reference_label
    round_tripped = CommitteeComparisonPayload.model_validate_json(payload.model_dump_json())
    assert round_tripped == payload


def test_export_wiring_includes_committee():
    assert FLAT_FILE_NAMES["committee"] == "committee.json"
    assert "committee.json" in PER_RUN_ARTIFACT_FILES
