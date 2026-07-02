# =============================================================================
# CFP Selection Simulator - Makefile
# =============================================================================

PYTHON ?= python3
VENV_DIR := .venv
VENV_PY := $(VENV_DIR)/bin/python
VENV_BIN := $(VENV_DIR)/bin

# Use project venv when present (created by `make setup`)
ifeq ($(wildcard $(VENV_PY)),)
PY := $(PYTHON)
BIN := $(shell $(PYTHON) -c "import sysconfig; print(sysconfig.get_path('scripts'))" 2>/dev/null)
CFP_SIM := cfp-sim
else
PY := $(VENV_PY)
BIN := $(VENV_BIN)
CFP_SIM := $(VENV_BIN)/cfp-sim
endif

.PHONY: help setup demo run rank select bracket dashboard validate reproduce test lint format verify clean start stop status

YEAR ?= 2025
WEEK ?= 15
SEASON ?= 2024

help:
	@echo ""
	@echo "CFP Selection Simulator"
	@echo "============================================================"
	@echo ""
	@echo "Getting started"
	@echo "  make setup              Create .venv and install package"
	@echo "  make demo               Run sample demo (no API key)"
	@echo "  make dashboard          Launch Streamlit dashboard"
	@echo ""
	@echo "Simulator"
	@echo "  make run YEAR=2025 WEEK=15     Full pipeline (live data)"
	@echo "  make rank                      Composite rankings"
	@echo "  make select                    Field selection + seeding"
	@echo "  make bracket                   Bracket HTML export"
	@echo "  make validate                  Historical backtest"
	@echo "  make reproduce SEASON=2024     Reproduce a season run"
	@echo ""
	@echo "Development"
	@echo "  make test               Run pytest"
	@echo "  make lint               Check formatting and imports"
	@echo "  make format             Auto-format code"
	@echo "  make verify             Tests + lint + sample smoke run"
	@echo "  make clean              Remove output artifacts and caches"
	@echo ""
	@echo "Docker (optional)"
	@echo "  make start / stop / status"
	@echo ""

setup:
	@test -d $(VENV_DIR) || $(PYTHON) -m venv $(VENV_DIR)
	$(VENV_PY) -m pip install --upgrade pip
	$(VENV_PY) -m pip install -e ".[app,dev]"
	@echo ""
	@echo "Setup complete. Commands use $(VENV_DIR)/ automatically."

demo:
	$(CFP_SIM) run --year $(YEAR) --week $(WEEK) --sample

run:
	$(CFP_SIM) run --year $(YEAR) --week $(WEEK)

rank:
	$(CFP_SIM) rank --year $(YEAR) --week $(WEEK) --sample

select:
	$(CFP_SIM) select --year $(YEAR) --week $(WEEK) --sample

bracket:
	$(CFP_SIM) bracket --year $(YEAR) --week $(WEEK) --sample --html

dashboard:
	$(CFP_SIM) dashboard

validate:
	$(CFP_SIM) validate --years 2014:2024

reproduce:
	$(CFP_SIM) reproduce --season $(SEASON) --week $(WEEK)

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
	$(CFP_SIM) run --year $(YEAR) --week $(WEEK) --sample

clean:
	rm -rf htmlcov .pytest_cache .coverage
	$(CFP_SIM) clean --outputs

start:
	@./bin/start.sh

stop:
	@./bin/stop.sh

status:
	@./bin/status.sh
