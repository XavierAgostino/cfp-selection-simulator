"""Weekly revealed-preferences backtest tests (Phase 2.5)."""

from __future__ import annotations

import pandas as pd
import pytest

from src.calibration.revealed_preferences import run_revealed_preferences
from src.calibration.revealed_preferences_outputs import build_revealed_preferences_payload
from src.validation.historical import (
    FINAL_CFP_RANKING_WEEK,
    historical_top25,
    register_weekly_top25,
)


@pytest.fixture
def synthetic_weekly_2025():
    """Register two weekly fixtures for drift testing, restoring global state after."""
    from src.validation.historical import HISTORICAL_CFP_WEEKLY_TOP25

    final = historical_top25(2025)
    assert final is not None
    saved = {year: dict(weeks) for year, weeks in HISTORICAL_CFP_WEEKLY_TOP25.items()}
    register_weekly_top25(2025, 12, list(final))
    register_weekly_top25(2025, FINAL_CFP_RANKING_WEEK, list(final))
    yield
    HISTORICAL_CFP_WEEKLY_TOP25.clear()
    HISTORICAL_CFP_WEEKLY_TOP25.update(saved)


def test_weekly_fixtures_available_after_register(synthetic_weekly_2025: None) -> None:
    from src.validation.historical import historical_weeks_available

    weeks = historical_weeks_available(2025)
    assert 12 in weeks
    assert FINAL_CFP_RANKING_WEEK in weeks


def test_weekly_drift_payload_has_multiple_weeks(
    synthetic_weekly_2025: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import src.calibration.revealed_preferences as rp

    teams = historical_top25(2025)
    assert teams is not None

    def _fake_prepare(
        year: int,
        week: int,
        *,
        api_key: str | None,
    ) -> tuple[pd.DataFrame, pd.DataFrame] | None:
        del api_key, week
        if year != 2025:
            return None
        frame = pd.DataFrame(
            {
                "team": teams,
                "rank": range(1, len(teams) + 1),
                "composite_score": [1.0 - i * 0.01 for i in range(len(teams))],
                "resume_score": [0.5] * len(teams),
                "predictive_score": [0.5] * len(teams),
                "sor": [0.5] * len(teams),
                "sos": [0.5] * len(teams),
            }
        )
        games = pd.DataFrame({"home_team": [teams[0]], "away_team": [teams[1]]})
        return games, frame

    monkeypatch.setattr(rp, "_prepare_season", _fake_prepare)

    result = run_revealed_preferences([2025], weeks="all", api_key="test", verbose=False)
    assert len(result.evaluated_entries) >= 2
    weeks_fit = sorted({e.week for e in result.evaluated_entries})
    assert 12 in weeks_fit
    assert FINAL_CFP_RANKING_WEEK in weeks_fit

    payload = build_revealed_preferences_payload(result)
    assert payload["research_only"] is True
    assert len(payload["entries"]) >= 2


def test_early_week_sets_directional_confidence(
    synthetic_weekly_2025: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import src.calibration.revealed_preferences as rp

    teams = historical_top25(2025)
    assert teams is not None

    def _fake_prepare(
        year: int,
        week: int,
        *,
        api_key: str | None,
    ) -> tuple[pd.DataFrame, pd.DataFrame] | None:
        del api_key
        if year != 2025:
            return None
        frame = pd.DataFrame(
            {
                "team": teams,
                "rank": range(1, len(teams) + 1),
                "composite_score": [1.0 - i * 0.01 for i in range(len(teams))],
                "resume_score": [0.5] * len(teams),
                "predictive_score": [0.5] * len(teams),
                "sor": [0.5] * len(teams),
                "sos": [0.5] * len(teams),
            }
        )
        games = pd.DataFrame({"home_team": [teams[0]], "away_team": [teams[1]]})
        return games, frame

    monkeypatch.setattr(rp, "_prepare_season", _fake_prepare)
    result = run_revealed_preferences([2025], weeks=12, api_key="test", verbose=False)
    fit = result.evaluated_entries[0]
    assert fit.week == 12
    assert fit.interpretation.confidence == "directional"
    assert fit.fit_warning is not None
