"""Tests for sample fixture enrichment."""

import pandas as pd

from src.pipeline.sample import enrich_sample_rankings


def test_enrich_sample_rankings_marks_champions():
    rankings = pd.DataFrame(
        [
            {"rank": 1, "team": "Ohio State", "composite_score": 0.9},
            {"rank": 2, "team": "Georgia", "composite_score": 0.8},
            {"rank": 3, "team": "Alabama", "composite_score": 0.7},
        ]
    )
    enriched = enrich_sample_rankings(rankings)
    ohio = enriched[enriched["team"] == "Ohio State"].iloc[0]
    alabama = enriched[enriched["team"] == "Alabama"].iloc[0]
    assert "Yes" in ohio["conf_champ"]
    assert alabama["conf_champ"] == "No"
