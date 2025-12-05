# Changelog

All notable changes to the CFP Selection Simulator project.

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
