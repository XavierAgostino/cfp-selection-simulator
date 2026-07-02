"""Canonical team identity mapping and asset cache."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
CACHE_PATH = REPO_ROOT / "data" / "cache" / "team_assets.json"
SAMPLE_CACHE_PATH = REPO_ROOT / "data" / "cache" / "team_assets.sample.json"

# ESPN team id → school name (common FBS programs for offline fallback)
ESPN_TEAM_IDS: Dict[str, int] = {
    "Georgia": 61,
    "Ohio State": 194,
    "Notre Dame": 87,
    "Alabama": 333,
    "Michigan": 130,
    "Texas": 251,
    "Oregon": 2483,
    "Penn State": 213,
    "Clemson": 228,
    "LSU": 99,
    "Oklahoma": 201,
    "Florida State": 52,
    "USC": 30,
    "Washington": 264,
    "Tennessee": 2633,
    "Texas A&M": 245,
    "Auburn": 2,
    "Florida": 57,
    "Ole Miss": 145,
    "Missouri": 142,
    "Miami": 2390,
    "Boise State": 68,
    "Iowa": 2294,
    "Wisconsin": 275,
    "Utah": 254,
    "TCU": 2628,
    "Baylor": 239,
    "Kansas State": 2306,
    "Colorado": 38,
    "Arizona State": 9,
    "Indiana": 84,
    "BYU": 252,
    "Liberty": 2335,
    "Army": 349,
    "Navy": 2426,
    "SMU": 2567,
    "Louisville": 97,
    "North Carolina": 153,
    "Virginia Tech": 259,
    "Pitt": 221,
    "West Virginia": 277,
    "UCF": 2116,
    "Texas Tech": 2641,
    "Oklahoma State": 197,
    "Arkansas": 8,
    "Kentucky": 96,
    "South Carolina": 2579,
    "Vanderbilt": 238,
    "Nebraska": 158,
    "Minnesota": 135,
    "Illinois": 356,
    "Michigan State": 127,
    "UCLA": 26,
    "Iowa State": 66,
    "Cincinnati": 2132,
    "Memphis": 235,
    "Tulane": 2655,
    "UNLV": 2439,
    "Washington State": 265,
    "Oregon State": 204,
    "Georgia Tech": 59,
    "Duke": 150,
    "Northwestern": 77,
    "Purdue": 2509,
    "Rutgers": 164,
    "Maryland": 120,
    "California": 25,
    "Stanford": 24,
    "Arizona": 12,
    "Kansas": 2305,
    "Houston": 248,
    "James Madison": 256,
    "UConn": 41,
    "Connecticut": 41,
    "South Florida": 58,
    "Toledo": 2649,
    "Northern Illinois": 2459,
    "North Texas": 249,
    "San Diego State": 21,
    "Fresno State": 278,
    "App State": 2026,
    "Appalachian State": 2026,
    "Coastal Carolina": 324,
    "Marshall": 276,
    "Louisiana": 309,
    "Troy": 2653,
    "Western Kentucky": 98,
    "East Carolina": 151,
    "South Alabama": 2654,
    "Georgia Southern": 290,
    "Old Dominion": 295,
    "Buffalo": 2084,
    "Bowling Green": 189,
    "Ohio": 195,
    "Miami (OH)": 193,
    "Ball State": 2050,
    "Akron": 2006,
    "Central Michigan": 2117,
    "Eastern Michigan": 2199,
    "Western Michigan": 2711,
    "Air Force": 2005,
    "Colorado State": 36,
    "Wyoming": 2751,
    "Hawaii": 62,
    "Nevada": 2440,
    "San Jose State": 23,
    "New Mexico": 167,
    "Utah State": 328,
    "Florida Atlantic": 2226,
    "FIU": 2229,
    "Florida International": 2229,
    "Charlotte": 2429,
    "UTSA": 2636,
    "Rice": 242,
    "North Carolina State": 152,
    "NC State": 152,
    "Virginia": 258,
    "Boston College": 103,
    "Syracuse": 183,
    "Wake Forest": 154,
    "Mississippi State": 344,
    "Missouri State": 2623,
    "Kennesaw State": 338,
}

# Alternate CFBD / display names → canonical ESPN_TEAM_IDS key
TEAM_NAME_ALIASES: Dict[str, str] = {
    "UConn": "Connecticut",
    "Connecticut Huskies": "Connecticut",
    "James Madison Dukes": "James Madison",
    "App State": "Appalachian State",
    "FIU": "Florida International",
    "NC State": "North Carolina State",
    "Miami (FL)": "Miami",
}

MIN_FBS_ASSET_COUNT = 100


def espn_logo_url(espn_id: int) -> str:
    return f"https://a.espncdn.com/i/teamlogos/ncaa/500/{espn_id}.png"


@dataclass
class TeamAsset:
    cfbd_id: Optional[int] = None
    espn_id: Optional[int] = None
    abbreviation: str = ""
    conference: str = ""
    logo: Optional[str] = None
    logo_source: str = "placeholder"
    primary_color: str = "#667eea"
    secondary_color: str = "#333333"

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> TeamAsset:
        return cls(
            cfbd_id=data.get("cfbd_id"),
            espn_id=data.get("espn_id"),
            abbreviation=data.get("abbreviation", ""),
            conference=data.get("conference", ""),
            logo=data.get("logo"),
            logo_source=data.get("logo_source", "placeholder"),
            primary_color=data.get("primary_color", "#667eea"),
            secondary_color=data.get("secondary_color", "#333333"),
        )


_assets_cache: Optional[Dict[str, TeamAsset]] = None


def _parse_cache(raw: dict) -> Dict[str, TeamAsset]:
    return {name: TeamAsset.from_dict(data) for name, data in raw.items()}


def resolve_team_name_for_espn(team_name: str) -> str:
    """Map display/CFBD names to ESPN_TEAM_IDS keys."""
    if team_name in ESPN_TEAM_IDS:
        return team_name
    if team_name in TEAM_NAME_ALIASES:
        return TEAM_NAME_ALIASES[team_name]
    for key in ESPN_TEAM_IDS:
        if key.lower() == team_name.lower():
            return key
    return team_name


def load_team_assets(use_sample: bool = False) -> Dict[str, TeamAsset]:
    """Load team assets from cache file (live cache or sample)."""
    global _assets_cache
    if _assets_cache is not None and not use_sample:
        return _assets_cache

    if use_sample:
        if SAMPLE_CACHE_PATH.exists():
            with open(SAMPLE_CACHE_PATH) as f:
                return _parse_cache(json.load(f))
        return {}

    if CACHE_PATH.exists():
        with open(CACHE_PATH) as f:
            parsed = _parse_cache(json.load(f))
        _assets_cache = parsed
        return parsed

    return {}


def save_team_assets(assets: Dict[str, TeamAsset], path: Optional[Path] = None) -> Path:
    """Persist team assets to JSON cache."""
    global _assets_cache
    out = path or CACHE_PATH
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {name: asset.to_dict() for name, asset in assets.items()}
    with open(out, "w") as f:
        json.dump(payload, f, indent=2)
    if out == CACHE_PATH:
        _assets_cache = assets
    return out


def get_team_asset(team_name: str, use_sample: bool = False) -> Optional[TeamAsset]:
    """Look up cached team asset by school name."""
    assets = load_team_assets(use_sample=use_sample)
    if team_name in assets:
        return assets[team_name]

    for key, asset in assets.items():
        if key.lower() == team_name.lower():
            return asset

    return None


def clear_assets_cache() -> None:
    """Clear in-memory cache (for tests)."""
    global _assets_cache
    _assets_cache = None
