# CFP Selection Simulator - Notebooks

This directory contains Jupyter notebooks for interactive analysis and development of the CFP Selection Simulator.

## Quick Start

**New users:** Start with `00_configuration.ipynb` to configure your analysis and understand the methodology.

**Experienced users:** Run notebooks 01-04 in sequence for complete analysis, or use `06_quick_simulator.ipynb` for streamlined results.

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
   - Uses configuration from 00_configuration.ipynb

2. **02_ranking_algorithms.ipynb**
   - Implements Colley Matrix rankings
   - Implements Massey ratings
   - Implements Elo rating system
   - Exports individual ranking components

3. **03_composite_rankings.ipynb**
   - Combines all ranking methods
   - Calculates Strength of Record (SOR)
   - Creates weighted composite scores
   - Generates final rankings

4. **04_playoff_selection.ipynb**
   - Applies CFP selection protocol
   - Identifies conference champions
   - Selects 12-team playoff field
   - Seeds bracket according to CFP rules
   - Exports results to JSON/CSV

5. **05_validation_backtesting.ipynb**
   - Validates rankings against historical CFP selections
   - Calculates Spearman correlation
   - Analyzes model accuracy

6. **06_quick_simulator.ipynb**
   - All-in-one simplified simulator
   - Quick analysis entry point

## Usage

### Recommended Workflow

**Option 1: Guided Setup (Recommended for New Users)**
```
0. Configuration  → Set year, week, weights, understand methodology
1. Data Pipeline  → Fetch game data
2. Rankings       → Calculate individual algorithms
3. Composite      → Combine into final rankings
4. Playoff        → Select 12-team bracket
```

**Option 2: Quick Analysis (Experienced Users)**
```
6. Quick Simulator → Streamlined end-to-end analysis
```

**Option 3: Historical Validation**
```
5. Validation & Backtesting → Compare to actual CFP selections
```

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
