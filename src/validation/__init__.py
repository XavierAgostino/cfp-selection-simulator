"""
Validation and backtesting module for CFP Selection Simulator.
"""

from .backtest import (
    HISTORICAL_CFP_RANKINGS,
    calculate_seeding_accuracy,
    calculate_selection_accuracy,
    calculate_spearman_correlation,
    run_multiple_seasons_backtest,
    run_season_backtest,
)

__all__ = [
    "run_season_backtest",
    "run_multiple_seasons_backtest",
    "calculate_spearman_correlation",
    "calculate_selection_accuracy",
    "calculate_seeding_accuracy",
    "HISTORICAL_CFP_RANKINGS",
]
