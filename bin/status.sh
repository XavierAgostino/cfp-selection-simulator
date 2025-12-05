#!/bin/bash
# =============================================================================
# Status - Show environment status
# =============================================================================

set -e

# Get script directory and load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${ROOT_DIR}/lib/utils.sh"

# =============================================================================
# MAIN SCRIPT
# =============================================================================

print_banner "Environment Status"

print_header "Docker Status"

if ! check_docker; then
    error "Docker is not running"
    exit 1
fi
success "Docker is running"

COMPOSE_CMD=$(get_compose_cmd)
if [[ -z "$COMPOSE_CMD" ]]; then
    error "Docker Compose is not installed"
    exit 1
fi

print_header "Container Status"

if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "cfp-simulator-app"; then
    success "Container is running"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "cfp-simulator-app"
    echo ""
    info "Jupyter Lab: http://localhost:8888"
else
    warn "Container is not running"
    info "Run 'make start' to start the environment"
fi

print_header "Port Status"

if command -v lsof >/dev/null 2>&1; then
    if lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1; then
        success "Port 8888 is in use"
    else
        warn "Port 8888 is not in use"
    fi
else
    warn "lsof not available - cannot check port status"
fi

