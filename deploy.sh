#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CVerify — Production Deploy Script
# Place this file in the project root on your VM alongside docker-compose.yml
#
# What it does:
#   1. Stop & remove running containers  (volumes/data are KEPT)
#   2. Pull latest images from Docker Hub
#   3. Start containers with the production compose
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Resolve project root (works whether called directly or via CI) ───────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'   # No Color

log()  { echo -e "${CYAN}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[  ok  ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ warn ]${NC} $*"; }
fail() { echo -e "${RED}[ fail ]${NC} $*"; exit 1; }

# ── Detect docker compose command (v2 plugin or v1 standalone) ───────────────
if docker compose version > /dev/null 2>&1; then
  COMPOSE=(docker compose -f "$SCRIPT_DIR/docker-compose.yml" -f "$SCRIPT_DIR/docker-compose.prod.yml")
elif command -v docker-compose > /dev/null 2>&1; then
  warn "Using legacy docker-compose (v1). Consider upgrading to Docker Compose v2."
  COMPOSE=(docker-compose -f "$SCRIPT_DIR/docker-compose.yml" -f "$SCRIPT_DIR/docker-compose.prod.yml")
else
  fail "Neither 'docker compose' nor 'docker-compose' found. Install Docker Compose."
fi

# ── File checks ───────────────────────────────────────────────
[[ -f "$SCRIPT_DIR/docker-compose.yml" ]]      || fail "docker-compose.yml not found in $SCRIPT_DIR"
[[ -f "$SCRIPT_DIR/docker-compose.prod.yml" ]] || fail "docker-compose.prod.yml not found in $SCRIPT_DIR"

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}        CVerify — Production Deployment            ${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

# ── Step 1: Stop & remove containers (keep volumes) ──────────
log "Stopping and removing containers..."
if "${COMPOSE[@]}" ps --quiet 2>/dev/null | grep -q .; then
    "${COMPOSE[@]}" down --remove-orphans
    ok "Containers stopped and removed. Volumes and data are intact."
else
    warn "No running containers found — skipping stop."
fi

echo ""

# ── Step 2: Pull latest images ────────────────────────────────
log "Pulling latest images from Docker Hub..."
"${COMPOSE[@]}" pull
ok "Images updated."

echo ""

# ── Step 3: Start containers ──────────────────────────────────
log "Starting containers in detached mode..."
"${COMPOSE[@]}" up -d --remove-orphans
ok "Containers started."

echo ""

# ── Step 4: Status summary ────────────────────────────────────
log "Container status:"
"${COMPOSE[@]}" ps

echo ""

# ── Step 5: Quick health check (wait up to 45 s) ─────────────
log "Waiting for backend to become healthy..."
SECONDS_WAITED=0
MAX_WAIT=45

until docker inspect --format='{{.State.Health.Status}}' \
        "$("${COMPOSE[@]}" ps -q backend 2>/dev/null)" \
        2>/dev/null | grep -q "healthy"; do
    if (( SECONDS_WAITED >= MAX_WAIT )); then
        warn "Backend health check timed out after ${MAX_WAIT}s — check logs with:"
        warn "  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend"
        break
    fi
    printf "."
    sleep 3
    (( SECONDS_WAITED += 3 ))
done

echo ""
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
ok "Deployment complete!"
echo -e "  ${CYAN}App          →${NC} http://$(hostname -I | awk '{print $1}')"
echo -e "  ${CYAN}Traefik UI   →${NC} http://$(hostname -I | awk '{print $1}'):8090"
echo -e "  ${CYAN}n8n Admin    →${NC} http://$(hostname -I | awk '{print $1}'):5678"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""
