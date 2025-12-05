# CFP Selection Simulator - Notebooks

This directory contains Jupyter notebooks for interactive analysis and development of the CFP Selection Simulator.

## Quick Start

**New users:** Start with `00_configuration.ipynb` to configure your analysis and understand the methodology.

**Experienced users:** Run notebooks 01-05 in sequence for complete analysis, or use `07_quick_simulator.ipynb` for streamlined results.

## Notebook Overview

### Configuration and Setup

0. **00_configuration.ipynb**
   - **Start here** - Interactive configuration interface
   - Configure season year and analysis week
   - Understand ranking methodology with detailed explanations
   - Customize ranking algorithm weights
   - Validate API connection
   - Quick start guide and workflow overview

### Core Pipeline

1. **01_data_pipeline.ipynb**
   - Fetches FBS game data from CollegeFootballData.com API
   - Filters for FBS-only games
   - Caches data for reproducibility
   - Saves outputs to `data/output/` structure

2. **02_ranking_algorithms.ipynb**
   - **RESUME rankings:** Colley Matrix, Win Percentage (no MOV)
   - **PREDICTIVE rankings:** Massey (MOV-capped at 28), Elo
   - Separates what teams accomplished from how good they are
   - Applies HFA adjustments (3.75 points) and MOV capping
   - Exports resume and predictive rankings separately

3. **03_composite_rankings.ipynb**
   - Combines resume + predictive components
   - Integrates SOR (Strength of Record) and SOS (Strength of Schedule)
   - Normalizes and weights all components
   - Implements committee-style tie-breaker logic
   - Generates final composite rankings

4. **04_resume_analysis.ipynb**
   - Team resume "sheets" for all teams
   - SOR rank (how impressive is the record given schedule)
   - SOS rank (how tough was the schedule, including OOR)
   - Quality wins (Top 5, Top 12, Top 25)
   - Bad losses (losses outside Top 25)
   - Conference champion tracking
   - Resume vs predictive comparison

5. **05_playoff_selection.ipynb**
   - 12-team CFP selection using 5+7 protocol
   - 5 highest-ranked conference champions (automatic bids)
   - 7 at-large bids by composite rank
   - Top 4 seeds receive first-round byes
   - Visual bracket display (HTML + ASCII)
   - Complete selection audit trail
   - Exports brackets to `data/output/brackets/`

### Analysis and Reporting

6. **06_visualization_report.ipynb**
   - Schedule inequality analysis (conference imbalance)
   - Week-over-week ranking stability
   - Prediction error residuals
   - Home/away performance splits
   - HFA adjustment impact analysis

### Utilities

7. **07_quick_simulator.ipynb**
   - Streamlined end-to-end analysis
   - Quick weekly updates

8. **08_validation_backtesting.ipynb**
   - Historical validation against actual CFP selections
   - Spearman correlation analysis
   - Model accuracy metrics

## Usage

### Recommended Workflow

**Option 1: Complete Analysis (Recommended)**
```
0. Configuration    → Configure season, weights, understand methodology
1. Data Pipeline    → Fetch FBS game data
2. Rankings         → Calculate resume (Colley, Win%) + predictive (Massey, Elo)
3. Composite        → Combine with SOR/SOS, apply tie-breakers
4. Resume Analysis  → Team sheets, quality wins, bad losses
5. Playoff          → 12-team bracket with visual display
6. Visualization    → Stability, errors, schedule inequality
```

**Option 2: Quick Analysis (Experienced Users)**
```
7. Quick Simulator → Streamlined end-to-end analysis
```

**Option 3: Historical Validation**
```
8. Validation & Backtesting → Compare to actual CFP selections
```

### Output File Organization

All notebook outputs are saved to organized directories under `../data/output/`:

```
data/output/
├── rankings/          # CSV files from notebooks 02-03
├── brackets/          # HTML/JSON/TXT from notebook 05
├── exports/           # Team sheets and external data from notebook 04
└── visualizations/    # PNG charts from notebooks 03, 06
```

Files follow naming convention: `{type}_{year}_week{week}.{ext}`

Example: `composite_rankings_2025_week15.csv`

### Configuration

All notebooks are configured for the **2025 season** and filter for **FBS teams only**.

Default settings:
- Season Year: 2025 (2025-2026 season)
- Analysis Week: 15
- Start Week: 5 (excludes early season noise)

Customize these settings in `00_configuration.ipynb`.

### Methodology Reference

For detailed explanation of ranking algorithms, see:
- Interactive glossary in `00_configuration.ipynb`
- Comprehensive guide in `../docs/METHODOLOGY.md`

### Additional Resources

- Main project documentation: [README](../README.md)
- Contributing guidelines: [CONTRIBUTING](../docs/CONTRIBUTING.md)
- Docker setup: [DOCKER](../docs/DOCKER.md)
- Project structure: [PROJECT_STRUCTURE](../docs/PROJECT_STRUCTURE.md)
