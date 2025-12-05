# Docker Development Environment

## Overview

The CFP Selection Simulator uses Docker to provide a consistent, isolated development environment across all platforms. This ensures reproducible analysis and simplifies dependency management.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Host Machine                               │
│  ┌────────────────────────────────────────┐ │
│  │  Docker Container (cfp-simulator-app)  │ │
│  │  ┌──────────────────────────────────┐  │ │
│  │  │  Python 3.12                     │  │ │
│  │  │  Jupyter Lab (port 8888)         │  │ │
│  │  │  All Dependencies Pre-installed  │  │ │
│  │  │                                  │  │ │
│  │  │  /app (mounted from host)        │  │ │
│  │  │    ├── notebooks/                │  │ │
│  │  │    ├── src/                      │  │ │
│  │  │    ├── data/                     │  │ │
│  │  │    └── tests/                    │  │ │
│  │  └──────────────────────────────────┘  │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- **Docker Desktop** 20.10+ ([Download](https://www.docker.com/products/docker-desktop))
- **Docker Compose** 2.0+ (included with Docker Desktop)
- **8GB RAM** allocated to Docker (recommended)
- **10GB disk space** for images and data

### Basic Commands

```bash
# Start environment (builds on first run)
make start
# OR
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop environment
make stop
# OR
docker-compose down

# Rebuild after dependency changes
docker-compose build --no-cache

# Clean up everything
make clean
# OR
docker-compose down -v
```

## Configuration

### Resource Limits

The container is configured with the following resource constraints:

| Resource | Limit | Reservation |
|----------|-------|-------------|
| **CPU** | 4 cores | 2 cores |
| **Memory** | 8 GB | 4 GB |

To adjust these limits, edit `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '4.0'
      memory: 8G
    reservations:
      cpus: '2.0'
      memory: 4G
```

### Port Mapping

| Service | Container Port | Host Port | Purpose |
|---------|---------------|-----------|---------|
| Jupyter Lab | 8888 | 8888 | Web interface |

Access Jupyter Lab at: [http://localhost:8888](http://localhost:8888)

### Volume Mounts

| Mount Point | Type | Purpose |
|-------------|------|---------|
| `.:/app:cached` | Bind | Live code editing |
| `data-cache` | Named | Persistent data storage |
| `jupyter-config` | Named | Jupyter preferences |

## Environment Variables

### Required Variables

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
CFBD_API_KEY=your_api_key_here
```

### Optional Variables

```bash
# Development mode
DEV_MODE=true

# Logging level
LOG_LEVEL=INFO

# Jupyter configuration
JUPYTER_PORT=8888
```

## Security Features

### Non-Root User

The container runs as non-root user `cfpuser` for security:

```dockerfile
RUN groupadd -r cfpuser && \
    useradd -r -g cfpuser -d /app -s /bin/bash cfpuser
USER cfpuser
```

### Health Checks

Container health is monitored via HTTP endpoint:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8888/api"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 15s
```

Check health status:

```bash
docker inspect --format='{{.State.Health.Status}}' cfp-simulator-app
```

## Advanced Usage

### Accessing Container Shell

```bash
# Enter running container
docker-compose exec app bash

# Run one-off command
docker-compose exec app python --version
```

### Running Tests in Container

```bash
# Run full test suite
docker-compose exec app pytest tests/

# Run with coverage
docker-compose exec app pytest --cov=src --cov-report=html

# Run specific test
docker-compose exec app pytest tests/test_data_fetcher.py
```

### Installing Additional Packages

#### Temporary (current session only)

```bash
docker-compose exec app pip install package-name
```

#### Permanent (rebuild required)

1. Add package to `docker/requirements.txt`
2. Rebuild image:

```bash
docker-compose build
docker-compose up
```

### Managing Data Cache

```bash
# View cache location
docker volume inspect cfp-simulator-data-cache

# Backup cache
docker run --rm -v cfp-simulator-data-cache:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz -C /data .

# Restore cache
docker run --rm -v cfp-simulator-data-cache:/data -v $(pwd):/backup alpine tar xzf /backup/data-backup.tar.gz -C /data

# Clear cache
docker volume rm cfp-simulator-data-cache
```

## Troubleshooting

### Port Already in Use

**Problem**: Port 8888 is already bound

**Solution**:
```bash
# Find process using port
lsof -i :8888

# Change port in docker-compose.yml
ports:
  - "8889:8888"  # Use different host port
```

### Permission Errors

**Problem**: Cannot write to mounted volumes

**Solution**:
```bash
# Linux: Fix permissions
sudo chown -R $USER:$USER .

# Windows/Mac: Usually not needed, but check Docker Desktop settings
```

### Container Won't Start

**Problem**: Container exits immediately

**Solution**:
```bash
# Check logs
docker-compose logs app

# Rebuild without cache
docker-compose build --no-cache

# Check Docker Desktop resources
```

### Out of Memory

**Problem**: Container crashes with memory errors

**Solution**:
```bash
# Increase Docker Desktop memory limit
# Docker Desktop - Settings - Resources - Memory
# Set to 8GB or higher
```

### Image Build Fails

**Problem**: Dependency installation errors

**Solution**:
```bash
# Clear Docker build cache
docker system prune -a

# Rebuild
docker-compose build --no-cache --pull
```

## Performance Optimization

### Build Cache

Use BuildKit for faster builds:

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build with cache
docker-compose build
```

### Volume Performance

For better performance on macOS:

```yaml
volumes:
  - .:/app:delegated  # Use delegated for better write performance
```

### Multi-Stage Builds

The Dockerfile uses best practices:

- Separate dependency installation layer
- No cache for pip installs
- Clean up apt cache
- Minimal base image (python:3.12-slim)

## CI/CD Integration

### GitHub Actions

```yaml
- name: Build Docker Image
  run: docker-compose build

- name: Run Tests
  run: docker-compose run --rm app pytest tests/
```

### GitLab CI

```yaml
test:
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker-compose build
    - docker-compose run --rm app pytest tests/
```

## Production Deployment

For production use, consider:

1. **Remove Development Tools**:
   - Remove Jupyter Lab
   - Add production WSGI server

2. **Environment Secrets**:
   - Use Docker secrets or environment injection
   - Never commit `.env` file

3. **Reverse Proxy**:
   - Add nginx for SSL/TLS
   - Configure proper authentication

4. **Monitoring**:
   - Add health check endpoints
   - Configure logging aggregation

5. **Scaling**:
   - Use Docker Swarm or Kubernetes
   - Implement horizontal scaling

## Maintenance

### Update Base Image

```bash
# Pull latest Python image
docker pull python:3.12-slim

# Rebuild
docker-compose build --pull
```

### Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Clean everything
docker system prune -a --volumes
```

## Best Practices

1. **Always use `.env.example`** - Never commit secrets
2. **Keep Dockerfile layered** - Optimize cache usage
3. **Use health checks** - Enable monitoring
4. **Run as non-root** - Security best practice
5. **Pin versions** - Reproducible builds
6. **Document changes** - Update this file

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Best Practices for Writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

## Support

For Docker-related issues:

1. Check [Troubleshooting](#troubleshooting) section
2. View container logs: `docker-compose logs -f`
3. Open issue on GitHub with logs attached
