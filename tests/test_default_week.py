"""Tests for default CFP analysis week resolution."""

from __future__ import annotations

from src.pipeline.default_week import (
    FINAL_SELECTION_WEEK,
    PRE_FINAL_SELECTION_WEEK,
    cfbd_max_cached_week,
    resolve_default_week,
    sample_max_available_week,
    week_defaults_payload,
    week_option_label,
)


def test_sample_fixture_caps_at_week_15() -> None:
    assert sample_max_available_week() == 15


def test_resolve_default_week_sample_prefers_15_not_16() -> None:
    assert resolve_default_week(2025, use_sample=True) == 15


def test_resolve_default_week_live_prefers_16_without_cache(monkeypatch, tmp_path) -> None:
    # No cached games for the season → fall back to the final selection window.
    import src.pipeline.default_week as mod

    monkeypatch.setattr(mod, "DATA_CACHE", tmp_path)
    assert resolve_default_week(2025, use_sample=False) == FINAL_SELECTION_WEEK


def test_resolve_default_week_live_uses_cache_when_below_16(monkeypatch, tmp_path) -> None:
    cache_dir = tmp_path / "cfbd" / "2025"
    cache_dir.mkdir(parents=True)
    (cache_dir / "games_w15_s1.parquet").write_bytes(b"")

    import src.pipeline.default_week as mod

    monkeypatch.setattr(mod, "DATA_CACHE", tmp_path)
    assert cfbd_max_cached_week(2025) == 15
    assert resolve_default_week(2025, use_sample=False) == PRE_FINAL_SELECTION_WEEK


def test_resolve_default_week_live_uses_cache_week_16(monkeypatch, tmp_path) -> None:
    # Unreadable/empty snapshot: fall back to the filename cutoff (week 16).
    cache_dir = tmp_path / "cfbd" / "2025"
    cache_dir.mkdir(parents=True)
    (cache_dir / "games_w16_s1.parquet").write_bytes(b"")

    import src.pipeline.default_week as mod

    monkeypatch.setattr(mod, "DATA_CACHE", tmp_path)
    assert cfbd_max_cached_week(2025) == 16
    assert resolve_default_week(2025, use_sample=False) == FINAL_SELECTION_WEEK


def test_cfbd_max_cached_week_uses_game_content_not_filename(monkeypatch, tmp_path) -> None:
    """A w16 snapshot whose newest games are week 15 resolves to 15, not 16."""
    import pandas as pd

    cache_dir = tmp_path / "cfbd" / "2025"
    cache_dir.mkdir(parents=True)
    pd.DataFrame({"week": list(range(1, 16))}).to_parquet(cache_dir / "games_w16_s1.parquet")

    import src.pipeline.default_week as mod

    monkeypatch.setattr(mod, "DATA_CACHE", tmp_path)
    assert cfbd_max_cached_week(2025) == 15
    assert resolve_default_week(2025, use_sample=False) == PRE_FINAL_SELECTION_WEEK


def test_week_option_labels() -> None:
    assert "Final selection window" in week_option_label(16)
    assert "Championship weekend" in week_option_label(15)
    assert week_option_label(10) == "Week 10"


def test_week_defaults_payload_sample() -> None:
    payload = week_defaults_payload(2025, use_sample=True)
    assert payload["default_week"] == 15
    assert payload["max_available_week"] == 15
    assert payload["data_source"] == "sample"
    assert "15" in payload["week_labels"]
