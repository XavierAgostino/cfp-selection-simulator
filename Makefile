# =============================================================================
# CFP Selection Simulator - Makefile
# =============================================================================

.PHONY: help setup start stop status clean run dashboard validate

help:
	@echo ""
	@echo "CFP Selection Simulator Commands"
	@echo "============================================================"
	@echo ""
	@echo "Setup"
	@echo "  make setup          One-time environment setup"
	@echo "  make status         Show environment status"
	@echo "  make clean          Clean up resources"
	@echo ""
	@echo "Development"
	@echo "  make start          Start development environment"
	@echo "  make stop           Stop all containers"
	@echo ""
	@echo "Simulator (requires: pip install -e \".[app]\")"
	@echo "  make run YEAR=2025 WEEK=15   Run full pipeline"
	@echo "  make dashboard               Launch Streamlit dashboard"
	@echo "  make validate                Run historical validation"
	@echo ""

setup:
	@./bin/setup.sh

start:
	@./bin/start.sh

stop:
	@./bin/stop.sh

status:
	@./bin/status.sh

clean:
	@./bin/cleanup.sh

YEAR ?= 2025
WEEK ?= 15

validate:
	@cfp-sim validate --years 2014:2023

run:
	@cfp-sim run --year $(YEAR) --week $(WEEK) --sample

dashboard:
	@cfp-sim dashboard
