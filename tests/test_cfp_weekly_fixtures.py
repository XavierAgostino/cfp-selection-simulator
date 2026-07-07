"""Release-dated weekly CFP fixture tests (Phase 5).

Guards the curation rules for tests/fixtures/cfp_weekly/: real weekly
releases only (no aliasing finals), release identity over ambiguous weeks,
week-bounded game snapshots, and volatility fields in the weekly artifact.
"""

from __future__ import annotations

import pandas as pd
import pytest

from src.validation.cfp_weekly import (
    load_weekly_releases,
    register_weekly_releases,
    release_index,
)
from src.validation.historical import (
    FINAL_CFP_RANKING_WEEK,
    HISTORICAL_CFP_TOP25,
    historical_top25,
)


@pytest.fixture
def restore_weekly_registry():
    from src.validation.historical import HISTORICAL_CFP_WEEKLY_TOP25

    saved = {year: dict(weeks) for year, weeks in HISTORICAL_CFP_WEEKLY_TOP25.items()}
    yield
    HISTORICAL_CFP_WEEKLY_TOP25.clear()
    HISTORICAL_CFP_WEEKLY_TOP25.update(saved)


def test_2024_releases_load_and_validate() -> None:
    releases = [r for r in load_weekly_releases() if r.season == 2024]
    assert len(releases) == 6
    assert [r.ranking_release for r in releases] == [1, 2, 3, 4, 5, 6]
    assert [r.games_through_week for r in releases] == [10, 11, 12, 13, 14, 15]
    assert [r.release_date for r in releases] == [
        "2024-11-05",
        "2024-11-12",
        "2024-11-19",
        "2024-11-26",
        "2024-12-03",
        "2024-12-08",
    ]
    for release in releases:
        assert len(release.top25) == 25
        assert len(set(release.top25)) == 25
        assert release.source


def test_final_release_matches_historical_fixture() -> None:
    releases = [r for r in load_weekly_releases() if r.season == 2024]
    final = [r for r in releases if r.is_final]
    assert len(final) == 1
    assert list(final[0].top25) == HISTORICAL_CFP_TOP25[2024]


def test_no_weekly_release_aliases_final() -> None:
    """The old scaffolding seeded weeks from finals; curated releases must not."""
    for release in load_weekly_releases():
        final = HISTORICAL_CFP_TOP25.get(release.season)
        if final is None or release.is_final:
            continue
        assert list(release.top25) != list(
            final
        ), f"{release.season} release {release.ranking_release} aliases the final"


def test_register_weekly_releases_keys_by_data_cutoff(
    restore_weekly_registry: None,
) -> None:
    from src.validation.historical import historical_weeks_available

    register_weekly_releases()
    weeks = historical_weeks_available(2024)
    assert weeks == [10, 11, 12, 13, 14, FINAL_CFP_RANKING_WEEK]
    # Registered fixture is the real release, not the final.
    week_10 = historical_top25(2024, week=10)
    assert week_10 is not None
    assert week_10 != HISTORICAL_CFP_TOP25[2024]
    assert week_10[3] == "Miami"  # release 1 (Nov 5) had Miami at #4
    # Week 15 stays the seeded final.
    assert historical_top25(2024, week=FINAL_CFP_RANKING_WEEK) == HISTORICAL_CFP_TOP25[2024]


def test_release_index_lookup() -> None:
    releases = load_weekly_releases()
    index = release_index(releases)
    release_1 = index[(2024, 10)]
    assert release_1.ranking_release == 1
    assert release_1.release_date == "2024-11-05"


def test_load_season_games_is_week_bounded(monkeypatch: pytest.MonkeyPatch) -> None:
    """Committee release X may only see games through its data cutoff."""
    import src.calibration.harness as harness
    from src.calibration.revealed_preferences import _load_season_games

    full_season = pd.DataFrame(
        {
            "week": list(range(1, 16)),
            "home_team": ["A"] * 15,
            "away_team": ["B"] * 15,
            "home_score": [21] * 15,
            "away_score": [14] * 15,
        }
    )
    monkeypatch.setattr(harness, "_load_season_games", lambda year, api_key=None: full_season)
    bounded = _load_season_games(2024, 12, api_key=None)
    assert int(bounded["week"].max()) == 12
    assert len(bounded) == 12


def test_weekly_volatility_payload(
    restore_weekly_registry: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import src.calibration.revealed_preferences as rp
    from src.calibration.revealed_preferences import run_revealed_preferences
    from src.calibration.revealed_preferences_outputs import (
        build_weekly_volatility_payload,
    )
    from src.validation.historical import register_weekly_top25

    teams = historical_top25(2025)
    assert teams is not None
    register_weekly_top25(2025, 12, list(teams))

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
    result = run_revealed_preferences([2025], weeks="all", verbose=False)
    assert len(result.evaluated_entries) >= 2

    payload = build_weekly_volatility_payload(result)
    assert payload is not None
    assert payload["research_only"] is True
    assert payload["schema_version"] == 1
    assert "published top 25" in payload["disclaimer"]
    assert payload["production_baseline"] == {
        "resume": 0.4,
        "predictive": 0.3,
        "sor": 0.2,
        "sos": 0.1,
    }

    assert "descriptive approximations" in payload["disclaimer_short"]
    assert "Edge-weight fit" in payload["badge_explainers"]

    seasons = payload["seasons"]
    assert len(seasons) == 1
    season = seasons[0]
    assert season["season"] == 2025
    assert season["takeaway"].startswith("Across 2 releases")
    assert season["warning_badges"][0] == "Research-only"

    fits = season["weekly_fits"]
    assert [fit["games_through_week"] for fit in fits] == [12, FINAL_CFP_RANKING_WEEK]
    assert fits[0]["prior_release_delta_pp"] is None
    assert isinstance(fits[1]["prior_release_delta_pp"], dict)
    for fit in fits:
        assert fit["research_only"] is True
        assert fit["warning_badges"][0] == "Research-only"
        assert "rank_error" in fit["fit_quality"]
        # Synthetic weeks have no curated release, so the citation is null,
        # but the key itself is part of the contract.
        assert "source" in fit and fit["source"] is None

    volatility = season["volatility"]
    assert volatility["releases_compared"] == 1
    for key in ("resume", "predictive", "sor", "sos"):
        assert key in volatility["mean_abs_shift_pp"]
        assert key in volatility["max_abs_shift_pp"]
    max_shift = max(volatility["max_abs_shift_pp"].values())
    note = volatility["volatility_note"]
    if max_shift >= 10:
        assert isinstance(note, str) and f"{max_shift}pp" in note
    else:
        assert note is None


def test_volatility_payload_none_for_final_only(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Final-only runs (the default) must not emit a weekly artifact."""
    import src.calibration.revealed_preferences as rp
    from src.calibration.revealed_preferences import run_revealed_preferences
    from src.calibration.revealed_preferences_outputs import (
        build_weekly_volatility_payload,
    )

    teams = historical_top25(2025)
    assert teams is not None

    def _fake_prepare(
        year: int,
        week: int,
        *,
        api_key: str | None,
    ) -> tuple[pd.DataFrame, pd.DataFrame] | None:
        del api_key, week
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
    result = run_revealed_preferences([2025], weeks=None, verbose=False)
    assert build_weekly_volatility_payload(result) is None
