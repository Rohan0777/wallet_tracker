#!/usr/bin/env bash
# ======================================================================
# Wake Up Crypto - Raspberry Pi 4B / Linux Safe Setup & Deploy Script (v9.1)
# ======================================================================
set -euo pipefail

echo "========================================================"
echo " [1/5] Checking Environment & File Integrity..."
echo "========================================================"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# Verify critical project files exist before taking any action
REQUIRED_FILES=("server.py" "multichain_tracker.py" "address_utils.py" "Dockerfile" "requirements.txt")
for f in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$f" ]; then
        echo "Error: Required file '$f' not found in $APP_DIR. Aborting deploy." >&2
        exit 1
    fi
done

# Safe cache directory initialization (NO destructive deletion of git or deployment configs)
mkdir -p data_cache

# Environment configuration
if [ -f ".env" ]; then
    echo "--> Locking existing .env file permissions (chmod 600)..."
    chmod 600 .env
else
    echo "--> Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        chmod 600 .env
        echo "--> Notice: Please edit .env to configure your real API keys."
    else
        echo "Error: Neither .env nor .env.example found." >&2
        exit 1
    fi
fi

echo "========================================================"
echo " [2/5] Checking Docker & Docker Compose..."
echo "========================================================"
if ! command -v docker &> /dev/null; then
    echo "--> Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker "$USER"
    rm -f get-docker.sh
    echo "--> Docker installed. You may need to re-login if permission errors occur."
fi

echo "========================================================"
echo " [3/5] Verifying Production Compose Configuration..."
echo "========================================================"
# Maintain safe docker-compose.yml referencing project root Dockerfile
if [ ! -f "docker-compose.yml" ]; then
    cat << 'EOF' > docker-compose.yml
services:
  crypto-detective:
    build: .
    container_name: crypto-detective
    restart: unless-stopped
    ports:
      - "8088:8088"
    env_file:
      - .env
    environment:
      - CACHE_TTL_SECONDS=900
      - RATE_LIMIT_PER_MIN=25
      - TRUST_PROXY_HEADERS=false
    tmpfs:
      - /app/data_cache:size=32m,uid=1000,gid=1000
    security_opt:
      - no-new-privileges:true
    deploy:
      resources:
        limits:
          memory: 384M
          cpus: '1.5'
EOF
    echo "--> Created default docker-compose.yml"
fi

echo "========================================================"
echo " [4/5] Building & Launching Container Safely..."
echo "========================================================"
# Use graceful build & recreate without killing unrelated system containers
docker compose build
docker compose up -d

echo "========================================================"
echo " [5/5] Verifying Container Health..."
echo "========================================================"
sleep 3
if docker ps --filter "name=crypto-detective" --filter "status=running" | grep -q crypto-detective; then
    echo ">>> Setup Completed Successfully! Container 'crypto-detective' is running."
    echo ">>> Check running container: docker ps"
    echo ">>> View logs: docker compose logs -f"
else
    echo "Warning: Container may not have started properly. Check: docker compose logs"
fi