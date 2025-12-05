#!/bin/bash
# =============================================================================
# Setup - One-time environment setup
# =============================================================================

set -e

# Get script directory and load utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${ROOT_DIR}/lib/utils.sh"

# =============================================================================
# MAIN SCRIPT
# =============================================================================

print_banner "CFP Selection Simulator Setup"

# Step 1: Pre-flight checks
print_header "Pre-flight Checks"

if ! check_docker; then
    exit 1
fi
success "Docker is running"

COMPOSE_CMD=$(get_compose_cmd)
if [[ -z "$COMPOSE_CMD" ]]; then
    error "Docker Compose is not installed"
    exit 1
fi
success "Docker Compose is available"

# Step 2: Build Docker image
print_header "Building Docker Image"

timer_start
$COMPOSE_CMD build
elapsed=$(timer_elapsed)

success "Docker image built in ${elapsed}"

# Step 3: Summary
print_header "Setup Complete"

success "Environment is ready"
info "Run 'make start' to start the development environment"
info "Jupyter Lab will be available at http://localhost:8888"

