"""Sample fixture loading and champion enrichment for demo mode."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLE_DIR = REPO_ROOT / "data" / "processed" / "sample"
SAMPLE_GAMES = SAMPLE_DIR / "sample_games.csv"
SAMPLE_CHAMPIONS = SAMPLE_DIR / "sample_champions.csv"


def enrich_sample_rankings(rankings_df: pd.DataFrame) -> pd.DataFrame:
    """Apply conference champion labels so demo mode produces realistic byes."""
    if not SAMPLE_CHAMPIONS.exists():
        return rankings_df

    champs = pd.read_csv(SAMPLE_CHAMPIONS)
    df = rankings_df.copy()
    if "conference" not in df.columns:
        df["conference"] = "Independent"
    if "conf_champ" not in df.columns:
        df["conf_champ"] = "No"

    champ_lookup = {
        str(row["team"]): (
            str(row["conference"]),
            str(row["conf_champ"]).lower() in ("true", "yes", "1"),
        )
        for _, row in champs.iterrows()
    }

    for idx, row in df.iterrows():
        team = str(row["team"])
        if team not in champ_lookup:
            continue
        conference, is_champ = champ_lookup[team]
        df.at[idx, "conference"] = conference
        df.at[idx, "conf_champ"] = f"Yes ({conference})" if is_champ else "No"

    return df
