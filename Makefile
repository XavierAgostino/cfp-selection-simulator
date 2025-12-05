# =============================================================================
# CFP Selection Simulator - Makefile
# =============================================================================

.PHONY: help setup start stop status clean

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

