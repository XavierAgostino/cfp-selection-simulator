#!/bin/bash
# =============================================================================
# Start - Start development environment
# =============================================================================

set -e

# Get script directory and load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${ROOT_DIR}/lib/utils.sh"

# =============================================================================
# MAIN SCRIPT
# =============================================================================

print_banner "CFP Selection Simulator"

# Step 1: Pre-flight checks
print_header "Pre-flight Checks"

if ! check_docker; then
    exit 1
fi
success "Docker is running"

if ! check_port 8888; then
    warn "Port 8888 is in use. Stopping existing container..."
    $ROOT_DIR/bin/stop.sh
    sleep 2
fi

COMPOSE_CMD=$(get_compose_cmd)
if [[ -z "$COMPOSE_CMD" ]]; then
    error "Docker Compose is not installed"
    exit 1
fi
success "Docker Compose is available"

# Step 2: Start services
print_header "Starting Services"

timer_start
$COMPOSE_CMD up -d
elapsed=$(timer_elapsed)

success "Services started in ${elapsed}"

# Step 3: Wait for Jupyter to be ready
print_header "Waiting for Jupyter Lab"

info "Starting Jupyter Lab..."
sleep 3

# Step 4: Show result
print_server_box "http://localhost:8888" "Jupyter Lab"
info "Access token will be shown in container logs"
info "Run 'docker logs cfp-simulator-app' to see the token"
info "Run 'make stop' to stop the environment"

