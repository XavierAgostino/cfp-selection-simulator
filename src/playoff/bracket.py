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

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


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
    conference_col: str = "conference",
    conf_champ_col: str = "conf_champ",
    n_auto_bids: int = 5,
    n_at_large: int = 7,
    format_rules=None,
):
    """Select 12-team playoff field. Delegates to src.selection.field."""
    from src.selection.field import select_playoff_field as _select

    return _select(
        rankings_df,
        conference_col=conference_col,
        conf_champ_col=conf_champ_col,
        n_auto_bids=n_auto_bids,
        n_at_large=n_at_large,
        format_rules=format_rules,
    )


# Re-export for backward compatibility
from src.selection.field import PlayoffSelection  # noqa: E402


def seed_playoff_teams(
    playoff_teams: List[Dict],
    auto_bid_teams: List[Dict],
    format_rules=None,
) -> pd.DataFrame:
    """
    Seed 12-team playoff field using format-specific rules.

    When format_rules is omitted, defaults to 2024 champion-bye seeding for
    backward compatibility with existing notebooks.

    Parameters
    ----------
    playoff_teams : list of dict
        12 playoff teams with rank and team info
    auto_bid_teams : list of dict
        Conference champion teams
    format_rules : PlayoffFormat, optional
        CFP format rules. Use get_format_for_year(year) for season-specific rules.

    Returns
    -------
    DataFrame
        Seeded bracket with columns: seed, team, rank, conf_champ, is_bye
    """
    from src.selection.seeding import seed_playoff_teams as _seed_playoff_teams

    return _seed_playoff_teams(playoff_teams, auto_bid_teams, format_rules)


def create_bracket_matchups(
    seeded_df: pd.DataFrame,
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
        team_high = seeded_df[seeded_df["seed"] == seed_high].iloc[0]
        team_low = seeded_df[seeded_df["seed"] == seed_low].iloc[0]

        matchup = BracketMatchup(
            round="First Round",
            game_num=i,
            seed_high=seed_high,
            seed_low=seed_low,
            team_high=team_high["team"],
            team_low=team_low["team"],
            is_bye=False,
            host_team=team_high["team"],
            location=f"Campus of #{seed_high} seed",
        )
        first_round.append(matchup)

    all_rounds["first_round"] = first_round

    # Quarterfinals (placeholder - winners TBD)
    quarterfinals = []
    qf_matchups = [
        (1, "Winner 8/9", "8/9"),
        (2, "Winner 7/10", "7/10"),
        (3, "Winner 6/11", "6/11"),
        (4, "Winner 5/12", "5/12"),
    ]

    for i, (seed, winner_label, game_ref) in enumerate(qf_matchups, 1):
        team_seed = seeded_df[seeded_df["seed"] == seed].iloc[0]

        matchup = BracketMatchup(
            round="Quarterfinals",
            game_num=i,
            seed_high=seed,
            seed_low=0,  # TBD
            team_high=team_seed["team"],
            team_low=winner_label,
            is_bye=False,
            host_team=None,
            location="Bowl Game (Neutral Site)",
        )
        quarterfinals.append(matchup)

    all_rounds["quarterfinals"] = quarterfinals

    return first_round, all_rounds


def visualize_bracket(
    seeded_df: pd.DataFrame,
    first_round: List[BracketMatchup],
    title: str = "College Football Playoff Bracket",
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
    for _, team in seeded_df[seeded_df["is_bye"] == True].iterrows():
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


def visualize_bracket_html(seeded_df: pd.DataFrame, first_round: List[BracketMatchup]) -> str:
    """
    Create enhanced HTML visualization of playoff bracket with modern tournament-style layout.

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
    html = [
        """
    <style>
        * { box-sizing: border-box; }

        .bracket-container {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1400px;
            margin: 20px auto;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .bracket-header {
            text-align: center;
            margin-bottom: 30px;
            color: white;
        }

        .bracket-title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .bracket-subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
        }

        .bracket-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }

        .bracket-section {
            background: rgba(255,255,255,0.95);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 18px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .bye-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .bye-team {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .bye-team:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }

        .matchup {
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .matchup:hover {
            border-color: #667eea;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            transform: translateX(5px);
        }

        .team-line {
            display: flex;
            align-items: center;
            padding: 12px;
            margin: 4px 0;
            border-radius: 8px;
            background: #f8f9fa;
            transition: background 0.2s;
        }

        .team-line:hover {
            background: #e9ecef;
        }

        .seed {
            font-weight: bold;
            color: white;
            background: #667eea;
            min-width: 35px;
            height: 35px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(102, 126, 234, 0.3);
        }

        .team-info {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }

        .team-name {
            font-weight: 700;
            font-size: 16px;
            color: #2d3748;
            margin-bottom: 4px;
        }

        .team-details {
            display: flex;
            gap: 10px;
            font-size: 12px;
            color: #718096;
        }

        .record {
            font-weight: 600;
        }

        .conference {
            font-style: italic;
        }

        .rank-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .vs-divider {
            text-align: center;
            color: #cbd5e0;
            font-weight: bold;
            font-size: 14px;
            margin: 8px 0;
            position: relative;
        }

        .vs-divider::before,
        .vs-divider::after {
            content: '';
            position: absolute;
            top: 50%;
            width: 40%;
            height: 1px;
            background: #e2e8f0;
        }

        .vs-divider::before { left: 0; }
        .vs-divider::after { right: 0; }

        .location {
            font-size: 13px;
            color: #667eea;
            font-weight: 600;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 2px dashed #e2e8f0;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .bracket-notes {
            background: rgba(255,255,255,0.95);
            border-radius: 12px;
            padding: 20px;
            border-left: 5px solid #48bb78;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .bracket-notes strong {
            color: #2d3748;
            font-size: 16px;
            display: block;
            margin-bottom: 12px;
        }

        .bracket-notes ul {
            margin: 0;
            padding-left: 20px;
            color: #4a5568;
        }

        .bracket-notes li {
            margin-bottom: 8px;
            line-height: 1.6;
        }

        .champion-icon {
            display: inline-block;
            width: 18px;
            height: 18px;
            background: gold;
            border-radius: 50%;
            margin-right: 5px;
        }

        @media (max-width: 768px) {
            .bracket-grid {
                grid-template-columns: 1fr;
            }
            .bye-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
    """
    ]

    html.append('<div class="bracket-container">')

    # Header
    html.append('  <div class="bracket-header">')
    html.append('    <div class="bracket-title">🏆 College Football Playoff Bracket</div>')
    html.append(
        '    <div class="bracket-subtitle">12-Team Playoff • 5 Automatic Bids + 7 At-Large</div>'
    )
    html.append("  </div>")

    # Main grid with byes and first round
    html.append('  <div class="bracket-grid">')

    # Byes Section
    html.append('    <div class="bracket-section">')
    html.append('      <div class="section-title">⭐ First Round Byes</div>')
    html.append('      <div class="bye-grid">')

    for _, team in seeded_df[seeded_df["is_bye"] == True].iterrows():
        wins = int(team.get("wins", 0))
        losses = int(team.get("losses", 0))
        conf = team.get("conference", "N/A")

        html.append('        <div class="bye-team">')
        html.append('          <div class="team-line" style="background: transparent;">')
        html.append(
            f'            <div class="seed" style="background: rgba(255,255,255,0.3);">#{team["seed"]}</div>'
        )
        html.append('            <div class="team-info">')
        html.append(
            f'              <div class="team-name" style="color: white;">{team["team"]}</div>'
        )
        html.append(
            f'              <div class="team-details" style="color: rgba(255,255,255,0.9);">'
        )
        html.append(f'                <span class="record">{wins}-{losses}</span>')
        html.append(f"                <span>•</span>")
        html.append(f'                <span class="conference">{conf}</span>')
        html.append("              </div>")
        html.append("            </div>")
        html.append(
            f'            <div class="rank-badge" style="background: rgba(255,255,255,0.2);">Rank #{team["rank"]}</div>'
        )
        html.append("          </div>")
        html.append("        </div>")

    html.append("      </div>")
    html.append("    </div>")

    # First Round Section
    html.append('    <div class="bracket-section">')
    html.append('      <div class="section-title">🏈 First Round (On-Campus)</div>')

    for matchup in first_round:
        team_high = seeded_df[seeded_df["seed"] == matchup.seed_high].iloc[0]
        team_low = seeded_df[seeded_df["seed"] == matchup.seed_low].iloc[0]

        wins_high = int(team_high.get("wins", 0))
        losses_high = int(team_high.get("losses", 0))
        conf_high = team_high.get("conference", "N/A")

        wins_low = int(team_low.get("wins", 0))
        losses_low = int(team_low.get("losses", 0))
        conf_low = team_low.get("conference", "N/A")

        html.append('      <div class="matchup">')

        # Home team (higher seed)
        html.append('        <div class="team-line">')
        html.append(f'          <div class="seed">#{matchup.seed_high}</div>')
        html.append('          <div class="team-info">')
        html.append(f'            <div class="team-name">{matchup.team_high} 🏠</div>')
        html.append(f'            <div class="team-details">')
        html.append(f'              <span class="record">{wins_high}-{losses_high}</span>')
        html.append(f"              <span>•</span>")
        html.append(f'              <span class="conference">{conf_high}</span>')
        html.append("            </div>")
        html.append("          </div>")
        html.append(f'          <div class="rank-badge">Rank #{team_high["rank"]}</div>')
        html.append("        </div>")

        html.append('        <div class="vs-divider">VS</div>')

        # Away team (lower seed)
        html.append('        <div class="team-line">')
        html.append(f'          <div class="seed">#{matchup.seed_low}</div>')
        html.append('          <div class="team-info">')
        html.append(f'            <div class="team-name">{matchup.team_low}</div>')
        html.append(f'            <div class="team-details">')
        html.append(f'              <span class="record">{wins_low}-{losses_low}</span>')
        html.append(f"              <span>•</span>")
        html.append(f'              <span class="conference">{conf_low}</span>')
        html.append("            </div>")
        html.append("          </div>")
        html.append(f'          <div class="rank-badge">Rank #{team_low["rank"]}</div>')
        html.append("        </div>")

        html.append(f'        <div class="location">📍 {matchup.location}</div>')
        html.append("      </div>")

    html.append("    </div>")
    html.append("  </div>")  # End bracket-grid

    # Quarterfinals Section
    html.append('  <div class="bracket-section">')
    html.append('    <div class="section-title">🎯 Quarterfinals (Bowl Games)</div>')

    qf_matchups = [
        (1, "Winner of 8/9"),
        (2, "Winner of 7/10"),
        (3, "Winner of 6/11"),
        (4, "Winner of 5/12"),
    ]

    for seed, winner_label in qf_matchups:
        team_data = seeded_df[seeded_df["seed"] == seed].iloc[0]
        wins = int(team_data.get("wins", 0))
        losses = int(team_data.get("losses", 0))
        conf = team_data.get("conference", "N/A")

        html.append('    <div class="matchup">')
        html.append('      <div class="team-line">')
        html.append(f'        <div class="seed">#{seed}</div>')
        html.append('        <div class="team-info">')
        html.append(f'          <div class="team-name">{team_data["team"]}</div>')
        html.append(f'          <div class="team-details">')
        html.append(f'            <span class="record">{wins}-{losses}</span>')
        html.append(f"            <span>•</span>")
        html.append(f'            <span class="conference">{conf}</span>')
        html.append("          </div>")
        html.append("        </div>")
        html.append(f'        <div class="rank-badge">Rank #{team_data["rank"]}</div>')
        html.append("      </div>")
        html.append('      <div class="vs-divider">VS</div>')
        html.append('      <div class="team-line">')
        html.append('        <div class="team-info">')
        html.append(
            f'          <div class="team-name" style="color: #a0aec0;">{winner_label}</div>'
        )
        html.append("        </div>")
        html.append("      </div>")
        html.append('      <div class="location">📍 Bowl Game (Neutral Site)</div>')
        html.append("    </div>")

    html.append("  </div>")

    # Notes
    html.append('  <div class="bracket-notes">')
    html.append("    <strong>📋 Bracket Information</strong>")
    html.append("    <ul>")
    html.append(
        "      <li><strong>Automatic Bids:</strong> Top 5 highest-ranked conference champions receive automatic playoff berths</li>"
    )
    html.append(
        "      <li><strong>First-Round Byes:</strong> Top 4 conference champions (seeds 1-4) advance directly to quarterfinals</li>"
    )
    html.append(
        "      <li><strong>Home Field Advantage:</strong> Seeds 5-8 host first-round games on their campus</li>"
    )
    html.append(
        "      <li><strong>No Reseeding:</strong> Winners advance to predetermined quarterfinal matchups (fixed bracket)</li>"
    )
    html.append(
        "      <li><strong>Selection Protocol:</strong> Rankings based on composite model (50% Resume + 30% Predictive + 10% SOR + 10% SOS)</li>"
    )
    html.append("    </ul>")
    html.append("  </div>")

    html.append("</div>")

    return "\n".join(html)


def apply_tiebreaker(
    team_a: Dict,
    team_b: Dict,
    games_df: pd.DataFrame,
    sos_ranks: Dict[str, int],
    sor_ranks: Dict[str, int],
    tolerance: float = 0.01,
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
    team_a_name = team_a["team"]
    team_b_name = team_b["team"]
    score_diff = abs(team_a["composite_score"] - team_b["composite_score"])

    # If scores aren't close, no tiebreaker needed
    if score_diff >= tolerance:
        winner = (
            team_a_name if team_a["composite_score"] > team_b["composite_score"] else team_b_name
        )
        return winner, f"Composite score difference ({score_diff:.3f})"

    # Step 1: Head-to-head
    h2h_games = games_df[
        ((games_df["home_team"] == team_a_name) & (games_df["away_team"] == team_b_name))
        | ((games_df["home_team"] == team_b_name) & (games_df["away_team"] == team_a_name))
    ]

    if not h2h_games.empty:
        # Find winner of head-to-head
        for _, game in h2h_games.iterrows():
            if game["home_score"] > game["away_score"]:
                winner = game["home_team"]
            else:
                winner = game["away_team"]

            if winner in [team_a_name, team_b_name]:
                return winner, f"Head-to-head: {winner} defeated opponent"

    # Step 2: Common opponents (simplified - would need full implementation)
    # Skipping for now as it requires complex opponent analysis

    # Step 3: SOS rank
    sos_a = sos_ranks.get(team_a_name, 999)
    sos_b = sos_ranks.get(team_b_name, 999)

    if sos_a != sos_b:
        winner = team_a_name if sos_a < sos_b else team_b_name
        return (
            winner,
            f"Strength of Schedule (SOS rank: {min(sos_a, sos_b)} vs {max(sos_a, sos_b)})",
        )

    # Step 4: SOR rank
    sor_a = sor_ranks.get(team_a_name, 999)
    sor_b = sor_ranks.get(team_b_name, 999)

    if sor_a != sor_b:
        winner = team_a_name if sor_a < sor_b else team_b_name
        return winner, f"Strength of Record (SOR rank: {min(sor_a, sor_b)} vs {max(sor_a, sor_b)})"

    # Step 5: Final tiebreaker - composite score
    winner = team_a_name if team_a["composite_score"] > team_b["composite_score"] else team_b_name
    return winner, f"Composite score (marginal difference)"
