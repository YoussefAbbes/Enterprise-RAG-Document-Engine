# =============================================================================
# Enterprise RAG Document Engine - Backend Dockerfile
# =============================================================================
# Multi-stage build for optimal image size and caching
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder
# ---------------------------------------------------------------------------
# Install dependencies in a separate stage to leverage Docker layer caching.
# This means rebuilding the app doesn't re-download all packages.
# ---------------------------------------------------------------------------
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user --timeout=300 -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2: Runtime
# ---------------------------------------------------------------------------
# Minimal runtime image with only necessary dependencies
# ---------------------------------------------------------------------------
FROM python:3.11-slim as runtime

WORKDIR /app

# Install runtime dependencies
# - curl: For health checks
# - libpq5: PostgreSQL client library for asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Ensure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY ./app /app/app

# Create non-root user for security (optional but recommended)
# RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
# USER appuser

# Expose the application port
EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application with uvicorn
# - workers: Adjust based on CPU cores (2 * cores + 1 is a good starting point)
# - reload: Disabled in production, enabled via docker-compose volume mount for dev
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
