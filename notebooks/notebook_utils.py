"""
Shared utilities for Jupyter notebooks.

This module provides common functionality to reduce code duplication across notebooks.
"""

import sys
import os
from pathlib import Path
from typing import Tuple
import pandas as pd


def setup_notebook_env() -> Path:
    """
    Configure notebook environment by adding src to Python path.

    Returns:
        Path: Repository root directory
    """
    notebook_dir = Path.cwd()
    repo_root = notebook_dir.parent if notebook_dir.name == 'notebooks' else notebook_dir
    src_path = str(repo_root)

    if src_path not in sys.path:
        sys.path.insert(0, src_path)

    return repo_root


def load_cached_games(year: int, week: int, cache_base: str = './data/cache') -> pd.DataFrame:
    """
    Load cached game data from parquet or CSV.

    Args:
        year: Season year
        week: Week number
        cache_base: Base cache directory path

    Returns:
        DataFrame with game data

    Raises:
        FileNotFoundError: If no cached data exists
    """
    cache_dir = Path(cache_base) / str(year)
    parquet_path = cache_dir / f'games_w{week}.parquet'
    csv_path = cache_dir / f'games_w{week}.csv'

    if parquet_path.exists():
        try:
            return pd.read_parquet(parquet_path)
        except (ImportError, ModuleNotFoundError):
            pass

    if csv_path.exists():
        return pd.read_csv(csv_path)

    raise FileNotFoundError(
        f'No cached data found for {year} week {week}. '
        'Run 01_data_pipeline.ipynb first.'
    )


def create_output_dirs(base_dir: str = './data/output') -> dict:
    """
    Create standardized output directory structure.

    Args:
        base_dir: Base output directory

    Returns:
        Dictionary of directory paths
    """
    base_path = Path(base_dir)

    dirs = {
        'base': base_path,
        'rankings': base_path / 'rankings',
        'brackets': base_path / 'brackets',
        'exports': base_path / 'exports',
        'visualizations': base_path / 'visualizations',
        'validation': base_path / 'validation'
    }

    for dir_path in dirs.values():
        dir_path.mkdir(parents=True, exist_ok=True)

    return dirs


def print_ranking_summary(df: pd.DataFrame, title: str, top_n: int = 25) -> None:
    """
    Print formatted ranking summary.

    Args:
        df: Rankings DataFrame with 'rank', 'team' columns
        title: Title for the summary
        top_n: Number of teams to display
    """
    print('=' * 80)
    print(title.center(80))
    print('=' * 80)
    print()

    display_cols = ['rank', 'team']
    if 'wins' in df.columns and 'losses' in df.columns:
        display_cols.extend(['wins', 'losses'])
    if 'composite_score' in df.columns:
        display_cols.append('composite_score')

    print(df[display_cols].head(top_n).to_string(index=False))
    print()


def validate_config(year: int, week: int) -> Tuple[bool, str]:
    """
    Validate configuration parameters.

    Args:
        year: Season year
        week: Week number

    Returns:
        Tuple of (is_valid, error_message)
    """
    if year < 2014 or year > 2030:
        return False, f"Year {year} out of valid range (2014-2030)"

    if week < 1 or week > 17:
        return False, f"Week {week} out of valid range (1-17)"

    if week < 5:
        return False, f"Week {week} too early for stable rankings (use week 5+)"

    return True, ""


def get_api_key_from_env() -> str:
    """
    Load and validate CFBD API key from environment.

    Returns:
        API key string

    Raises:
        ValueError: If API key not found or invalid
    """
    from dotenv import load_dotenv

    load_dotenv()
    api_key = os.getenv('CFBD_API_KEY')

    if not api_key:
        raise ValueError(
            'CFBD_API_KEY not found in environment. '
            'Please set it in your .env file.'
        )

    api_key = api_key.strip().strip('"').strip("'")

    if len(api_key) < 32:
        raise ValueError('CFBD_API_KEY appears invalid (too short)')

    return api_key
