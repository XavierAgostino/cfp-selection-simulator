#!/bin/bash
# =============================================================================
# Shared Utilities Library
# =============================================================================

# Prevent multiple sourcing
[[ -n "${_UTILS_LOADED:-}" ]] && return 0
_UTILS_LOADED=1

# =============================================================================
# COLORS (only if terminal supports them)
# =============================================================================

if [[ -t 1 ]] && [[ "${TERM:-}" != "dumb" ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    BOLD='\033[1m'
    DIM='\033[2m'
    RESET='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' BOLD='' DIM='' RESET=''
fi

# =============================================================================
# SYMBOLS
# =============================================================================

SYMBOL_CHECK="✓"
SYMBOL_CROSS="✗"
SYMBOL_ARROW="→"
SYMBOL_BULLET="•"
SYMBOL_WARN="⚠"

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================

success() { echo -e "${GREEN}${SYMBOL_CHECK}${RESET} $*"; }
error() { echo -e "${RED}${SYMBOL_CROSS}${RESET} $*" >&2; }
warn() { echo -e "${YELLOW}${SYMBOL_WARN}${RESET} $*"; }
info() { echo -e "${CYAN}ℹ${RESET} $*"; }

step() {
    local num="$1" total="$2"
    shift 2
    echo -e "${BOLD}[${num}/${total}]${RESET} $*"
}

# =============================================================================
# BOX DRAWING
# =============================================================================

print_header() {
    local title="$1"
    local width=60
    echo ""
    echo -e "${BOLD}${title}${RESET}"
    echo -e "${DIM}$(printf '─%.0s' $(seq 1 $width))${RESET}"
}

print_banner() {
    local name="${1:-Project}"
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
    echo -e "${BOLD}   ${name}${RESET}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════${RESET}"
    echo ""
}

print_server_box() {
    local url="$1"
    local name="${2:-Server}"
    echo ""
    echo -e "${GREEN}┌────────────────────────────────────────────────────────┐${RESET}"
    echo -e "${GREEN}│${RESET} ${BOLD}${name} is running${RESET}                                    ${GREEN}│${RESET}"
    echo -e "${GREEN}├────────────────────────────────────────────────────────┤${RESET}"
    echo -e "${GREEN}│${RESET}   ${CYAN}${url}${RESET}$(printf ' %.0s' $(seq 1 $((40 - ${#url}))))${GREEN}│${RESET}"
    echo -e "${GREEN}│${RESET}   Press Ctrl+C to stop                                ${GREEN}│${RESET}"
    echo -e "${GREEN}└────────────────────────────────────────────────────────┘${RESET}"
    echo ""
}

# =============================================================================
# DOCKER UTILITIES
# =============================================================================

check_docker() {
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running"
        echo "  Please start Docker Desktop and try again."
        return 1
    fi
    return 0
}

check_port() {
    local port="${1:-8888}"
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
            error "Port $port is already in use"
            return 1
        fi
    fi
    return 0
}

get_compose_cmd() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif docker-compose version >/dev/null 2>&1; then
        echo "docker-compose"
    else
        echo ""
    fi
}

# =============================================================================
# TIME UTILITIES
# =============================================================================

timer_start() { _TIMER_START=$(date +%s); }

timer_elapsed() {
    local end=$(date +%s)
    local elapsed=$((end - ${_TIMER_START:-$end}))
    if [[ $elapsed -lt 60 ]]; then
        echo "${elapsed}s"
    else
        echo "$((elapsed / 60))m $((elapsed % 60))s"
    fi
}

# =============================================================================
# CLEANUP TRAP
# =============================================================================

cleanup_on_exit() {
    printf "\033[?25h"  # Show cursor
    echo -e "${RESET}"
}

trap cleanup_on_exit EXIT INT TERM

