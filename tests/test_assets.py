"""Tests for team asset / logo registry."""

import json
from pathlib import Path

import pytest

from src.assets.logos import get_team_logo, placeholder_logo_url
from src.assets.teams import (
    SAMPLE_CACHE_PATH,
    TeamAsset,
    clear_assets_cache,
    get_team_asset,
    load_team_assets,
    save_team_assets,
)


@pytest.fixture(autouse=True)
def reset_cache():
    clear_assets_cache()
    yield
    clear_assets_cache()


def test_get_team_logo_returns_url_from_sample_cache():
    logo = get_team_logo("Georgia", use_sample=True)
    assert logo is not None
    assert logo.startswith("https://")
    assert "61" in logo


def test_get_team_logo_fallback_to_placeholder_for_unknown_team():
    logo = get_team_logo("Totally Fake University", use_sample=True)
    assert logo == placeholder_logo_url()


def test_get_team_logo_espn_fallback_without_cache_entry():
    clear_assets_cache()
    logo = get_team_logo("Ohio State", use_sample=False)
    assert logo is not None
    assert "194" in logo or logo.startswith("data:")


def test_cache_load_and_save(tmp_path: Path):
    assets = {
        "Test U": TeamAsset(
            cfbd_id=1,
            abbreviation="TU",
            conference="Test",
            logo="https://example.com/logo.png",
            logo_source="cfbd",
            primary_color="#111111",
            secondary_color="#222222",
        )
    }
    out = tmp_path / "team_assets.json"
    save_team_assets(assets, out)

    clear_assets_cache()
    with open(out) as f:
        loaded_raw = json.load(f)

    assert loaded_raw["Test U"]["logo"] == "https://example.com/logo.png"
    assert loaded_raw["Test U"]["primary_color"] == "#111111"


def test_sample_cache_file_exists_and_loads():
    assert SAMPLE_CACHE_PATH.exists()
    assets = load_team_assets(use_sample=True)
    assert "Georgia" in assets
    assert assets["Georgia"].logo_source == "espn"


def test_get_team_logo_james_madison_espn_fallback():
    clear_assets_cache()
    logo = get_team_logo("James Madison", use_sample=False)
    assert logo is not None
    assert "256" in logo


def test_get_team_logo_uconn_espn_fallback():
    clear_assets_cache()
    logo = get_team_logo("UConn", use_sample=False)
    assert logo is not None
    assert "41" in logo


def test_live_load_does_not_use_sample_cache(tmp_path: Path, monkeypatch):
    """Live mode must not silently load the 12-team sample asset file."""
    from src.assets import teams as teams_mod

    monkeypatch.setattr(teams_mod, "CACHE_PATH", tmp_path / "missing_live.json")
    clear_assets_cache()
    assets = load_team_assets(use_sample=False)
    assert assets == {}
    assert "James Madison" not in assets


def test_get_team_asset_case_insensitive():
    assert get_team_asset("georgia", use_sample=True) is not None
    assert get_team_asset("Georgia", use_sample=True) is not None
