"""
12-team CFP 5+7 playoff selection and bracket logic.

Implements:
- 5 automatic bids for highest-ranked conference champions
- 7 at-large bids
- Top 4 seeds receive first-round byes
- Fixed bracket (no reseeding)
- Tie-breaker logic
- Visual bracket display
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class PlayoffSelection:
    """Results of 12-team playoff selection."""
    playoff_teams: List[Dict]
    auto_bids: List[Dict]
    at_large_bids: List[Dict]
    displaced_team: Optional[Dict]
    champ_pulled_in: bool
    audit_log: List[str]


@dataclass
class BracketMatchup:
    """Single playoff matchup."""
    round: str
    game_num: int
    seed_high: int
    seed_low: int
    team_high: str
    team_low: str
    is_bye: bool
    host_team: Optional[str]
    location: str


def select_playoff_field(
    rankings_df: pd.DataFrame,
    conference_col: str = 'conference',
    conf_champ_col: str = 'conf_champ',
    n_auto_bids: int = 5,
    n_at_large: int = 7
) -> PlayoffSelection:
    """
    Select 12-team playoff field using 5+7 protocol.

    Protocol:
    1. Select 5 highest-ranked conference champions (automatic bids)
    2. Fill 7 at-large spots with next highest-ranked teams
    3. If a conference champion outside top 12 must be included,
       displace the lowest-ranked at-large team

    Parameters
    ----------
    rankings_df : DataFrame
        Must contain: 'rank', 'team', 'composite_score', conference_col, conf_champ_col
    conference_col : str
        Column name for conference
    conf_champ_col : str
        Column name for conference champion status
    n_auto_bids : int
        Number of automatic bids (default 5)
    n_at_large : int
        Number of at-large bids (default 7)

    Returns
    -------
    PlayoffSelection
        Complete selection results with audit trail
    """
    audit_log = []
    total_teams = n_auto_bids + n_at_large

    # Ensure dataframe is sorted by rank
    rankings_df = rankings_df.sort_values('rank').reset_index(drop=True)

    # Step 1: Identify all conference champions
    champs_df = rankings_df[rankings_df[conf_champ_col].str.contains("Yes", na=False)].copy()
    audit_log.append(f"Found {len(champs_df)} conference champions")

    if len(champs_df) < n_auto_bids:
        audit_log.append(f"WARNING: Only {len(champs_df)} champions found, need {n_auto_bids}")
        n_auto_bids = len(champs_df)
        n_at_large = total_teams - n_auto_bids

    # Step 2: Select top N conference champions for automatic bids
    auto_bid_teams = champs_df.head(n_auto_bids).to_dict('records')
    auto_bid_names = {team['team'] for team in auto_bid_teams}

    audit_log.append(f"\nAutomatic bids (top {n_auto_bids} conference champions):")
    for i, team in enumerate(auto_bid_teams, 1):
        audit_log.append(f"  {i}. #{team['rank']} {team['team']} ({team[conf_champ_col]})")

    # Step 3: Select at-large teams (highest-ranked non-auto-bid teams)
    eligible_at_large = rankings_df[~rankings_df['team'].isin(auto_bid_names)].copy()
    at_large_teams = eligible_at_large.head(n_at_large).to_dict('records')

    audit_log.append(f"\nAt-large bids ({n_at_large} spots):")
    for i, team in enumerate(at_large_teams, 1):
        audit_log.append(f"  {i}. #{team['rank']} {team['team']}")

    # Step 4: Check if any auto-bid team is outside top 12
    all_selected = auto_bid_teams + at_large_teams
    all_selected_sorted = sorted(all_selected, key=lambda x: x['rank'])

    champ_pulled_in = False
    displaced_team = None

    # Find if any champion is ranked below the 12th spot
    for team in auto_bid_teams:
        if team['rank'] > total_teams:
            champ_pulled_in = True
            # Find who got displaced (would have been last at-large)
            if len(at_large_teams) > 0:
                # The team that would have made it
                would_be_12th = eligible_at_large.iloc[n_at_large - 1] if len(eligible_at_large) > n_at_large else None
                if would_be_12th is not None:
                    displaced_team = would_be_12th.to_dict()
                    audit_log.append(f"\nCHAMPION PULLED IN: #{team['rank']} {team['team']}")
                    audit_log.append(f"DISPLACED: #{displaced_team['rank']} {displaced_team['team']}")
            break

    # Step 5: Final playoff field
    playoff_teams = all_selected_sorted[:total_teams]

    audit_log.append(f"\nFinal 12-team playoff field:")
    for i, team in enumerate(playoff_teams, 1):
        status = "AUTO" if team['team'] in auto_bid_names else "AT-LARGE"
        audit_log.append(f"  {i}. #{team['rank']} {team['team']} ({status})")

    return PlayoffSelection(
        playoff_teams=playoff_teams,
        auto_bids=auto_bid_teams,
        at_large_bids=at_large_teams,
        displaced_team=displaced_team,
        champ_pulled_in=champ_pulled_in,
        audit_log=audit_log
    )


def seed_playoff_teams(
    playoff_teams: List[Dict],
    auto_bid_teams: List[Dict]
) -> pd.DataFrame:
    """
    Seed 12-team playoff with top 4 conference champions receiving byes.

    Seeding rules:
    - Top 4 seeds: 4 highest-ranked conference champions (get byes)
    - Seeds 5-12: Remaining teams by composite rank

    Parameters
    ----------
    playoff_teams : list of dict
        12 playoff teams with rank and team info
    auto_bid_teams : list of dict
        Conference champion teams

    Returns
    -------
    DataFrame
        Seeded bracket with columns: seed, team, rank, conf_champ, is_bye
    """
    auto_bid_names = {team['team'] for team in auto_bid_teams}

    # Sort playoff teams by rank
    sorted_teams = sorted(playoff_teams, key=lambda x: x['rank'])

    # Identify top 4 conference champions for byes
    champs_in_playoff = [t for t in sorted_teams if t['team'] in auto_bid_names]
    top_4_champs = champs_in_playoff[:4]
    top_4_names = {t['team'] for t in top_4_champs}

    # Assign seeds 1-4 to top 4 champions
    seeded_teams = []
    seed = 1

    for team in top_4_champs:
        seeded_teams.append({
            'seed': seed,
            'team': team['team'],
            'rank': team['rank'],
            'wins': team.get('wins', 0),
            'losses': team.get('losses', 0),
            'conference': team.get('conference', ''),
            'conf_champ': team.get('conf_champ', ''),
            'is_bye': True,
            'composite_score': team.get('composite_score', 0.0)
        })
        seed += 1

    # Assign seeds 5-12 to remaining teams by rank
    remaining_teams = [t for t in sorted_teams if t['team'] not in top_4_names]

    for team in remaining_teams:
        is_champ = team['team'] in auto_bid_names
        seeded_teams.append({
            'seed': seed,
            'team': team['team'],
            'rank': team['rank'],
            'wins': team.get('wins', 0),
            'losses': team.get('losses', 0),
            'conference': team.get('conference', ''),
            'conf_champ': team.get('conf_champ', '') if is_champ else 'No',
            'is_bye': False,
            'composite_score': team.get('composite_score', 0.0)
        })
        seed += 1

    return pd.DataFrame(seeded_teams)


def create_bracket_matchups(
    seeded_df: pd.DataFrame
) -> Tuple[List[BracketMatchup], Dict[str, List[BracketMatchup]]]:
    """
    Create first-round matchups and complete bracket structure.

    First round (on campus):
    - 5 vs 12 (at 5's home field)
    - 6 vs 11 (at 6's home field)
    - 7 vs 10 (at 7's home field)
    - 8 vs 9 (at 8's home field)

    Quarterfinals (bowl games, no reseeding):
    - 1 vs winner of 8/9
    - 2 vs winner of 7/10
    - 3 vs winner of 6/11
    - 4 vs winner of 5/12

    Parameters
    ----------
    seeded_df : DataFrame
        Seeded teams with seed, team, is_bye columns

    Returns
    -------
    tuple
        (list of first-round matchups, dict of all rounds)
    """
    first_round = []
    all_rounds = {}

    # First round matchups
    matchups = [(5, 12), (6, 11), (7, 10), (8, 9)]

    for i, (seed_high, seed_low) in enumerate(matchups, 1):
        team_high = seeded_df[seeded_df['seed'] == seed_high].iloc[0]
        team_low = seeded_df[seeded_df['seed'] == seed_low].iloc[0]

        matchup = BracketMatchup(
            round="First Round",
            game_num=i,
            seed_high=seed_high,
            seed_low=seed_low,
            team_high=team_high['team'],
            team_low=team_low['team'],
            is_bye=False,
            host_team=team_high['team'],
            location=f"Campus of #{seed_high} seed"
        )
        first_round.append(matchup)

    all_rounds['first_round'] = first_round

    # Quarterfinals (placeholder - winners TBD)
    quarterfinals = []
    qf_matchups = [
        (1, "Winner 8/9", "8/9"),
        (2, "Winner 7/10", "7/10"),
        (3, "Winner 6/11", "6/11"),
        (4, "Winner 5/12", "5/12")
    ]

    for i, (seed, winner_label, game_ref) in enumerate(qf_matchups, 1):
        team_seed = seeded_df[seeded_df['seed'] == seed].iloc[0]

        matchup = BracketMatchup(
            round="Quarterfinals",
            game_num=i,
            seed_high=seed,
            seed_low=0,  # TBD
            team_high=team_seed['team'],
            team_low=winner_label,
            is_bye=False,
            host_team=None,
            location="Bowl Game (Neutral Site)"
        )
        quarterfinals.append(matchup)

    all_rounds['quarterfinals'] = quarterfinals

    return first_round, all_rounds


def visualize_bracket(
    seeded_df: pd.DataFrame,
    first_round: List[BracketMatchup],
    title: str = "College Football Playoff Bracket"
) -> str:
    """
    Create ASCII art visualization of playoff bracket.

    Parameters
    ----------
    seeded_df : DataFrame
        Seeded playoff teams
    first_round : list of BracketMatchup
        First round matchups
    title : str
        Bracket title

    Returns
    -------
    str
        ASCII art bracket
    """
    lines = []
    lines.append("=" * 80)
    lines.append(title.center(80))
    lines.append("=" * 80)
    lines.append("")

    # Byes (Seeds 1-4)
    lines.append("FIRST ROUND BYES:")
    lines.append("-" * 80)
    for _, team in seeded_df[seeded_df['is_bye'] == True].iterrows():
        lines.append(f"  Seed #{team['seed']}: {team['team']:<30} (Rank #{team['rank']})")
    lines.append("")

    # First Round Matchups
    lines.append("FIRST ROUND (On-Campus Sites):")
    lines.append("-" * 80)

    for matchup in first_round:
        lines.append(f"Game {matchup.game_num}:")
        lines.append(f"  Seed #{matchup.seed_high}: {matchup.team_high}")
        lines.append(f"    vs")
        lines.append(f"  Seed #{matchup.seed_low}: {matchup.team_low}")
        lines.append(f"  Location: {matchup.location}")
        lines.append("")

    # Quarterfinals Preview
    lines.append("QUARTERFINALS (Bowl Games, Neutral Sites):")
    lines.append("-" * 80)
    lines.append(f"  Seed #1 vs Winner of 8/9")
    lines.append(f"  Seed #2 vs Winner of 7/10")
    lines.append(f"  Seed #3 vs Winner of 6/11")
    lines.append(f"  Seed #4 vs Winner of 5/12")
    lines.append("")

    lines.append("=" * 80)
    lines.append("Note: Bracket does not reseed - winners advance to predetermined matchups")
    lines.append("=" * 80)

    return "\n".join(lines)


def visualize_bracket_html(
    seeded_df: pd.DataFrame,
    first_round: List[BracketMatchup]
) -> str:
    """
    Create HTML visualization of playoff bracket.

    Parameters
    ----------
    seeded_df : DataFrame
        Seeded playoff teams
    first_round : list of BracketMatchup
        First round matchups

    Returns
    -------
    str
        HTML bracket visualization
    """
    html = ["""
    <style>
        .bracket-container {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 20px auto;
            background: #f5f5f5;
            padding: 20px;
            border-radius: 10px;
        }
        .bracket-title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #333;
        }
        .bracket-round {
            margin-bottom: 30px;
        }
        .round-title {
            font-size: 18px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 2px solid #0066cc;
        }
        .matchup {
            background: white;
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .bye-team {
            background: #e8f4f8;
            border-left: 4px solid #0066cc;
        }
        .team-line {
            display: flex;
            align-items: center;
            padding: 8px;
            margin: 4px 0;
        }
        .seed {
            font-weight: bold;
            color: #0066cc;
            min-width: 50px;
        }
        .team-name {
            flex-grow: 1;
            font-weight: 600;
        }
        .rank-badge {
            background: #f0f0f0;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            color: #666;
        }
        .vs-text {
            text-align: center;
            color: #999;
            font-weight: bold;
            margin: 5px 0;
        }
        .location {
            font-size: 12px;
            color: #666;
            font-style: italic;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #eee;
        }
        .bracket-notes {
            margin-top: 20px;
            padding: 15px;
            background: #fff9e6;
            border-left: 4px solid #ffcc00;
            border-radius: 4px;
        }
    </style>
    """]

    html.append('<div class="bracket-container">')
    html.append('  <div class="bracket-title">College Football Playoff Bracket</div>')

    # Byes
    html.append('  <div class="bracket-round">')
    html.append('    <div class="round-title">FIRST ROUND BYES</div>')

    for _, team in seeded_df[seeded_df['is_bye'] == True].iterrows():
        html.append('    <div class="matchup bye-team">')
        html.append(f'      <div class="team-line">')
        html.append(f'        <span class="seed">Seed #{team["seed"]}</span>')
        html.append(f'        <span class="team-name">{team["team"]}</span>')
        html.append(f'        <span class="rank-badge">Rank #{team["rank"]}</span>')
        html.append(f'      </div>')
        html.append('    </div>')

    html.append('  </div>')

    # First Round
    html.append('  <div class="bracket-round">')
    html.append('    <div class="round-title">FIRST ROUND (On-Campus)</div>')

    for matchup in first_round:
        rank_high = seeded_df[seeded_df['seed'] == matchup.seed_high].iloc[0]['rank']
        rank_low = seeded_df[seeded_df['seed'] == matchup.seed_low].iloc[0]['rank']

        html.append('    <div class="matchup">')
        html.append(f'      <div class="team-line">')
        html.append(f'        <span class="seed">Seed #{matchup.seed_high}</span>')
        html.append(f'        <span class="team-name">{matchup.team_high}</span>')
        html.append(f'        <span class="rank-badge">Rank #{rank_high}</span>')
        html.append(f'      </div>')
        html.append('      <div class="vs-text">vs</div>')
        html.append(f'      <div class="team-line">')
        html.append(f'        <span class="seed">Seed #{matchup.seed_low}</span>')
        html.append(f'        <span class="team-name">{matchup.team_low}</span>')
        html.append(f'        <span class="rank-badge">Rank #{rank_low}</span>')
        html.append(f'      </div>')
        html.append(f'      <div class="location">📍 {matchup.location}</div>')
        html.append('    </div>')

    html.append('  </div>')

    # Quarterfinals Preview
    html.append('  <div class="bracket-round">')
    html.append('    <div class="round-title">QUARTERFINALS (Bowl Games)</div>')

    qf_matchups = [
        (1, "Winner of 8/9"),
        (2, "Winner of 7/10"),
        (3, "Winner of 6/11"),
        (4, "Winner of 5/12")
    ]

    for seed, winner_label in qf_matchups:
        team_data = seeded_df[seeded_df['seed'] == seed].iloc[0]
        html.append('    <div class="matchup">')
        html.append(f'      <div class="team-line">')
        html.append(f'        <span class="seed">Seed #{seed}</span>')
        html.append(f'        <span class="team-name">{team_data["team"]}</span>')
        html.append(f'        <span class="rank-badge">Rank #{team_data["rank"]}</span>')
        html.append(f'      </div>')
        html.append('      <div class="vs-text">vs</div>')
        html.append(f'      <div class="team-line">')
        html.append(f'        <span class="team-name">{winner_label}</span>')
        html.append(f'      </div>')
        html.append(f'      <div class="location">📍 Bowl Game (Neutral Site)</div>')
        html.append('    </div>')

    html.append('  </div>')

    # Notes
    html.append('  <div class="bracket-notes">')
    html.append('    <strong>Bracket Notes:</strong>')
    html.append('    <ul>')
    html.append('      <li>Top 4 seeds (conference champions) receive first-round byes</li>')
    html.append('      <li>Seeds 5-8 host first-round games on campus</li>')
    html.append('      <li>Bracket does not reseed - winners advance to predetermined matchups</li>')
    html.append('      <li>Quarterfinals and beyond played at neutral bowl game sites</li>')
    html.append('    </ul>')
    html.append('  </div>')

    html.append('</div>')

    return '\n'.join(html)


def apply_tiebreaker(
    team_a: Dict,
    team_b: Dict,
    games_df: pd.DataFrame,
    sos_ranks: Dict[str, int],
    sor_ranks: Dict[str, int],
    tolerance: float = 0.01
) -> Tuple[str, str]:
    """
    Apply committee-style tie-breaker logic.

    Tie-breaker order:
    1. Head-to-head result (if exists)
    2. Record vs common opponents
    3. SOS rank
    4. SOR rank
    5. Composite score (as final tiebreaker)

    Parameters
    ----------
    team_a : dict
        Team A data with 'team', 'composite_score'
    team_b : dict
        Team B data with 'team', 'composite_score'
    games_df : DataFrame
        All games data for head-to-head lookup
    sos_ranks : dict
        Team -> SOS rank
    sor_ranks : dict
        Team -> SOR rank
    tolerance : float
        Score difference threshold to trigger tiebreaker

    Returns
    -------
    tuple
        (winning team name, reason string)
    """
    team_a_name = team_a['team']
    team_b_name = team_b['team']
    score_diff = abs(team_a['composite_score'] - team_b['composite_score'])

    # If scores aren't close, no tiebreaker needed
    if score_diff >= tolerance:
        winner = team_a_name if team_a['composite_score'] > team_b['composite_score'] else team_b_name
        return winner, f"Composite score difference ({score_diff:.3f})"

    # Step 1: Head-to-head
    h2h_games = games_df[
        ((games_df['home_team'] == team_a_name) & (games_df['away_team'] == team_b_name)) |
        ((games_df['home_team'] == team_b_name) & (games_df['away_team'] == team_a_name))
    ]

    if not h2h_games.empty:
        # Find winner of head-to-head
        for _, game in h2h_games.iterrows():
            if game['home_score'] > game['away_score']:
                winner = game['home_team']
            else:
                winner = game['away_team']

            if winner in [team_a_name, team_b_name]:
                return winner, f"Head-to-head: {winner} defeated opponent"

    # Step 2: Common opponents (simplified - would need full implementation)
    # Skipping for now as it requires complex opponent analysis

    # Step 3: SOS rank
    sos_a = sos_ranks.get(team_a_name, 999)
    sos_b = sos_ranks.get(team_b_name, 999)

    if sos_a != sos_b:
        winner = team_a_name if sos_a < sos_b else team_b_name
        return winner, f"Strength of Schedule (SOS rank: {min(sos_a, sos_b)} vs {max(sos_a, sos_b)})"

    # Step 4: SOR rank
    sor_a = sor_ranks.get(team_a_name, 999)
    sor_b = sor_ranks.get(team_b_name, 999)

    if sor_a != sor_b:
        winner = team_a_name if sor_a < sor_b else team_b_name
        return winner, f"Strength of Record (SOR rank: {min(sor_a, sor_b)} vs {max(sor_a, sor_b)})"

    # Step 5: Final tiebreaker - composite score
    winner = team_a_name if team_a['composite_score'] > team_b['composite_score'] else team_b_name
    return winner, f"Composite score (marginal difference)"
