"""
Validation and backtesting module for CFP Selection Simulator.
"""

from src.validation.backtest import (
    HISTORICAL_CFP_RANKINGS,
    run_era_validation,
    run_multiple_seasons_backtest,
    run_season_backtest,
    run_season_validation,
)
from src.validation.metrics import (
    calculate_seeding_accuracy,
    calculate_selection_accuracy,
    calculate_spearman_correlation,
)

__all__ = [
    "run_season_validation",
    "run_era_validation",
    "run_season_backtest",
    "run_multiple_seasons_backtest",
    "calculate_spearman_correlation",
    "calculate_selection_accuracy",
    "calculate_seeding_accuracy",
    "HISTORICAL_CFP_RANKINGS",
]
