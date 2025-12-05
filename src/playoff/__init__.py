"""
College Football Playoff selection and bracket logic.
"""

from .bracket import (
    select_playoff_field,
    seed_playoff_teams,
    create_bracket_matchups,
    visualize_bracket,
    apply_tiebreaker
)

__all__ = [
    'select_playoff_field',
    'seed_playoff_teams',
    'create_bracket_matchups',
    'visualize_bracket',
    'apply_tiebreaker'
]
