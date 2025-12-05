"""
College Football Playoff selection and bracket logic.
"""

from .bracket import (
    apply_tiebreaker,
    create_bracket_matchups,
    seed_playoff_teams,
    select_playoff_field,
    visualize_bracket,
)

__all__ = [
    "select_playoff_field",
    "seed_playoff_teams",
    "create_bracket_matchups",
    "visualize_bracket",
    "apply_tiebreaker",
]
