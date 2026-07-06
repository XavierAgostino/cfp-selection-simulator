# Changelog

All notable changes to the Selection Room project.

## [3.0.0-beta] - 2026-07-03

**Selection Room v1: first feature-complete release under the Selection Room name.**

Selection Room is an independent CFP selection analysis workspace. It is not
affiliated with, endorsed by, or a replication of the College Football Playoff
selection committee. This release is local / open-source first: hosted production
architecture is documented but not implemented.

### Added

- **Selection Room web app** (Next.js under `web/`): the primary UI over the
  engine's JSON exports.
- **Projected field & rankings**: dashboard field view and full composite
  rankings table (resume, predictive, SOR, SOS) with score bars, search, sorting.
- **Bracket viewer**: format-aware 12-team bracket (full bracket / rounds /
  matchup cards) under 2024 and 2025+ seeding rules.
- **Team resume drawers**: schedule, score breakdown, and run-grounded selection
  case (`why_in` / concerns), reachable from any team name.
- **Bubble & cut-line analysis**: last four in / first four out / next four out,
  the selection audit trail, and the **Selection Stability** board.
- **Selection Stability**: Monte Carlo weight perturbation exported as
  `sensitivity.json` (`src/validation/sensitivity.py`); see [Sensitivity Analysis](docs/research/sensitivity-analysis.md).
- **In-browser run generation**: Run Analysis launches a season/week run from
  sample or live CFBD data without leaving the site.
- **Scenario Lab**: reweight the four composite pillars and diff the resulting
  field, seeds, and bubble against a base run (weights-only what-if).
- **Validation Dashboard**: retrospective committee-alignment, field-accuracy,
  and predictive-signal tracks across seasons, with a seeded offline fixture.
- **Export / share primitives**: rankings CSV download, bracket share image
  (branded PNG), and per-team resume cards, all scoped to the active run.
- **JSON API contract layer** (`docs/api-contracts.md`) plus a local DuckDB run
  store for analytical queries (`sroom store`).
- **Fumadocs documentation site** at `/docs`.

### Changed

- **Renamed to Selection Room**: new `sroom` CLI (the legacy `cfp-sim` alias has been removed)
- **Removed Docker/Jupyter setup path**: local development now goes through `make setup` (`.venv` + pip install), no container required

### Not included (documented future work)

- Shareable scenario URLs (deep-linked Scenario Lab diffs).
- Hosted production adapters (Vercel + worker + object storage + Postgres); see
  [`docs/architecture/hosted-production.md`](docs/architecture/hosted-production.md).

## [2.0.0] - 2026-07-02

### Added
- **Documentation funnel**: `docs/index.md`, quickstart, user guide, CLI reference, dashboard guide, output files, configuration, development
- **Research index** and case studies under `docs/research/case-studies/`
- **Sensitivity analysis** doc; root `CHANGELOG.md`
- **CLI-first workflow**: `make setup`, `make demo`, `make verify`, `sroom doctor`, `sroom outputs`, `sroom open`
- **Predictable output contract** under `data/output/{rankings,fields,brackets,audits,runs}/`
- **Config templates** in `configs/` (sample, 2024, 2025, validation)
- **Rich sample demo data** with conference champions (`sample_champions.csv`, 110 games)
- **CONTRIBUTING.md** and `./scripts/demo.sh`

- **Format-aware CFP rules**: 2024 champion-bye seeding and 2025+ straight seeding (`src/config/formats.py`, `src/selection/seeding.py`)
- **Field selection module**: 5+7 auto/at-large with displacement tracking and structured audit (`src/selection/field.py`, `src/selection/audit.py`)
- **Composite pipeline**: Extracted ranking algorithms and composite scoring (`src/rankings/algorithms.py`, `src/pipeline/composite.py`)
- **CLI**: `sroom` Typer commands for fetch, rank, select, bracket, run, validate, dashboard
- **Pipeline runner**: Full orchestration with reproducibility manifest (`src/pipeline/run.py`)
- **Streamlit dashboard**: Field, bracket, resume, audit, and component views (`app/streamlit_app.py`)
- **Team asset registry**: Logo/color lookup with CFBD → ESPN → placeholder fallbacks (`src/assets/`)
- **Sample team assets**: Offline logo cache at `data/cache/team_assets.sample.json`
- **Research docs**: Methodology, metrics, validation, limitations, data sources under `docs/research/`
- **Selection Stability (initial framework)**: Weight-perturbation module in `src/validation/sensitivity.py` (later releases added full Monte Carlo export to `sensitivity.json`)
- **Tests**: Seeding (2024/2025), field selection, composite pipeline

### Changed

- **Version**: 1.0.0 → 2.0.0
- **Backtest**: Imports shared composite pipeline; format-aware seeding for 2024+
- **README**: North-star quickstart focused on CLI and decision-support positioning
- **Makefile**: Added `run`, `dashboard`, `validate` targets

### Fixed

- Stale 2025+ seeding logic (was using 2024 champion-bye rules for all years)
- Displacement audit-only bug (now tracks displaced team correctly)

## [1.0.0] - 2024-12-04

### Added

#### Project Structure
- **pyproject.toml**: Modern Python packaging configuration with setuptools
- **requirements.txt**: Root-level dependencies file for easy installation
- **.env.example**: Template for environment variables (API keys)
- **CONTRIBUTING.md**: Comprehensive contributor guidelines
- **.pre-commit-config.yaml**: Pre-commit hooks for code quality
- **src/ package structure**: Modular Python package with data, rankings, and utils modules
- **tests/ directory**: pytest-based test infrastructure with fixtures
- **.github/workflows/ci.yml**: GitHub Actions CI/CD pipeline

#### Documentation
- **notebooks/README.md**: Comprehensive guide for notebook usage
- Enhanced **.gitignore**: Professional-grade ignore rules for Python, data, and OS files

#### Source Code
- **src/__init__.py**: Package initialization with version info
- **src/data/fetcher.py**: Reusable API fetching utilities with FBS filtering
- **src/data/__init__.py**, **src/rankings/__init__.py**, **src/utils/__init__.py**: Package modules

#### Testing
- **tests/conftest.py**: Shared pytest fixtures
- **tests/test_data_fetcher.py**: Initial test suite structure

### Changed

#### Season Configuration
- Updated all notebooks from **2024 to 2025 season** (2025-2026)
- Updated **create_notebooks.py** to generate 2025 season notebooks
- Updated cache week to **15** for 2025 season

#### Data Pipeline Improvements
- Enhanced FBS filtering using official `get_fbs_teams()` API endpoint
- Added `division: "fbs"` parameter to API requests for better filtering
- Improved error handling in data fetching functions

#### Conference Mappings
- Fixed team name inconsistencies:
  - "Pitt" to "Pittsburgh"
  - "App State" to "Appalachian State"
  - "USF" to "South Florida"
  - "UMass" to "Massachusetts"
  - Added "Sam Houston State" (full name)
  - "Southern Miss" to "Southern Mississippi"

### Fixed

- Removed `.DS_Store` from potential git tracking
- Protected `.env` file from being committed (security improvement)
- Fixed FBS team filtering to exclude FCS opponents correctly

### Security

- Added `.env.example` template to prevent API key exposure
- Updated .gitignore to block sensitive files
- Added pre-commit hook to detect private keys

## Future Enhancements

### Planned Features
- Complete src/ module implementations (ranking algorithms, composite scores)
- Comprehensive test coverage (target: >80%)
- Interactive web dashboard for rankings visualization
- Additional ranking algorithms (BCS computer rankings, etc.)
- Historical backtesting automation
- Docker Compose orchestration improvements

### CI/CD Improvements
- Add automated notebook execution testing
- Implement coverage reporting to Codecov
- Add automated releases
- Deploy documentation to GitHub Pages

---

## Version History

- **v1.0.0** (2024-12-04): Initial professional release with modern tooling
- **v0.1.0** (2024-12-04): Initial project structure
