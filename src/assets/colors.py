"""Team color lookup with asset-cache fallbacks."""

from __future__ import annotations

from typing import Tuple

from src.assets.teams import ESPN_TEAM_IDS, TeamAsset, get_team_asset

# Legacy fallback when no asset cache entry exists
_LEGACY_COLORS: dict[str, str] = {
    "Georgia": "#BA0C2F",
    "Alabama": "#9E1B32",
    "Texas": "#BF5700",
    "Ohio State": "#BB0000",
    "Michigan": "#00274C",
    "Oregon": "#154733",
    "Notre Dame": "#0C2340",
    "Penn State": "#041E42",
    "Clemson": "#F56600",
    "LSU": "#461D7C",
    "Oklahoma": "#841617",
    "Florida State": "#782F40",
    "USC": "#990000",
    "Washington": "#4B2E83",
}


def get_primary_color(team_name: str, use_sample: bool = False) -> str:
    asset = get_team_asset(team_name, use_sample=use_sample)
    if asset and asset.primary_color:
        return asset.primary_color
    if team_name in _LEGACY_COLORS:
        return _LEGACY_COLORS[team_name]
    return "#667eea"


def get_team_colors(team_name: str, use_sample: bool = False) -> Tuple[str, str]:
    asset = get_team_asset(team_name, use_sample=use_sample)
    if asset:
        return asset.primary_color, asset.secondary_color
    primary = _LEGACY_COLORS.get(team_name, "#667eea")
    return primary, "#333333"


def asset_from_espn_fallback(team_name: str) -> TeamAsset:
    """Build minimal TeamAsset from ESPN directory when CFBD data unavailable."""
    espn_id = ESPN_TEAM_IDS.get(team_name)
    logo = f"https://a.espncdn.com/i/teamlogos/ncaa/500/{espn_id}.png" if espn_id else None
    primary = _LEGACY_COLORS.get(team_name, "#667eea")
    return TeamAsset(
        espn_id=espn_id,
        logo=logo,
        logo_source="espn" if logo else "placeholder",
        primary_color=primary,
        secondary_color="#333333",
    )
