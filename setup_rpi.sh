#!/usr/bin/env bash
# ======================================================================
# Wake Up Crypto - Raspberry Pi + Cloudflare Zero Trust Deploy Script (v9.1)
# ======================================================================
set -euo pipefail

echo "========================================================"
echo " [1/6] Checking Environment & File Integrity..."
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

# Safe cache directory initialization
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
echo " [2/6] Checking Docker & Docker Compose..."
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
echo " [3/6] Generating Cloudflare Zero Trust + RPi Compose Config..."
echo "========================================================"
cat << 'EOF' > docker-compose.yml
services:
  crypto-detective:
    build: .
    container_name: crypto-detective
    restart: unless-stopped
    ports:
      - "${HOST_BIND_IP:-0.0.0.0}:${PORT:-8088}:8088"
    env_file:
      - .env
    environment:
      - CACHE_TTL_SECONDS=${CACHE_TTL_SECONDS:-900}
      - RATE_LIMIT_PER_MIN=${RATE_LIMIT_PER_MIN:-25}
      - TRUST_PROXY_HEADERS=${TRUST_PROXY_HEADERS:-true}
      - PROXY_STRATEGY=${PROXY_STRATEGY:-cloudflare}
      - PROXY_CLIENT_IP_HEADER=${PROXY_CLIENT_IP_HEADER:-cf-connecting-ip}
      - TRUSTED_PROXIES=${TRUSTED_PROXIES:-127.0.0.1,::1,172.16.0.0/12,10.0.0.0/8,192.168.0.0/16}
      - CSP_MODE=${CSP_MODE:-report-only}
    tmpfs:
      - /app/data_cache:size=32m,uid=1000,gid=1000
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8088/healthz')"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          memory: 384M
          cpus: '1.5'
EOF
echo "--> Updated docker-compose.yml (Cloudflare Zero Trust & RPi SD-card log rotation enabled)"

echo "========================================================"
echo " [4/6] Building & Launching Container Safely..."
echo "========================================================"
docker compose build
docker compose up -d

echo "========================================================"
echo " [5/6] Verifying Container Health..."
echo "========================================================"
sleep 3
if docker ps --filter "name=crypto-detective" --filter "status=running" | grep -q crypto-detective; then
    echo ">>> Setup Completed Successfully! Container 'crypto-detective' is running."
    echo ">>> Healthcheck: $(curl -fsS http://localhost:8088/healthz || echo 'starting...')"
else
    echo "Warning: Container may not have started properly. Check: docker compose logs"
fi

echo "========================================================"
echo " [6/6] Cloudflare Zero Trust (cloudflared) Tunnel Guide"
echo "========================================================"
echo " 1. Cloudflare Zero Trust Dashboard -> Networks -> Tunnels -> Public Hostname"
echo " 2. Service Type: HTTP | URL: localhost:8088"
echo " 3. Real visitor IPs are automatically parsed via CF-Connecting-IP header."
