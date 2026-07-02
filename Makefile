# =============================================================================
# CFP Selection Simulator - Makefile
# =============================================================================

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
	@echo "  make setup              Install package (pip install -e \".[app,dev]\")"
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
	pip install -e ".[app,dev]"

demo:
	cfp-sim run --year $(YEAR) --week $(WEEK) --sample

run:
	cfp-sim run --year $(YEAR) --week $(WEEK)

rank:
	cfp-sim rank --year $(YEAR) --week $(WEEK) --sample

select:
	cfp-sim select --year $(YEAR) --week $(WEEK) --sample

bracket:
	cfp-sim bracket --year $(YEAR) --week $(WEEK) --sample --html

dashboard:
	cfp-sim dashboard

validate:
	cfp-sim validate --years 2014:2024

reproduce:
	cfp-sim reproduce --season $(SEASON) --week $(WEEK)

test:
	pytest tests/ -v

lint:
	black --check src/ tests/ app/
	isort --check-only src/ tests/ app/
	flake8 src/ tests/ app/ --select=E9,F63,F7,F82

format:
	black src/ tests/ app/
	isort src/ tests/ app/

verify: test lint
	cfp-sim run --year $(YEAR) --week $(WEEK) --sample

clean:
	rm -rf htmlcov .pytest_cache .coverage
	cfp-sim clean --outputs

start:
	@./bin/start.sh

stop:
	@./bin/stop.sh

status:
	@./bin/status.sh
