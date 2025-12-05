# =============================================================================
# CFP Selection Simulator - Docker Image
# =============================================================================
# Multi-stage build for optimized production image
# Build: docker build -f docker/Dockerfile -t cfp-simulator:latest .
# Run:   docker-compose up
# =============================================================================

FROM python:3.12-slim as base

# Metadata
LABEL maintainer="Xavier Agostino"
LABEL description="Data-driven ranking system for college football playoff selection"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/yourusername/cfp-selection-simulator"

# =============================================================================
# Environment Configuration
# =============================================================================

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    JUPYTER_ENABLE_LAB=yes \
    JUPYTER_PORT=8888

# =============================================================================
# System Dependencies
# =============================================================================

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    vim \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# =============================================================================
# Application Setup
# =============================================================================

WORKDIR /app

# Copy and install Python dependencies
# (Separate layer for better caching)
COPY docker/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r /tmp/requirements.txt && \
    rm -f /tmp/requirements.txt

# Create necessary directories
RUN mkdir -p /app/data/cache /app/notebooks /app/src /app/tests

# =============================================================================
# Security & User Configuration
# =============================================================================

# Create non-root user for security
RUN groupadd -r cfpuser && \
    useradd -r -g cfpuser -d /app -s /bin/bash cfpuser && \
    chown -R cfpuser:cfpuser /app

# Switch to non-root user
USER cfpuser

# =============================================================================
# Network Configuration
# =============================================================================

# Expose Jupyter Lab port
EXPOSE ${JUPYTER_PORT}

# =============================================================================
# Health Check
# =============================================================================

HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=15s \
            --retries=3 \
    CMD curl -f http://localhost:${JUPYTER_PORT}/api || exit 1

# =============================================================================
# Startup Command
# =============================================================================

CMD ["jupyter", "lab", \
     "--ip=0.0.0.0", \
     "--port=8888", \
     "--no-browser", \
     "--ServerApp.token=''", \
     "--ServerApp.password=''", \
     "--ServerApp.allow_origin='*'", \
     "--ServerApp.base_url=/", \
     "--ServerApp.root_dir=/app"]

