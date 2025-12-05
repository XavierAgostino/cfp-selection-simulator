# College Football Playoff Selection Simulator

[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> A data-driven ranking system providing transparent, reproducible analysis of college football team performance for playoff selection. This project implements an ensemble modeling approach combining multiple mathematical ranking methodologies to create an objective alternative to subjective committee decisions.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Problem Statement](#problem-statement)
- [Technical Approach](#technical-approach)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

### Prerequisites

- **Docker Desktop** (recommended) or Python 3.9+
- **Git** for version control
- **Make** (optional, for simplified commands)
- **CFBD API Key** - Get your free key at [CollegeFootballData.com](https://collegefootballdata.com/key)

### 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/cfp-selection-simulator.git
cd cfp-selection-simulator

# 2. Configure environment
cp .env.example .env
# Edit .env and add your CFBD_API_KEY

# 3. Start with Docker (recommended)
make setup
make start

# OR install locally
pip install -r requirements.txt
pip install -e ".[jupyter]"
jupyter lab
```

**Access Jupyter Lab**: Open [http://localhost:8888](http://localhost:8888)

### Quick Commands

| Command | Description |
|---------|-------------|
| `make setup` | One-time environment setup |
| `make start` | Start Jupyter Lab development environment |
| `make stop` | Stop all containers |
| `make status` | Check environment status |
| `make clean` | Clean up Docker resources |

---

## Features

### Core Capabilities

- **FBS-Only Analysis**: Automatic filtering for Football Bowl Subdivision teams
- **Multiple Ranking Systems**: Colley Matrix, Massey Ratings, Elo, Strength of Record
- **Ensemble Modeling**: Weighted combination of ranking methodologies
- **Playoff Selection**: Official CFP protocol with 12-team bracket generation
- **Historical Validation**: Backtesting against 2014-2023 CFP selections
- **Data Caching**: Reproducible analysis with persistent data storage
- **Docker Support**: Consistent environment across all platforms
- **Test Coverage**: pytest-based testing infrastructure

### Ranking Algorithms

| Algorithm | Purpose | Weight |
|-----------|---------|--------|
| **Colley Matrix** | Win-loss resume evaluation | 20% |
| **Massey Ratings** | Predictive power with MOV | 25% |
| **Elo System** | Dynamic game-by-game ratings | 20% |
| **Strength of Record** | Schedule difficulty analysis | 20% |
| **Win Percentage** | Raw performance metric | 15% |

### Data Quality Features

- FBS team validation via official API
- Margin of victory capping (28 points)
- Home field advantage adjustment (3.75 points)
- Temporal filtering (excludes weeks 0-4)
- Min-max normalization for fair weighting

---

## Problem Statement

The College Football Playoff selection process suffers from systematic issues affecting fairness and transparency:

### Identified Biases

| Bias Type | Description |
|-----------|-------------|
| **Recency Bias** | Late-season losses weighted disproportionately |
| **Institutional Bias** | Blue-blood programs favored over G5 schools |
| **Conference Favoritism** | Certain conferences preferred regardless of performance |
| **Inconsistent Criteria** | Selection standards shift week-to-week |
| **Decision Opacity** | Minimal explanation for controversial selections |

### Recent Controversies

- **2023**: Undefeated FSU excluded after conference championship win
- **2022**: 1-loss Alabama selected over 2-loss conference champions
- **2021**: Undefeated Cincinnati relegated to #4 seed
- **2020-2024**: Idle teams advancing without playing

**This simulator provides an objective, transparent alternative baseline for comparison.**

---

## Technical Approach

### Ensemble Methodology

```
Composite Score = α(Resume) + β(Power) + γ(Momentum) + δ(Difficulty)
```

This multi-faceted approach balances different evaluation philosophies:

- **Resume-Based**: How good is the team's win-loss record?
- **Power-Based**: How strong is the team fundamentally?
- **Momentum-Based**: How is performance trending over time?
- **Difficulty-Based**: How challenging was the schedule?

### Core Algorithms

#### 1. Colley Matrix Method
- Pure win-loss evaluation
- Linear algebra-based solution
- Historical BCS component
- Zero margin-of-victory influence

#### 2. Massey Rating System
- Incorporates point differential
- Home field advantage correction
- Least-squares optimization
- Predictive power focus

#### 3. Elo Rating System
- Game-by-game dynamic updates
- Season regression factors
- Expected win probability
- Temporal sensitivity

#### 4. Strength of Record (SOR)
- Schedule difficulty quantification
- Top-25 probability baseline
- Context-aware performance
- CFP committee alignment

### Mathematical Adjustments

```python
# Margin of Victory Capping
adjusted_mov = min(raw_mov, 28)

# Home Field Advantage
neutral_margin = margin - (3.75 if not neutral_site else 0)

# Normalization
normalized_score = (score - min_score) / (max_score - min_score)
```

---

## Installation

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/cfp-selection-simulator.git
cd cfp-selection-simulator

# Setup environment
cp .env.example .env
# Add your CFBD_API_KEY to .env

# Run Docker setup
make setup
make start
```

### Option 2: Local Python Environment

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install package in development mode
pip install -e ".[dev,jupyter]"

# Setup environment
cp .env.example .env
# Add your CFBD_API_KEY to .env

# Start Jupyter Lab
jupyter lab
```

### Option 3: Package Installation (Future)

```bash
# When published to PyPI
pip install cfp-selection-simulator
```

---

## Usage

### Jupyter Notebooks (Interactive Analysis)

#### For New Users - Guided Setup

Start with the configuration notebook to understand methodology and customize settings:

```bash
# Start Jupyter Lab
make start  # or: jupyter lab

# Open notebooks in order:
# 0. 00_configuration.ipynb      - Configure settings and learn methodology
# 1. 01_data_pipeline.ipynb      - Fetch FBS game data
# 2. 02_ranking_algorithms.ipynb - Generate rankings
# 3. 03_composite_rankings.ipynb - Create composite scores
# 4. 04_playoff_selection.ipynb  - Select playoff field
```

The configuration notebook (`00_configuration.ipynb`) provides:
- Interactive season year and week selection
- Detailed methodology explanations for all ranking algorithms
- Customizable ranking weights
- API connection validation
- Comprehensive workflow guide

#### For Experienced Users - Quick Analysis

```bash
# Streamlined analysis
# 6. 06_quick_simulator.ipynb    - All-in-one simulator
```

**Current Configuration**: 2025 season, Week 15, FBS teams only

**Methodology Reference**: See `docs/METHODOLOGY.md` for comprehensive algorithm documentation
### Python API (Programmatic Use)

```python
from src.data.fetcher import fetch_season_games, get_fbs_teams_list
import cfbd

# Configure API
configuration = cfbd.Configuration()
configuration.api_key['Authorization'] = f'Bearer {your_api_key}'
teams_api = cfbd.TeamsApi(cfbd.ApiClient(configuration))

# Fetch FBS teams
fbs_teams = get_fbs_teams_list(year=2025, teams_api=teams_api)

# Fetch season games
games_df = fetch_season_games(
    year=2025,
    start_week=5,
    fbs_teams=fbs_teams,
    api_key=your_api_key
)

print(f"Loaded {len(games_df)} FBS games")
```

### Command Line (Future Feature)

```bash
# Run complete simulation
cfp-simulator run --year 2025 --week 15

# Generate rankings only
cfp-simulator rank --year 2025 --week 15

# Validate against historical data
cfp-simulator validate --year 2023
```

---

## Project Structure

```
cfp-selection-simulator/
│
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD pipeline
│
├── bin/                        # Shell utility scripts
│   ├── cleanup.sh             # Cleanup Docker resources
│   ├── setup.sh               # One-time environment setup
│   ├── start.sh               # Start containers
│   ├── status.sh              # Check environment status
│   └── stop.sh                # Stop containers
│
├── data/                       # Data storage (gitignored)
│   └── cache/                 # Cached API responses
│
├── docker/                     # Docker configuration
│   ├── Dockerfile             # Production-grade container image
│   └── requirements.txt       # Python dependencies
│
├── docs/                       # Project documentation
│   ├── CHANGELOG.md           # Version history and release notes
│   ├── CONTRIBUTING.md        # Contribution guidelines
│   ├── DOCKER.md              # Docker documentation
│   └── README.md              # Documentation index
│
├── lib/                        # Shared shell utilities
│   └── utils.sh               # Common shell functions
│
├── notebooks/                  # Jupyter analysis notebooks
│   ├── README.md              # Notebook usage guide
│   ├── 01_data_pipeline.ipynb
│   ├── 02_ranking_algorithms.ipynb
│   ├── 03_composite_rankings.ipynb
│   ├── 04_playoff_selection.ipynb
│   ├── 05_validation_backtesting.ipynb
│   └── 06_quick_simulator.ipynb
│
├── scripts/                    # Python utility scripts
│   └── README.md              # Scripts documentation
│
├── src/                        # Source code package
│   ├── __init__.py            # Package initialization
│   ├── data/                  # Data fetching modules
│   │   ├── __init__.py
│   │   └── fetcher.py
│   ├── rankings/              # Ranking algorithm implementations
│   │   └── __init__.py
│   └── utils/                 # Utility functions
│       └── __init__.py
│
├── tests/                      # Test suite
│   ├── __init__.py
│   ├── conftest.py            # pytest fixtures and configuration
│   └── test_data_fetcher.py   # Data fetcher tests
│
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── .pre-commit-config.yaml    # Pre-commit hooks configuration
├── docker-compose.yml         # Docker orchestration
├── LICENSE                    # MIT License
├── Makefile                   # Command shortcuts
├── pyproject.toml             # Modern Python packaging config
├── README.md                  # This file
└── requirements.txt           # Python dependencies
```

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

### Quick Contribution Guide

```bash
# 1. Fork the repository
# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and test
pytest tests/
black src/ tests/
flake8 src/ tests/

# 4. Commit with conventional commits
git commit -m "feat: add new ranking algorithm"

# 5. Push and create PR
git push origin feature/your-feature-name
```

### Areas for Contribution

- **Algorithms**: Implement additional ranking systems (SRS, FPI, etc.)
- **Testing**: Expand test coverage (target: >80%)
- **Visualization**: Enhanced charts and interactive dashboards
- **Documentation**: Tutorials, API docs, architecture diagrams
- **Research**: Historical validation, bias analysis, optimization

### Code Quality Standards

- **Black** for code formatting (line length: 100)
- **isort** for import sorting
- **flake8** for linting
- **mypy** for type checking
- **pytest** for testing (>80% coverage target)

---

## Data Architecture

### Primary Data Source

**[CollegeFootballData.com API](https://collegefootballdata.com)**
- Comprehensive FBS data (2000-present)
- Real-time updates during season
- Advanced statistics (EPA, success rates)
- Free tier: 1000+ requests/hour

### Data Pipeline

```
API Request → FBS Filtering → Data Validation → Caching → Analysis
```

**Quality Assurance**:
- Automatic FBS team verification
- Score validation and error handling
- Persistent caching (parquet format)
- Reproducible analysis snapshots

---

## Validation & Accuracy

### Evaluation Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Spearman Correlation** | Ranking order alignment | > 0.85 |
| **Selection Accuracy** | Correctly identified playoff teams | > 90% |
| **Seeding Accuracy** | Correct bracket placement | > 75% |

### Historical Validation

Backtesting against **10 seasons** (2014-2023):
- 120 playoff selections
- 12 championship games
- Multiple controversial decisions

**Transparency Goal**: Identify and quantify systematic biases in committee selections.

---

## License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

**Key Points**:
- Free to use, modify, and distribute
- Commercial use permitted
- Attribution required
- No warranty provided

---

## Acknowledgments

- **CollegeFootballData.com** - Comprehensive data API
- **Dr. Wesley Colley** - Colley Matrix methodology
- **Dr. Kenneth Massey** - Massey Ratings system
- **Arpad Elo** - Elo rating framework
- **BCS Era Computer Rankings** - Historical inspiration

---

## Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/cfp-selection-simulator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/cfp-selection-simulator/discussions)
- **Email**: your.email@example.com (for private inquiries)

---

## Roadmap

### Version 1.x (Current - 2025 Season)

- [x] FBS-only data pipeline
- [x] Four ranking algorithms (Colley, Massey, Elo, SOR)
- [x] Ensemble methodology
- [x] 12-team playoff selection
- [x] Docker development environment
- [x] Comprehensive documentation

### Version 2.x (Planned - Spring 2025)

- [ ] Complete Python package (installable via pip)
- [ ] Expanded test coverage (>80%)
- [ ] Additional ranking algorithms (SRS, FPI, S&P+)
- [ ] Interactive web dashboard
- [ ] Automated weekly updates
- [ ] Conference championship predictions

### Version 3.x (Future - 2026 Season)

- [ ] Real-time rankings API
- [ ] Scenario simulation engine
- [ ] Machine learning optimization
- [ ] Mobile application
- [ ] Public data access
- [ ] Media integration toolkit

---

## Project Status

**Current Version**: 1.0.0
**Season**: 2025-2026 (Active Development)
**Last Updated**: December 2024
**Status**: [![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

---

## Disclaimer

This project is an **independent academic endeavor** not affiliated with:
- College Football Playoff (CFP)
- National Collegiate Athletic Association (NCAA)
- Any athletic conference or institution

**Purpose**: Provide transparent, objective analysis as a complementary tool to human judgment, not as a replacement for the official selection committee.

---

<div align="center">

**"In a sport where every game carries championship implications, selection decisions must be grounded in transparent, consistent methodology."**

Made with passion for college football analytics

</div>
