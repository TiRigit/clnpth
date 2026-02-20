#!/usr/bin/env bash
# One-click start for clnpth (KI-Redaktionssystem)
# Usage: ./start.sh [--stop]

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
PID_DIR="$PROJECT_DIR/.pids"
DOCKER_COMPOSE="/Volumes/AI-Data/AI-Projekt/docker-compose.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[clnpth]${NC} $1"; }
warn() { echo -e "${YELLOW}[clnpth]${NC} $1"; }
err() { echo -e "${RED}[clnpth]${NC} $1"; }

stop_all() {
  log "Stopping services..."
  if [ -f "$PID_DIR/backend.pid" ]; then
    kill "$(cat "$PID_DIR/backend.pid")" 2>/dev/null && log "Backend stopped" || true
    rm -f "$PID_DIR/backend.pid"
  fi
  if [ -f "$PID_DIR/frontend.pid" ]; then
    kill "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null && log "Frontend stopped" || true
    rm -f "$PID_DIR/frontend.pid"
  fi
  log "Done."
  exit 0
}

if [ "${1:-}" = "--stop" ]; then
  stop_all
fi

mkdir -p "$PID_DIR"

# Stop leftover processes
for pidfile in "$PID_DIR"/*.pid; do
  [ -f "$pidfile" ] && kill "$(cat "$pidfile")" 2>/dev/null || true
  rm -f "$pidfile"
done

# 1. PostgreSQL (Docker)
log "Checking PostgreSQL..."
if docker ps --format '{{.Names}}' | grep -q 'postgres'; then
  log "PostgreSQL already running"
else
  log "Starting PostgreSQL..."
  docker compose -f "$DOCKER_COMPOSE" up -d postgres
  sleep 2
  if docker ps --format '{{.Names}}' | grep -q 'postgres'; then
    log "PostgreSQL started"
  else
    err "PostgreSQL failed to start"
    exit 1
  fi
fi

# 2. Backend (uvicorn)
log "Starting backend on :8001..."
cd "$BACKEND_DIR"
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8001 --reload \
  > "$PID_DIR/backend.log" 2>&1 &
echo $! > "$PID_DIR/backend.pid"
cd "$PROJECT_DIR"

# 3. Frontend (vite)
log "Starting frontend on :5173..."
cd "$FRONTEND_DIR"
npm run dev > "$PID_DIR/frontend.log" 2>&1 &
echo $! > "$PID_DIR/frontend.pid"
cd "$PROJECT_DIR"

# Wait for services
sleep 2

# Health check
BACKEND_OK=false
FRONTEND_OK=false

for i in $(seq 1 10); do
  if curl -sf http://localhost:8001/api/health > /dev/null 2>&1; then
    BACKEND_OK=true
    break
  fi
  sleep 1
done

for i in $(seq 1 10); do
  if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    FRONTEND_OK=true
    break
  fi
  sleep 1
done

echo ""
echo -e "  ${GREEN}clnpth KI-Redaktionssystem${NC}"
echo "  ─────────────────────────────"
if $BACKEND_OK; then
  echo -e "  Backend:  ${GREEN}http://localhost:8001${NC}"
else
  echo -e "  Backend:  ${YELLOW}starting...${NC} (check .pids/backend.log)"
fi
if $FRONTEND_OK; then
  echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
else
  echo -e "  Frontend: ${YELLOW}starting...${NC} (check .pids/frontend.log)"
fi
echo "  ─────────────────────────────"
echo -e "  Stop:     ${YELLOW}./start.sh --stop${NC}"
echo ""
