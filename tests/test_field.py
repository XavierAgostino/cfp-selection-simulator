"""Tests for playoff field selection."""

import pandas as pd

from src.selection.audit import AuditStep
from src.selection.field import select_playoff_field


def _rankings(rows: list[tuple[int, str, bool]]) -> pd.DataFrame:
    """Build rankings DataFrame from (rank, team, is_champ) tuples."""
    data = []
    for rank, team, is_champ in rows:
        data.append(
            {
                "rank": rank,
                "team": team,
                "composite_score": 100 - rank,
                "conference": "Test",
                "conf_champ": f"Yes (Test)" if is_champ else "No",
            }
        )
    return pd.DataFrame(data)


def test_five_auto_bids_seven_at_large():
    rows = [(i, f"T{i}", i in (1, 3, 5, 8, 20)) for i in range(1, 21)]
    result = select_playoff_field(_rankings(rows))

    assert len(result.playoff_teams) == 12
    assert len(result.auto_bids) == 5
    assert len(result.at_large_bids) == 7


def test_no_duplicate_teams_in_field():
    rows = [(i, f"T{i}", i in (1, 2, 5, 10, 15)) for i in range(1, 25)]
    result = select_playoff_field(_rankings(rows))

    names = [t["team"] for t in result.playoff_teams]
    assert len(names) == len(set(names))


def test_displacement_when_low_champ_auto_bid():
    rows = [
        (1, "A", True),
        (2, "B", False),
        (3, "C", True),
        (4, "D", False),
        (5, "E", True),
        (6, "F", False),
        (7, "G", False),
        (8, "H", True),
        (9, "I", False),
        (10, "J", False),
        (11, "K", False),
        (12, "L", False),
        (13, "M", False),
        (16, "LowChamp", True),
    ]
    result = select_playoff_field(_rankings(rows))

    assert result.champ_pulled_in is True
    assert result.displaced_team is not None
    assert result.displaced_team["team"] == "L"
    assert result.displaced_team["rank"] == 12
    playoff_names = {t["team"] for t in result.playoff_teams}
    assert "LowChamp" in playoff_names
    assert "L" not in playoff_names


def test_first_four_out():
    rows = [(i, f"T{i}", False) for i in range(1, 20)]
    rows[0] = (1, "T1", True)
    rows[2] = (3, "T3", True)
    rows[4] = (5, "T5", True)
    rows[7] = (8, "T8", True)
    rows[9] = (10, "T10", True)
    result = select_playoff_field(_rankings(rows))

    assert len(result.first_four_out) == 4
    out_ranks = [t["rank"] for t in result.first_four_out]
    assert out_ranks == sorted(out_ranks)


def test_fewer_than_five_champions():
    rows = [(i, f"T{i}", i in (1, 5)) for i in range(1, 16)]
    result = select_playoff_field(_rankings(rows))

    assert len(result.auto_bids) == 2
    assert len(result.at_large_bids) == 10
    assert len(result.playoff_teams) == 12


def test_structured_audit_steps():
    rows = [(i, f"T{i}", i == 1) for i in range(1, 16)]
    result = select_playoff_field(_rankings(rows))

    steps = result.audit.steps()
    assert AuditStep.FOUND_CHAMPIONS in steps
    assert AuditStep.AUTO_BIDS in steps
    assert AuditStep.AT_LARGE in steps
    assert AuditStep.FINAL_FIELD in steps
    assert len(result.audit_log) == len(result.audit.entries)


def test_bracket_shim_select_playoff_field():
    from src.playoff.bracket import select_playoff_field as bracket_select

    rows = [(i, f"T{i}", i in (1, 3, 5, 8, 9)) for i in range(1, 16)]
    result = bracket_select(_rankings(rows))
    assert len(result.playoff_teams) == 12
    assert hasattr(result, "first_four_out")
