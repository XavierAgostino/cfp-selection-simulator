#!/bin/bash
# =============================================================================
# Cleanup - Clean up resources
# =============================================================================

set -e

# Get script directory and load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${ROOT_DIR}/lib/utils.sh"

# =============================================================================
# MAIN SCRIPT
# =============================================================================

print_banner "Cleanup"

COMPOSE_CMD=$(get_compose_cmd)
if [[ -z "$COMPOSE_CMD" ]]; then
    error "Docker Compose is not installed"
    exit 1
fi

print_header "Stopping Containers"

$COMPOSE_CMD down

print_header "Removing Resources"

timer_start

# Remove containers
if docker ps -a --format "{{.Names}}" | grep -q "cfp-simulator-app"; then
    docker rm -f cfp-simulator-app 2>/dev/null || true
    success "Removed containers"
fi

# Remove images
if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "cfp-selection-simulator"; then
    docker rmi -f $(docker images "cfp-selection-simulator*" -q) 2>/dev/null || true
    success "Removed images"
fi

# Remove volumes
$COMPOSE_CMD down -v 2>/dev/null || true

elapsed=$(timer_elapsed)

success "Cleanup completed in ${elapsed}"

print_header "Summary"

info "All Docker resources have been removed"
info "Run 'make setup' to rebuild the environment"

