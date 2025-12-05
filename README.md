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
git clone https://github.com/XavierAgostino/cfp-selection-simulator.git
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

- **Resume vs Predictive Split**: Clear separation of accomplishment from power ratings
- **FBS-Only Analysis**: Automatic filtering for Football Bowl Subdivision teams
- **Comprehensive Metrics**: SOR, SOS (with OOR), quality wins, bad losses
- **12-Team Playoff Protocol**: Official 5+7 selection with visual bracket display
- **Team Resume Sheets**: CFP committee-style detailed team analysis
- **Historical Validation**: Backtesting against 2014-2023 CFP selections
- **Tie-Breaker Logic**: Committee-style stepwise decision traces
- **Data Caching**: Reproducible analysis with persistent data storage
- **Docker Support**: Consistent environment across all platforms

### Resume vs Predictive Rankings

This simulator implements a critical separation between what teams have **accomplished** (resume) and how **good** they are (predictive power):

**Resume Rankings** - What you've done:
- Colley Matrix (win/loss only, no MOV)
- Win Percentage
- Strength of Record (SOR) - record quality given schedule
- Strength of Schedule (SOS) - opponent difficulty including OOR
- Quality Wins - victories vs Top 5/12/25 teams
- Bad Losses - defeats to teams outside Top 25

**Predictive Rankings** - How good you are:
- Massey Ratings (MOV-capped at 28 points, HFA-adjusted)
- Elo System (dynamic game-by-game updates)
- Efficiency metrics (predictive power for future games)

**Composite Rankings** - Balanced combination:
- Weighted blend of resume + predictive components
- No double-counting of schedule strength
- Configurable weights via `00_configuration.ipynb`

### Ranking Algorithms

| Algorithm | Type | Purpose | Effective Weight |
|-----------|------|---------|------------------|
| **Colley Matrix** | Resume | Win-loss evaluation (no MOV) | 30% (60% of 50%) |
| **Win Percentage** | Resume | Raw performance baseline | 20% (40% of 50%) |
| **Massey Ratings** | Predictive | Power with capped MOV | 15% (50% of 30%) |
| **Elo System** | Predictive | Dynamic game ratings | 15% (50% of 30%) |
| **Strength of Record** | Context | Schedule-adjusted wins | 10% |
| **Strength of Schedule** | Context | Opponent quality (with OOR) | 10% |

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
Composite Score = 0.50×Resume + 0.30×Predictive + 0.10×SOR + 0.10×SOS

Where:
  Resume = 0.60×Colley + 0.40×WinPct
  Predictive = 0.50×Massey + 0.50×Elo
  SOR = Strength of Record (schedule-adjusted accomplishment)
  SOS = Strength of Schedule (opponent quality with OOR)
```

This multi-faceted approach balances different evaluation philosophies:

- **Resume (50%)**: What teams have accomplished (wins/losses, quality wins)
- **Predictive (30%)**: How strong teams are fundamentally (power ratings)
- **SOR (10%)**: How impressive the record is given schedule difficulty
- **SOS (10%)**: How challenging the schedule was (with opponent's opponent adjustment)

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

#### Complete Notebook Sequence (00-08)

```bash
# Start Jupyter Lab
make start  # or: jupyter lab

# Open notebooks in order:
00_configuration.ipynb       - Configure settings and learn methodology
01_data_pipeline.ipynb       - Fetch and cache FBS game data
02_ranking_algorithms.ipynb  - Resume + Predictive rankings (split)
03_composite_rankings.ipynb  - SOR/SOS integration + composite scores
04_resume_analysis.ipynb     - Team resume sheets with quality wins
05_playoff_selection.ipynb   - 12-team bracket with visual display
06_visualization_report.ipynb - Stability analysis and error metrics
07_quick_simulator.ipynb     - Streamlined all-in-one analysis
08_validation_backtesting.ipynb - Historical validation
```

The configuration notebook (`00_configuration.ipynb`) provides:
- Interactive season year and week selection
- Detailed methodology explanations for all ranking algorithms
- Customizable ranking weights
- API connection validation
- Comprehensive workflow guide

#### Output File Organization

All outputs are organized into structured directories:

```
data/output/
├── rankings/          # All ranking CSV files
│   ├── colley_rankings_{year}_week{week}.csv
│   ├── massey_rankings_{year}_week{week}.csv
│   ├── elo_rankings_{year}_week{week}.csv
│   ├── win_pct_rankings_{year}_week{week}.csv
│   ├── resume_rankings_{year}_week{week}.csv
│   ├── predictive_rankings_{year}_week{week}.csv
│   └── composite_rankings_{year}_week{week}.csv
│
├── brackets/          # Playoff bracket outputs
│   ├── playoff_bracket_{year}_week{week}.html
│   ├── playoff_bracket_{year}_week{week}.json
│   ├── playoff_bracket_{year}_week{week}.txt
│   └── selection_audit_{year}_week{week}.txt
│
├── exports/           # Data exports for external use
│   ├── team_sheets_{year}_week{week}.csv
│   ├── top25_team_sheets_{year}_week{week}.json
│   └── resume_vs_predictive_{year}_week{week}.csv
│
└── visualizations/    # Charts and graphs
    ├── schedule_inequality_{year}.png
    ├── ranking_stability_{year}.png
    ├── prediction_errors_{year}.png
    ├── home_field_advantage_{year}.png
    └── composite_analysis_{year}_week{week}.png
```

**Current Configuration**: 2025 season, Week 15, FBS teams only
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
├── data/                       # Data storage
│   ├── cache/                 # Cached API responses (parquet/CSV)
│   └── output/                # Generated outputs (organized)
│       ├── rankings/          # All ranking CSV files
│       ├── brackets/          # Playoff brackets (HTML/JSON/TXT)
│       ├── exports/           # External data exports
│       └── visualizations/    # Charts and graphs (PNG)
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
├── notebooks/                  # Jupyter analysis notebooks (00-08)
│   ├── README.md              # Notebook usage guide
│   ├── 00_configuration.ipynb # User-friendly setup and methodology
│   ├── 01_data_pipeline.ipynb # FBS data fetching and caching
│   ├── 02_ranking_algorithms.ipynb # Resume + Predictive split
│   ├── 03_composite_rankings.ipynb # SOR/SOS + composite scores
│   ├── 04_resume_analysis.ipynb    # Team resume sheets
│   ├── 05_playoff_selection.ipynb  # 12-team bracket with visual
│   ├── 06_visualization_report.ipynb # Stability analysis
│   ├── 07_quick_simulator.ipynb    # All-in-one streamlined
│   └── 08_validation_backtesting.ipynb # Historical validation
│
├── scripts/                    # Python utility scripts
│   └── README.md              # Scripts documentation
│
├── src/                        # Source code package
│   ├── __init__.py            # Package initialization
│   ├── data/                  # Data fetching modules
│   │   ├── __init__.py
│   │   └── fetcher.py         # CFBD API data fetching
│   ├── playoff/               # Playoff selection logic
│   │   ├── __init__.py
│   │   └── bracket.py         # 12-team bracket + visual display
│   ├── rankings/              # Ranking algorithm implementations
│   │   └── __init__.py
│   └── utils/                 # Utility functions
│       ├── __init__.py
│       └── metrics.py         # SOR, SOS, quality wins, bad losses
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

## Known Limitations

This simulator provides objective analysis but has inherent limitations:

### Model Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **No "Eye Test"** | Pure statistical model without subjective quality assessment | Conference tier adjustments (+3% P5, -3% G5) |
| **No Injury Data** | Can't account for key player absences (e.g., FSU QB injury 2023) | Use most recent game data when available |
| **Conference Blind** | Historically treated all conferences equally | Now includes P5/G5 tier adjustments |
| **No Game Context** | Doesn't distinguish rivalry games, weather, etc. | MOV capping and HFA adjustments help |
| **Static Weights** | Uses fixed 50/30/10/10 weighting | Weights optimized via historical backtesting |

### Data Limitations

- **Dependent on API**: Requires CollegeFootballData.com availability
- **FBS-Only**: Excludes FCS opponents (may undervalue some schedules)
- **Temporal Lag**: Games added to API within ~24 hours
- **Early Season Noise**: Rankings unstable before Week 5 (by design)

### Philosophical Limitations

- **Backward-Looking**: Based on past performance, not future potential
- **No Narrative**: Can't capture storylines, momentum shifts, coaching changes
- **Committee Override**: CFP committee can (and does) apply subjective judgment
- **Selection Protocol Constraint**: Bound by 5+7 automatic bid rules

### Use Cases

**Good For:**
- Objective baseline for comparison against committee rankings
- Identifying statistical outliers and potential biases
- Historical analysis and trend identification
- Transparent, reproducible rankings methodology

**Not Suitable For:**
- Replacing human judgment entirely
- Predicting future game outcomes (use predictive-only rankings)
- Capturing intangible factors (team culture, injury impact, etc.)
- Real-time in-game adjustments

**Bottom Line**: This simulator is a **complement to**, not a **replacement for**, informed human judgment.

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

- **Issues**: [GitHub Issues](https://github.com/XavierAgostino/cfp-selection-simulator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/XavierAgostino/cfp-selection-simulator/discussions)

---

## Roadmap

### Version 1.x (Current - 2025 Season)

**Completed:**
- FBS-only data pipeline with API integration
- Five ranking algorithms (Colley, Massey, Elo, Win%, SOR/SOS)
- Ensemble composite methodology
- Official 12-team playoff selection protocol
- Interactive Plotly bracket visualizations
- Docker containerized development environment
- Comprehensive documentation and analysis reports
- Historical validation backtesting framework

### Version 2.x (Planned - Spring 2026)

**In Development:**
- Complete Python package (installable via pip)
- Expanded test coverage (target >80%)
- Additional ranking algorithms (SRS, FPI, S&P+)
- Interactive web dashboard with live updates
- Automated weekly rankings generation
- Conference championship predictions
- Enhanced visualization suite

### Version 3.x (Future - 2027 Season)

**Proposed Features:**
- Real-time rankings API for public access
- Scenario simulation engine ("What if" analysis)
- Machine learning optimization for weight tuning
- Mobile application for iOS/Android
- Public data repository and API
- Media integration toolkit for broadcasters

---

## Project Status

**Current Version**: 1.0.0  
**Season**: 2025-2026 (Active Development)  
**Last Updated**: December 2025  
**Status**: Production Ready  
**License**: MIT (Open Source)

---

## Disclaimer

This project is an **independent research endeavor** not affiliated with:
- College Football Playoff (CFP)
- National Collegiate Athletic Association (NCAA)
- Any athletic conference or institution

**Purpose**: Provide transparent, objective analysis as a complementary tool to human judgment, not as a replacement for the official selection committee.

**Research Context**: This simulator is designed for academic research, sports analytics, and open-source collaboration. All methodologies are documented and reproducible to support transparent analysis of college football team performance.

---

<div align="center">

**"In a sport where every game carries championship implications, selection decisions must be grounded in transparent, consistent methodology."**

Built for open-source sports analytics research

</div>
