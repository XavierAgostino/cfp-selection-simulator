"""Logo lookup with CFBD → ESPN → placeholder fallbacks."""

from __future__ import annotations

from typing import Dict, Optional

import requests

from src.assets.colors import asset_from_espn_fallback
from src.assets.teams import (
    CACHE_PATH,
    MIN_FBS_ASSET_COUNT,
    TeamAsset,
    clear_assets_cache,
    espn_logo_url,
    get_team_asset,
    load_team_assets,
    save_team_assets,
)
from src.data.fetcher import get_api_key

# Minimal SVG placeholder (no external file committed)
_PLACEHOLDER_SVG = (
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'"
    "%3E%3Crect fill='%23e0e0e0' width='64' height='64' rx='8'/%3E"
    "%3Ctext x='32' y='38' text-anchor='middle' font-size='20' fill='%23666'%3E?%3C/text%3E%3C/svg%3E"
)


def placeholder_logo_url() -> str:
    return _PLACEHOLDER_SVG


def get_team_logo(team_name: str, use_sample: bool = False) -> Optional[str]:
    """
    Return logo URL for a team.

    Lookup order:
    1. Cached asset (CFBD or ESPN from team_assets.json / sample)
    2. ESPN fallback mapping
    3. Placeholder data URI
    """
    url = get_team_logo_url(team_name, use_sample=use_sample)
    if url is not None:
        return url
    return placeholder_logo_url()


def get_team_logo_url(team_name: str, use_sample: bool = False) -> Optional[str]:
    """
    Return a real logo URL for API exports (CFBD cache or ESPN CDN).

    Returns None when no URL is known so clients render initials instead of
    embedding placeholder data URIs in JSON payloads.
    """
    asset = get_team_asset(team_name, use_sample=use_sample)
    if asset and asset.logo:
        return asset.logo

    fallback = asset_from_espn_fallback(team_name)
    if fallback.logo:
        return fallback.logo

    return None


def _normalize_cfbd_team(raw: dict) -> Optional[TeamAsset]:
    school = raw.get("school")
    if not school:
        return None

    logos = raw.get("logos") or []
    logo_url = logos[0] if logos else None
    logo_source = "cfbd" if logo_url else "placeholder"

    espn_id = raw.get("espn_id")
    if not logo_url and espn_id:
        logo_url = espn_logo_url(int(espn_id))
        logo_source = "espn"

    color = raw.get("color") or ""
    alt = raw.get("alt_color") or raw.get("altColor") or ""
    primary = f"#{color}" if color and not color.startswith("#") else (color or "#667eea")
    secondary = f"#{alt}" if alt and not alt.startswith("#") else (alt or "#333333")

    return TeamAsset(
        cfbd_id=raw.get("id"),
        espn_id=int(espn_id) if espn_id is not None else None,
        abbreviation=raw.get("abbreviation") or "",
        conference=raw.get("conference") or "",
        logo=logo_url,
        logo_source=logo_source,
        primary_color=primary,
        secondary_color=secondary,
    )


def fetch_team_assets_from_cfbd(year: int, api_key: Optional[str] = None) -> Dict[str, TeamAsset]:
    """Fetch FBS team metadata from CFBD and build asset map."""
    key = api_key or get_api_key()
    url = "https://api.collegefootballdata.com/teams/fbs"
    headers = {"Authorization": f"Bearer {key}", "accept": "application/json"}
    response = requests.get(url, headers=headers, params={"year": year}, timeout=30)
    response.raise_for_status()

    assets: Dict[str, TeamAsset] = {}
    for raw in response.json():
        asset = _normalize_cfbd_team(raw)
        if not asset:
            continue
        if not asset.logo:
            espn_fb = asset_from_espn_fallback(raw["school"])
            if espn_fb.logo:
                asset.logo = espn_fb.logo
                asset.logo_source = "espn"
                asset.espn_id = espn_fb.espn_id
            if asset.primary_color == "#667eea" and espn_fb.primary_color != "#667eea":
                asset.primary_color = espn_fb.primary_color
        assets[raw["school"]] = asset

    return assets


def refresh_team_assets_cache(year: int, api_key: Optional[str] = None) -> Dict[str, TeamAsset]:
    """Fetch from CFBD and write data/cache/team_assets.json."""
    clear_assets_cache()
    assets = fetch_team_assets_from_cfbd(year, api_key=api_key)
    save_team_assets(assets, CACHE_PATH)
    return assets


def ensure_team_assets_loaded(use_sample: bool = False, year: int = 2025) -> Dict[str, TeamAsset]:
    """
    Load cached assets; if live cache is missing or incomplete, fetch from CFBD.
    """
    assets = load_team_assets(use_sample=use_sample)
    if use_sample:
        return assets

    if len(assets) >= MIN_FBS_ASSET_COUNT:
        return assets

    try:
        return refresh_team_assets_cache(year)
    except Exception:
        return assets
