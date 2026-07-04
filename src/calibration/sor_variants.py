"""SOR variant computation for the v2.4 research experiments.

Each variant is an alternate, research-only way to compute the SOR component
from the same season's games — no new data source, no network, fully
deterministic. The production method (``src.utils.metrics.calculate_sor``,
called from the ranking pipeline) is deliberately left untouched: variants are
implemented here as separate calculations so the production model cannot
change until the research board proves a variant safe.

Every variant changes exactly one assumption relative to the production SOR,
so a delta is attributable to that assumption alone:

- ``exact_poisson_binomial`` — replaces the averaged-win-probability binomial
  approximation (what production uses for every real CFB schedule, n <= 20
  games) with an exact O(n^2) dynamic-programming Poisson binomial. The
  averaged approximation erases the distribution of opponent difficulty —
  beating one elite and one weak opponent scores identically to beating two
  average ones; the exact computation restores that signal.
- ``home_field_adjustment`` — production SOR is venue-blind. This variant
  shifts the hypothetical top-25 team's per-game win probability by venue
  (home up, away down, neutral unchanged) using one documented rating-offset
  constant. The constant is a research assumption, not a definitive
  home-field value.
- ``opponent_rating_balanced`` / ``opponent_rating_predictive`` — production
  rates SOR opponents by a resume-tilted provisional composite
  (0.50 resume + 0.30 predictive), so the SOR pillar partially double-counts
  resume. These variants re-rate opponents with a balanced or
  predictive-leaning blend to audit that double-count.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from scipy.stats import binom

from src.validation.sensitivity import _minmax

# Mirror the production defaults in src.utils.metrics.calculate_sor.
BASELINE_RATING = 0.75
RATING_SCALE = 0.25

# Home-field rating offset (research assumption, deliberately easy to change).
# 0.033 on the 0-1 rating scale gives the hypothetical top-25 team a ~57.5%
# win probability at home against an equally rated opponent — a conventional
# ballpark for CFB home advantage, not a fitted or definitive constant.
HOME_FIELD_RATING_OFFSET = 0.033

# Opponent-rating blends: (resume_weight, predictive_weight). "baseline"
# mirrors the provisional composite the production pipeline uses to rate SOR
# opponents (src/pipeline/composite.py).
OPPONENT_RATING_BLENDS: Dict[str, Tuple[float, float]] = {
    "baseline": (0.50, 0.30),
    "balanced": (0.50, 0.50),
    "predictive_leaning": (0.30, 0.70),
}

SOR_VARIANT_IDS = (
    "exact_poisson_binomial",
    "home_field_adjustment",
    "opponent_rating_balanced",
    "opponent_rating_predictive",
)

# Which opponent-rating blend each variant uses; method-change variants keep
# the baseline blend so only one assumption moves at a time.
_VARIANT_BLENDS = {
    "exact_poisson_binomial": "baseline",
    "home_field_adjustment": "baseline",
    "opponent_rating_balanced": "balanced",
    "opponent_rating_predictive": "predictive_leaning",
}


def exact_poisson_binomial_sf(win_probs: Sequence[float], wins: int) -> float:
    """P(X >= wins) for independent games with distinct win probabilities.

    Exact O(n^2) dynamic programming over the game count — no exponential
    enumeration, no approximation. dp[k] is P(exactly k wins) after each game.
    """
    n = len(win_probs)
    if wins <= 0:
        return 1.0
    if wins > n:
        return 0.0
    dp = np.zeros(n + 1)
    dp[0] = 1.0
    for p in win_probs:
        dp[1:] = dp[1:] * (1.0 - p) + dp[:-1] * p
        dp[0] *= 1.0 - p
    return float(np.clip(dp[wins:].sum(), 0.0, 1.0))


def _win_probability(opponent_rating: float, venue_offset: float = 0.0) -> float:
    """Hypothetical top-25 team's win probability, mirroring calculate_sor."""
    rating_diff = BASELINE_RATING - float(opponent_rating) + venue_offset
    return float(1.0 / (1.0 + 10 ** (-rating_diff / RATING_SCALE)))


def _averaged_binomial_score(win_probs: List[float], wins: int) -> float:
    """Production SOR aggregation: binomial on the averaged win probability."""
    if not win_probs:
        return 0.0
    avg_prob = float(np.mean(win_probs))
    sor_prob = 1.0 - binom.cdf(wins - 1, len(win_probs), avg_prob)
    return float(-np.log10(max(sor_prob, 1e-10)))


def opponent_rating_lookup(
    base_rankings_df: pd.DataFrame, blend: str = "baseline"
) -> Dict[str, float]:
    """Min-max normalized opponent ratings from a resume/predictive blend."""
    if blend not in OPPONENT_RATING_BLENDS:
        raise ValueError(f"Unknown opponent-rating blend '{blend}'")
    resume_w, predictive_w = OPPONENT_RATING_BLENDS[blend]
    teams = base_rankings_df["team"].tolist()
    raw = resume_w * base_rankings_df["resume_score"].to_numpy(
        dtype=float
    ) + predictive_w * base_rankings_df["predictive_score"].to_numpy(dtype=float)
    normalized = _minmax(raw)
    return {team: float(normalized[i]) for i, team in enumerate(teams)}


def _team_schedule(games_df: pd.DataFrame, team: str) -> Tuple[List[Tuple[str, float]], int]:
    """(opponent, venue_offset) per game plus the team's win count.

    Venue is handled explicitly: home games get +HOME_FIELD_RATING_OFFSET,
    away games -HOME_FIELD_RATING_OFFSET, neutral-site games 0. If the games
    data has no ``neutral_site`` column, every game is treated as true
    home/away per the home_team/away_team fields.
    """
    has_neutral = "neutral_site" in games_df.columns
    team_games = games_df[(games_df["home_team"] == team) | (games_df["away_team"] == team)]
    schedule: List[Tuple[str, float]] = []
    wins = 0
    for _, game in team_games.iterrows():
        is_home = game["home_team"] == team
        opponent = game["away_team"] if is_home else game["home_team"]
        if has_neutral and bool(game["neutral_site"]):
            venue_offset = 0.0
        else:
            venue_offset = HOME_FIELD_RATING_OFFSET if is_home else -HOME_FIELD_RATING_OFFSET
        schedule.append((str(opponent), venue_offset))
        if is_home:
            wins += 1 if game["home_score"] > game["away_score"] else 0
        else:
            wins += 1 if game["away_score"] > game["home_score"] else 0
    return schedule, wins


def compute_sor_variant_scores(
    games_df: pd.DataFrame,
    base_rankings_df: pd.DataFrame,
    variant_id: str,
) -> Dict[str, float]:
    """SOR scores for every ranked team under one variant calculation."""
    if variant_id not in SOR_VARIANT_IDS:
        raise ValueError(f"Unknown SOR variant '{variant_id}'; expected one of {SOR_VARIANT_IDS}")
    ratings = opponent_rating_lookup(base_rankings_df, _VARIANT_BLENDS[variant_id])
    use_venue = variant_id == "home_field_adjustment"

    scores: Dict[str, float] = {}
    for team in base_rankings_df["team"].tolist():
        schedule, wins = _team_schedule(games_df, team)
        if not schedule:
            scores[team] = 0.0
            continue
        win_probs = [
            _win_probability(
                ratings.get(opponent, 0.5),
                venue_offset if use_venue else 0.0,
            )
            for opponent, venue_offset in schedule
        ]
        if variant_id == "exact_poisson_binomial":
            sf = exact_poisson_binomial_sf(win_probs, wins)
            scores[team] = float(-np.log10(max(sf, 1e-10)))
        else:
            scores[team] = _averaged_binomial_score(win_probs, wins)
    return scores


def apply_sor_variant(
    base_rankings_df: pd.DataFrame,
    sor_scores: Optional[Dict[str, float]],
) -> Tuple[Optional[pd.DataFrame], str]:
    """Swap the SOR column for variant scores; degrade explicitly on gaps.

    Mirrors apply_ppa_substitution: if any ranked team lacks a variant score,
    the whole season is unavailable for the experiment — never partially or
    silently filled.
    """
    if not sor_scores:
        return None, "SOR variant unavailable: no variant scores for this season."
    teams = base_rankings_df["team"].tolist()
    missing = [team for team in teams if team not in sor_scores]
    if missing:
        preview = ", ".join(sorted(missing)[:5])
        suffix = "" if len(missing) <= 5 else f", … ({len(missing) - 5} more)"
        return None, (
            f"SOR variant unavailable: missing variant SOR for {len(missing)} of "
            f"{len(teams)} ranked teams ({preview}{suffix})."
        )
    df = base_rankings_df.copy()
    df["sor"] = [float(sor_scores[team]) for team in teams]
    return df, ""
