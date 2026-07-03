"""Tests for API contract builders."""

from src.api_contracts.build import build_team_slot


def test_build_team_slot_logo_url_espn_fallback_without_cache(monkeypatch):
    """Exports prefer ESPN CDN URLs when cache misses, not null or data URIs."""

    def fake_asset(_team: str, use_sample: bool = False):
        return None

    monkeypatch.setattr("src.api_contracts.build._team_asset", fake_asset)

    row = {
        "team": "Ohio State",
        "rank": 1,
        "conference": "Big Ten",
        "composite_score": 0.9,
        "resume_score": 0.8,
        "predictive_score": 0.85,
        "sor": 0.7,
        "sos": 0.6,
    }
    slot = build_team_slot(row, records={}, use_sample=False, seed=1, is_bye=True)

    assert slot.logo_url is not None
    assert "194" in slot.logo_url
    assert not slot.logo_url.startswith("data:")


def test_build_team_slot_logo_url_null_for_unknown_team(monkeypatch):
    def fake_asset(_team: str, use_sample: bool = False):
        return None

    monkeypatch.setattr("src.api_contracts.build._team_asset", fake_asset)

    row = {
        "team": "Totally Fake University",
        "rank": 99,
        "conference": "Test",
        "composite_score": 0.1,
        "resume_score": 0.1,
        "predictive_score": 0.1,
        "sor": 0.1,
        "sos": 0.1,
    }
    slot = build_team_slot(row, records={}, use_sample=False)

    assert slot.logo_url is None
