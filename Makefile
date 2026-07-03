# =============================================================================
# Selection Room - Makefile
# =============================================================================

PYTHON ?= python3
VENV_DIR := .venv
VENV_PY := $(VENV_DIR)/bin/python
VENV_BIN := $(VENV_DIR)/bin

# Use project venv when present (created by `make setup`)
ifeq ($(wildcard $(VENV_PY)),)
PY := $(PYTHON)
BIN := $(shell $(PYTHON) -c "import sysconfig; print(sysconfig.get_path('scripts'))" 2>/dev/null)
SROOM := sroom
else
PY := $(VENV_PY)
BIN := $(VENV_BIN)
SROOM := $(VENV_BIN)/sroom
endif

.PHONY: help setup demo run rank select bracket dashboard web validate validate-committee validate-selection validate-predictive reproduce test lint format verify clean

YEAR ?= 2025
WEEK ?= 15
SEASON ?= 2024
YEARS ?= 2014:2024
TARGET ?= all

help:
	@echo ""
	@echo "Selection Room"
	@echo "============================================================"
	@echo ""
	@echo "Getting started"
	@echo "  make setup              Create .venv and install package"
	@echo "  make demo               Run sample demo (no API key)"
	@echo "  make dashboard          Launch Streamlit dashboard"
	@echo "  make web                Launch the Selection Room web app"
	@echo ""
	@echo "Simulator"
	@echo "  make run YEAR=2025 WEEK=15     Full pipeline (live data)"
	@echo "  make rank                      Composite rankings"
	@echo "  make select                    Field selection + seeding"
	@echo "  make bracket                   Bracket HTML export"
	@echo "  make validate                  Era-aware validation (all tracks)"
	@echo "  make validate-selection        Field validation only"
	@echo "  make validate-committee        Committee replication only"
	@echo "  make validate-predictive         Game prediction metrics only"
	@echo "  make validate YEARS=2021:2023 TARGET=selection"
	@echo "  make reproduce SEASON=2024     Reproduce a season run"
	@echo ""
	@echo "Development"
	@echo "  make test               Run pytest"
	@echo "  make lint               Check formatting and imports"
	@echo "  make format             Auto-format code"
	@echo "  make verify             Tests + lint + sample smoke run"
	@echo "  make clean              Remove output artifacts and caches"
	@echo ""

setup:
	@test -d $(VENV_DIR) || $(PYTHON) -m venv $(VENV_DIR)
	$(VENV_PY) -m pip install --upgrade pip
	$(VENV_PY) -m pip install -e ".[app,dev]"
	@echo ""
	@echo "Setup complete. Commands use $(VENV_DIR)/ automatically."

demo:
	$(SROOM) run --year $(YEAR) --week $(WEEK) --sample

run:
	$(SROOM) run --year $(YEAR) --week $(WEEK)

rank:
	$(SROOM) rank --year $(YEAR) --week $(WEEK) --sample

select:
	$(SROOM) select --year $(YEAR) --week $(WEEK) --sample

bracket:
	$(SROOM) bracket --year $(YEAR) --week $(WEEK) --sample --html

dashboard:
	$(SROOM) dashboard

web:
	cd web && pnpm install --silent && SELECTION_ROOM_ENABLE_RUN_JOBS=1 SELECTION_ROOM_LIVE_RUN_THROTTLE_MINUTES=0 pnpm dev

validate:
	$(SROOM) validate --years $(or $(YEARS),2014:2024) --target $(or $(TARGET),all)

validate-committee:
	$(SROOM) validate --years $(or $(YEARS),2014:2024) --target committee

validate-selection:
	$(SROOM) validate --years $(or $(YEARS),2014:2024) --target selection

validate-predictive:
	$(SROOM) validate --years $(or $(YEARS),2014:2024) --target predictive

reproduce:
	$(SROOM) reproduce --season $(SEASON) --week $(WEEK)

test:
	$(PY) -m pytest tests/ -v

lint:
	$(PY) -m black --check src/ tests/ app/
	$(PY) -m isort --check-only src/ tests/ app/
	$(PY) -m flake8 src/ tests/ app/ --select=E9,F63,F7,F82

format:
	$(PY) -m black src/ tests/ app/
	$(PY) -m isort src/ tests/ app/

verify: test lint
	$(SROOM) run --year $(YEAR) --week $(WEEK) --sample

clean:
	rm -rf htmlcov .pytest_cache .coverage
	$(SROOM) clean --outputs
