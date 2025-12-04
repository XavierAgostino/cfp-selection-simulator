# Contributing to CFP Selection Simulator

Thank you for your interest in contributing to the CFP Selection Simulator! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

This project adheres to a code of professional conduct. By participating, you are expected to uphold this standard:

- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility and learn from mistakes
- Prioritize the community's best interests

## Getting Started

### Prerequisites

- Python 3.9 or higher
- Docker Desktop (for containerized development)
- Git
- CollegeFootballData.com API key (free tier)

### Setup Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cfp-selection-simulator.git
   cd cfp-selection-simulator
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env and add your CFBD_API_KEY
   ```

3. **Using Docker (Recommended)**
   ```bash
   make setup
   make start
   ```

4. **Using Local Python Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   pip install -e ".[dev]"
   ```

## Development Workflow

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/improvements

Example: `feature/add-elo-decay` or `fix/colley-matrix-singularity`

### Making Changes

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, self-documenting code
   - Add/update tests as needed
   - Update documentation

3. **Test your changes**
   ```bash
   pytest tests/
   ```

4. **Format your code**
   ```bash
   black src/ tests/
   isort src/ tests/
   flake8 src/ tests/
   ```

## Coding Standards

### Python Style Guide

- Follow PEP 8 guidelines
- Use type hints where appropriate
- Maximum line length: 100 characters
- Use Black for formatting
- Use isort for import sorting

### Documentation

- All public functions/classes must have docstrings
- Use Google-style docstrings
- Update README.md for user-facing changes
- Add inline comments for complex logic

### Example Function

```python
def calculate_colley_rating(games_df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate Colley Matrix rankings for teams.

    Args:
        games_df: DataFrame containing game results with columns:
            - home_team: Home team name
            - away_team: Away team name
            - home_score: Home team score
            - away_score: Away team score

    Returns:
        DataFrame with columns:
            - team: Team name
            - colley_rating: Colley rating (higher is better)

    Raises:
        ValueError: If games_df is empty or missing required columns

    Example:
        >>> games = pd.DataFrame([...])
        >>> ratings = calculate_colley_rating(games)
    """
    # Implementation...
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_data_fetcher.py

# Run tests matching pattern
pytest -k "test_colley"
```

### Writing Tests

- Place tests in `tests/` directory
- Use descriptive test names: `test_colley_matrix_handles_undefeated_teams`
- Use fixtures for common test data (see `tests/conftest.py`)
- Aim for >80% code coverage

## Submitting Changes

### Pull Request Process

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure all tests pass**
   ```bash
   pytest
   black --check src/ tests/
   flake8 src/ tests/
   ```

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add description of changes"
   ```

   **Commit Message Format:**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation only
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Adding/updating tests
   - `chore:` Maintenance tasks

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to GitHub and create a PR from your fork
   - Fill out the PR template completely
   - Link any related issues
   - Request review from maintainers

### PR Review Criteria

- Code follows project style guidelines
- All tests pass
- New features have tests
- Documentation is updated
- No merge conflicts
- Changes are focused and atomic

## Areas for Contribution

### High Priority

- **Additional Ranking Algorithms**: Implement new ranking systems
- **Historical Validation**: Expand backtesting to more seasons
- **Performance Optimization**: Improve data processing speed
- **Visualization Enhancement**: Better charts and interactive plots

### Documentation

- Tutorial notebooks
- API documentation
- Architecture diagrams
- Use case examples

### Testing

- Unit test coverage
- Integration tests
- Performance benchmarks

## Questions?

- Open an issue for bug reports or feature requests
- Tag issues with appropriate labels
- Be patient - maintainers are volunteers

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

Thank you for contributing to make college football analysis more transparent and objective!
