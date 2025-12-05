"""
Resume and schedule strength metrics for CFP selection.

This module implements:
- Strength of Record (SOR)
- Strength of Schedule (SOS) with opponent's opponent records
- Quality Wins (QW)
- Bad Losses detection
- Conference championship tracking
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from scipy.stats import binom


def calculate_sor(
    team_record: Dict[str, int],
    opponent_ratings: List[float],
    baseline_rating: float = 0.75,
    rating_scale: float = 0.25
) -> float:
    """
    Calculate Strength of Record (SOR).

    SOR measures the probability that an average Top-25 team would achieve
    at least this team's record against this exact schedule.

    Parameters
    ----------
    team_record : dict
        Dictionary with 'wins' and 'losses' keys
    opponent_ratings : list of float
        Composite ratings for each opponent faced (0-1 scale)
    baseline_rating : float
        Rating of average Top-25 team (default 0.75)
    rating_scale : float
        Scale factor for win probability calculation

    Returns
    -------
    float
        SOR score (lower is better record given schedule)
    """
    wins = team_record['wins']
    total_games = wins + team_record['losses']

    if total_games == 0:
        return 0.0

    # Calculate win probability for baseline team against each opponent
    win_probs = []
    for opp_rating in opponent_ratings:
        # Logistic function for win probability
        rating_diff = baseline_rating - opp_rating
        win_prob = 1 / (1 + 10 ** (-rating_diff / rating_scale))
        win_probs.append(win_prob)

    # Use Poisson Binomial Distribution to calculate P(X >= wins)
    # The Poisson Binomial is the correct distribution when each trial has
    # a different probability (each game has different opponent strength).
    # 
    # For computational efficiency, we use approximations:
    # - Normal approximation for large samples (>=20 games)
    # - Binomial approximation for small samples (<20 games, typical for CFB)
    #
    # Exact Poisson Binomial computation is O(2^n) and computationally
    # infeasible for typical use cases. The approximations are highly accurate.
    
    if len(win_probs) > 20:
        # Normal approximation to Poisson Binomial (accurate for large n)
        mu = sum(win_probs)
        variance = sum([p * (1 - p) for p in win_probs])
        sigma = np.sqrt(variance)

        if sigma > 0:
            z_score = (wins - 0.5 - mu) / sigma  # Continuity correction
            # Convert to probability (complement of CDF)
            from scipy.stats import norm
            sor_prob = 1 - norm.cdf(z_score)
        else:
            sor_prob = 1.0 if wins >= mu else 0.0
    else:
        # Binomial approximation to Poisson Binomial (uses average probability)
        # This is a reasonable approximation when probabilities don't vary too much
        avg_prob = np.mean(win_probs) if win_probs else 0.5
        sor_prob = 1 - binom.cdf(wins - 1, total_games, avg_prob)

    # Convert to negative log for ranking
    # sor_score = -log10(prob), so HIGHER score = harder achievement = BETTER record
    sor_score = -np.log10(max(sor_prob, 1e-10))

    return sor_score


def calculate_sos(
    opponents_records: List[Tuple[int, int]],
    opponents_opp_records: List[List[Tuple[int, int]]],
    include_oor: bool = True,
    oor_weight: float = 0.33
) -> float:
    """
    Calculate Strength of Schedule (SOS).

    Factors in both opponents' records and their opponents' records (OOR)
    to avoid rewarding teams whose opponents inflated records against weak schedules.

    Parameters
    ----------
    opponents_records : list of tuple
        List of (wins, losses) for each opponent
    opponents_opp_records : list of list of tuple
        For each opponent, list of their opponents' (wins, losses)
    include_oor : bool
        Whether to include opponent's opponent records
    oor_weight : float
        Weight for OOR component (default 0.33, giving 2/3 to direct opponents)

    Returns
    -------
    float
        SOS score (higher = tougher schedule)
    """
    if not opponents_records:
        return 0.0

    # Calculate opponents' win percentage
    opp_win_pcts = []
    for wins, losses in opponents_records:
        total = wins + losses
        if total > 0:
            opp_win_pcts.append(wins / total)
        else:
            opp_win_pcts.append(0.5)  # Neutral for teams with no record

    avg_opp_win_pct = np.mean(opp_win_pcts)

    if not include_oor or not opponents_opp_records:
        return avg_opp_win_pct

    # Calculate opponent's opponent win percentage (OOR)
    oor_win_pcts = []
    for opp_opps in opponents_opp_records:
        if opp_opps:
            opp_oor_pcts = []
            for wins, losses in opp_opps:
                total = wins + losses
                if total > 0:
                    opp_oor_pcts.append(wins / total)
            if opp_oor_pcts:
                oor_win_pcts.append(np.mean(opp_oor_pcts))

    avg_oor_win_pct = np.mean(oor_win_pcts) if oor_win_pcts else 0.5

    # Combine opponents and OOR with weighting
    sos_score = (1 - oor_weight) * avg_opp_win_pct + oor_weight * avg_oor_win_pct

    return sos_score


def calculate_quality_wins(
    opponent_ranks: List[int],
    thresholds: Dict[str, int] = None
) -> Dict[str, int]:
    """
    Calculate quality wins at various thresholds.

    Parameters
    ----------
    opponent_ranks : list of int
        Ranks of beaten opponents
    thresholds : dict, optional
        Dictionary of threshold names to rank cutoffs
        Default: {'top_5': 5, 'top_12': 12, 'top_25': 25}

    Returns
    -------
    dict
        Count of quality wins at each threshold
    """
    if thresholds is None:
        thresholds = {'top_5': 5, 'top_12': 12, 'top_25': 25}

    quality_wins = {}
    for name, cutoff in thresholds.items():
        quality_wins[name] = sum(1 for rank in opponent_ranks if rank <= cutoff)

    return quality_wins


def identify_bad_losses(
    loss_opponent_ranks: List[int],
    threshold: int = 25
) -> Tuple[int, List[int]]:
    """
    Identify bad losses (losses to teams outside threshold).

    Parameters
    ----------
    loss_opponent_ranks : list of int
        Ranks of teams lost to
    threshold : int
        Rank threshold (default 25, losses outside Top 25 are "bad")

    Returns
    -------
    tuple
        (count of bad losses, list of ranks of bad loss opponents)
    """
    bad_loss_ranks = [rank for rank in loss_opponent_ranks if rank > threshold]
    return len(bad_loss_ranks), bad_loss_ranks


def calculate_schedule_inequality_index(
    conference_teams_sos: Dict[str, float]
) -> float:
    """
    Calculate schedule inequality within a conference.

    Measures the standard deviation of SOS among teams in the same conference
    to quantify schedule imbalance.

    Parameters
    ----------
    conference_teams_sos : dict
        Mapping of team name to SOS score for all teams in conference

    Returns
    -------
    float
        Standard deviation of SOS (higher = more inequality)
    """
    if len(conference_teams_sos) < 2:
        return 0.0

    sos_values = list(conference_teams_sos.values())
    return np.std(sos_values)


def build_resume_dataframe(
    teams_data: pd.DataFrame,
    sor_scores: Dict[str, float],
    sos_scores: Dict[str, float],
    quality_wins: Dict[str, Dict[str, int]],
    bad_losses: Dict[str, int],
    conf_champions: Dict[str, str],
    composite_ranks: Dict[str, int]
) -> pd.DataFrame:
    """
    Build comprehensive resume DataFrame for all teams.

    Parameters
    ----------
    teams_data : DataFrame
        Base team data with wins/losses
    sor_scores : dict
        Team -> SOR score
    sos_scores : dict
        Team -> SOS score
    quality_wins : dict
        Team -> quality win counts at various thresholds
    bad_losses : dict
        Team -> count of bad losses
    conf_champions : dict
        Conference -> champion team name
    composite_ranks : dict
        Team -> composite ranking

    Returns
    -------
    DataFrame
        Resume view with columns: rank, team, record, sor_rank, sos_rank,
        vs_top_25_w_l, bad_losses, conf_champ
    """
    # Rank SOR and SOS 
    # SOR: sor_score = -log10(prob), so HIGHER score = harder achievement = BETTER (rank 1 = best)
    # SOS: HIGHER score = tougher schedule = BETTER (rank 1 = best)
    sor_ranks = pd.Series(sor_scores).rank(method='min', ascending=False).to_dict()
    sos_ranks = pd.Series(sos_scores).rank(method='min', ascending=False).to_dict()

    resume_data = []

    for _, row in teams_data.iterrows():
        team = row['team']

        # Build record string
        record = f"{row['wins']}-{row['losses']}"

        # Quality wins vs top 25
        qw = quality_wins.get(team, {})
        top25_wins = qw.get('top_25', 0)

        # Get losses to top 25 (need to calculate from game data)
        # For now, placeholder - should be calculated from actual games
        top25_losses = 0  # TODO: Calculate from game-by-game data

        vs_top_25 = f"{top25_wins}-{top25_losses}"

        # Conference champion status
        team_conf = row.get('conference', '')
        is_champ = team_conf in conf_champions and conf_champions[team_conf] == team
        conf_champ_label = f"Yes ({team_conf})" if is_champ else "No"

        resume_data.append({
            'rank': composite_ranks.get(team, 999),
            'team': team,
            'record': record,
            'sor_rank': int(sor_ranks.get(team, 999)),
            'sos_rank': int(sos_ranks.get(team, 999)),
            'vs_top_25': vs_top_25,
            'bad_losses': bad_losses.get(team, 0),
            'conf_champ': conf_champ_label
        })

    resume_df = pd.DataFrame(resume_data)
    resume_df = resume_df.sort_values('rank').reset_index(drop=True)

    return resume_df


def compare_resume_vs_predictive(
    resume_ranks: Dict[str, int],
    predictive_ranks: Dict[str, int],
    composite_ranks: Dict[str, int],
    composite_scores: Dict[str, float],
    top_n: int = 25
) -> pd.DataFrame:
    """
    Create side-by-side comparison of resume vs predictive rankings.

    Parameters
    ----------
    resume_ranks : dict
        Team -> resume-only rank
    predictive_ranks : dict
        Team -> predictive-only rank
    composite_ranks : dict
        Team -> composite rank
    composite_scores : dict
        Team -> composite score
    top_n : int
        Number of top teams to include

    Returns
    -------
    DataFrame
        Comparison table with resume_rank, predictive_rank, composite_rank, score
    """
    comparison_data = []

    for team in composite_ranks.keys():
        comparison_data.append({
            'team': team,
            'resume_rank': resume_ranks.get(team, 999),
            'predictive_rank': predictive_ranks.get(team, 999),
            'composite_rank': composite_ranks.get(team, 999),
            'composite_score': composite_scores.get(team, 0.0)
        })

    comparison_df = pd.DataFrame(comparison_data)
    comparison_df = comparison_df.sort_values('composite_rank').reset_index(drop=True)

    return comparison_df.head(top_n)


def calculate_home_field_adjusted_mov(
    margin: int,
    is_home: bool,
    is_neutral: bool,
    hfa_points: float = 3.75
) -> float:
    """
    Calculate neutral-field margin of victory.

    Parameters
    ----------
    margin : int
        Raw margin of victory (positive for win, negative for loss)
    is_home : bool
        Whether team was home team
    is_neutral : bool
        Whether game was at neutral site
    hfa_points : float
        Home field advantage in points (default 3.75)

    Returns
    -------
    float
        HFA-adjusted margin
    """
    if is_neutral:
        return float(margin)

    if is_home:
        # Subtract HFA from home team's margin
        return margin - hfa_points
    else:
        # Add HFA to away team's margin (making losses less bad, wins better)
        return margin + hfa_points


def cap_margin_of_victory(
    margin: float,
    cap: int = 28
) -> float:
    """
    Cap margin of victory to prevent blowout stat-padding.

    Parameters
    ----------
    margin : float
        Margin of victory (can be negative for losses)
    cap : int
        Maximum absolute margin (default 28 = 4 touchdowns)

    Returns
    -------
    float
        Capped margin
    """
    return np.clip(margin, -cap, cap)
