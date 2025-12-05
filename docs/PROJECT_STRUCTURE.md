# Project Structure Overview

## Directory Organization

### Root Level (`/`)

```
cfp-selection-simulator/
├── bin/                    Shell utility scripts for Docker management
├── data/                   Data storage (gitignored, created at runtime)
├── docker/                 Docker configuration files
├── docs/                   Project documentation
├── lib/                    Shared shell utilities
├── notebooks/              Jupyter notebooks for analysis
├── scripts/                Python utility scripts
├── src/                    Python source code package
├── tests/                  Test suite
├── .env.example           Environment variable template
├── .gitignore             Git ignore rules
├── .pre-commit-config.yaml Pre-commit hooks
├── docker-compose.yml     Docker orchestration
├── LICENSE                MIT License
├── Makefile               Command shortcuts
├── pyproject.toml         Python packaging configuration
├── README.md              Main project documentation
└── requirements.txt       Python dependencies
```

## Directory Purposes

### `/bin` - Shell Scripts
**Purpose**: Docker and environment management scripts

```
bin/
├── cleanup.sh     # Remove Docker resources
├── setup.sh       # Initial environment setup
├── start.sh       # Start development environment
├── status.sh      # Check environment status
└── stop.sh        # Stop containers
```

**Usage**: Called via Makefile (`make start`, `make stop`, etc.)

### `/data` - Data Storage
**Purpose**: Runtime data storage (gitignored)

```
data/
└── cache/         # API response caching
    └── {year}/    # Season-specific cache
```

**Note**: Created automatically, never commit to git

### `/docker` - Container Configuration
**Purpose**: Docker image and dependency definitions

```
docker/
├── Dockerfile         # Production-grade image definition
└── requirements.txt   # Python dependencies for container
```

**Features**:
- Multi-stage build optimization
- Non-root user security
- Health check implementation

### `/docs` - Documentation
**Purpose**: Comprehensive project documentation

```
docs/
├── CHANGELOG.md       # Version history
├── CONTRIBUTING.md    # Contribution guidelines
├── DOCKER.md          # Docker documentation
└── README.md          # Documentation index
```

**Standards**:
- Professional tone (no emojis)
- Clear structure with TOC
- Code examples included
- Keep up-to-date with releases

### `/lib` - Shared Utilities
**Purpose**: Reusable shell functions

```
lib/
└── utils.sh           # Common shell functions
```

**Usage**: Sourced by bin/ scripts

### `/notebooks` - Analysis Notebooks
**Purpose**: Interactive Jupyter notebooks for CFP analysis

```
notebooks/
├── README.md                      # Usage guide
├── 01_data_pipeline.ipynb         # Data fetching & caching
├── 02_ranking_algorithms.ipynb    # Core algorithms
├── 03_composite_rankings.ipynb    # Combined rankings
├── 04_playoff_selection.ipynb     # Playoff selection
├── 05_validation_backtesting.ipynb # Historical validation
└── 06_quick_simulator.ipynb       # All-in-one simulator
```

**Configuration**: 2025 season, FBS teams only, starts week 5

### `/scripts` - Python Utilities
**Purpose**: Python utility scripts for development

```
scripts/
├── README.md              # Scripts documentation
└── (utility scripts)      # Development tools
```

**Example**: Notebook generation, data processing tools

### `/src` - Source Code
**Purpose**: Main Python package with reusable modules

```
src/
├── __init__.py            # Package initialization (version 1.0.0)
├── data/
│   ├── __init__.py
│   └── fetcher.py         # API data fetching utilities
├── rankings/
│   └── __init__.py        # Ranking algorithms (future)
└── utils/
    └── __init__.py        # Utility functions (future)
```

**Standards**:
- Type hints where appropriate
- Google-style docstrings
- Black formatting (100 char lines)

### `/tests` - Test Suite
**Purpose**: pytest-based testing infrastructure

```
tests/
├── __init__.py
├── conftest.py            # Shared pytest fixtures
└── test_data_fetcher.py   # Data fetcher tests
```

**Configuration**: See `pyproject.toml` for pytest settings

## File Purposes

### Root Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Template for environment variables |
| `.gitignore` | Files/directories to exclude from git |
| `.pre-commit-config.yaml` | Code quality hooks (black, flake8, mypy) |
| `docker-compose.yml` | Docker orchestration configuration |
| `LICENSE` | MIT License |
| `Makefile` | Command shortcuts for development |
| `pyproject.toml` | Modern Python packaging & tool configuration |
| `README.md` | Main project documentation |
| `requirements.txt` | Python dependencies for local install |

### Configuration in pyproject.toml

- **Build system**: setuptools
- **Dependencies**: pandas, numpy, scipy, cfbd, etc.
- **Optional deps**: `[dev]` for development, `[jupyter]` for notebooks
- **Tool configs**: black, isort, pytest, mypy settings

## Design Principles

### 1. Separation of Concerns
- **notebooks/**: Interactive analysis
- **src/**: Reusable code modules
- **tests/**: Test suite
- **docs/**: Documentation
- **scripts/**: Utility tools

### 2. Professional Organization
- Clean root directory
- Grouped related files
- Clear naming conventions
- Comprehensive documentation

### 3. Development Workflow
```
bin/setup.sh - docker-compose up - notebooks/ - tests/ - git commit
```

### 4. Security
- No secrets in git (`.env` gitignored)
- `.env.example` for template
- Pre-commit hooks detect private keys
- Docker non-root user

### 5. Maintainability
- Modular structure
- Clear documentation
- Test coverage
- CI/CD automation

## Adding New Components

### New Notebook
1. Create in `notebooks/` with numbering
2. Update `notebooks/README.md`
3. Follow existing structure

### New Source Module
1. Add to appropriate `src/` subdirectory
2. Write tests in `tests/`
3. Update `src/__init__.py` if needed
4. Add docstrings

### New Documentation
1. Add to `docs/`
2. Update `docs/README.md` index
3. Link from main README if appropriate

### New Script
1. Add to `scripts/`
2. Document in `scripts/README.md`
3. Make executable if shell script
4. Add shebang line

## Best Practices

### For Development
- Use virtual environment or Docker
- Run tests before committing
- Use pre-commit hooks
- Keep notebooks outputs cleared
- Document complex logic

### For Deployment
- Review `docs/DOCKER.md` production section
- Never commit `.env` file
- Use proper secret management
- Configure monitoring
- Test in staging first

### For Contributions
- Read `docs/CONTRIBUTING.md`
- Follow branching strategy
- Write tests for new features
- Update documentation
- Use conventional commits

## Quick Navigation

- **Getting Started**: `README.md`
- **Docker Setup**: `docs/DOCKER.md`
- **Contributing**: `docs/CONTRIBUTING.md`
- **Version History**: `docs/CHANGELOG.md`
- **Notebooks Guide**: `notebooks/README.md`
- **API Documentation**: `src/` docstrings
