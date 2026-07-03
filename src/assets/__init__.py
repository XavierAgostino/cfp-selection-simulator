"""Team identity, logos, and colors for web and export visuals."""

from src.assets.colors import get_primary_color, get_team_colors
from src.assets.logos import get_team_logo, placeholder_logo_url
from src.assets.teams import TeamAsset, get_team_asset, load_team_assets, save_team_assets

__all__ = [
    "TeamAsset",
    "get_team_asset",
    "get_team_logo",
    "get_primary_color",
    "get_team_colors",
    "load_team_assets",
    "placeholder_logo_url",
    "save_team_assets",
]
