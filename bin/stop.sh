#!/bin/bash
# =============================================================================
# Stop - Stop all containers
# =============================================================================

set -e

# Get script directory and load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${ROOT_DIR}/lib/utils.sh"

# =============================================================================
# MAIN SCRIPT
# =============================================================================

print_banner "Stopping Services"

COMPOSE_CMD=$(get_compose_cmd)
if [[ -z "$COMPOSE_CMD" ]]; then
    error "Docker Compose is not installed"
    exit 1
fi

print_header "Stopping Containers"

timer_start
$COMPOSE_CMD down
elapsed=$(timer_elapsed)

success "Containers stopped in ${elapsed}"

