#!/usr/bin/env bash
# =============================================================================
# NutriVision — ngrok tunnel launcher (standalone)
# =============================================================================
# Starts (or re-tunnels) the FastAPI backend and exposes it via ngrok.
# Prints the public HTTPS URL for use in the mobile app Settings screen.
#
# Usage:
#   ./ngrok-start.sh              # tunnel existing backend on :8000
#   ./ngrok-start.sh --port 8080  # custom port
#   ./ngrok-start.sh --stop       # kill ngrok + backend
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[ngrok]${RESET} $*"; }
success() { echo -e "${GREEN}[ngrok]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[ngrok]${RESET} $*"; }
error()   { echo -e "${RED}[ngrok]${RESET} $*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=8000
BACKEND_PID_FILE="/tmp/nutrivision_backend.pid"
BACKEND_LOG="/tmp/nutrivision_backend.log"
NGROK_PID_FILE="/tmp/nutrivision_ngrok.pid"
NGROK_LOG="/tmp/nutrivision_ngrok.log"
START_BACKEND=false

# ── Parse args ────────────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --port)   shift; BACKEND_PORT="$1" ;;
    --backend) START_BACKEND=true ;;
    --stop)
      info "Stopping ngrok + backend..."
      [[ -f "$NGROK_PID_FILE"   ]] && kill "$(cat $NGROK_PID_FILE)"   2>/dev/null && info "ngrok stopped."   || true
      [[ -f "$BACKEND_PID_FILE" ]] && kill "$(cat $BACKEND_PID_FILE)" 2>/dev/null && info "Backend stopped." || true
      rm -f "$NGROK_PID_FILE" "$BACKEND_PID_FILE"
      pkill -f "uvicorn main:app" 2>/dev/null || true
      success "Done."
      exit 0
      ;;
    --help|-h)
      echo ""
      echo -e "  ${BOLD}NutriVision ngrok launcher${RESET}"
      echo ""
      echo "  Usage: ./ngrok-start.sh [options]"
      echo ""
      echo "  Options:"
      echo "    (none)       Tunnel existing backend on port 8000"
      echo "    --backend    Also start the FastAPI backend first"
      echo "    --port N     Use port N instead of 8000"
      echo "    --stop       Stop ngrok and backend"
      echo "    --help       Show this message"
      echo ""
      exit 0
      ;;
  esac
done

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}  ╔══════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}  ║   NutriVision × ngrok  🌐   ║${RESET}"
echo -e "${BOLD}${CYAN}  ╚══════════════════════════════╝${RESET}"
echo ""

# ── Verify ngrok ──────────────────────────────────────────────────────────────
if ! command -v ngrok &>/dev/null; then
  error "ngrok not found. Install from https://ngrok.com and run 'ngrok config add-authtoken <token>'"
  exit 1
fi
info "ngrok $(ngrok version)"

# ── Optionally start the backend ──────────────────────────────────────────────
if $START_BACKEND; then
  # Kill existing backend on port
  if lsof -i ":$BACKEND_PORT" -sTCP:LISTEN -t &>/dev/null; then
    warn "Port $BACKEND_PORT in use — stopping existing process..."
    lsof -ti ":$BACKEND_PORT" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi

  # Find venv Python
  VENV_PYTHON=""
  for candidate in \
      "$SCRIPT_DIR/.venv/bin/python" \
      "$SCRIPT_DIR/venv/bin/python"; do
    [[ -x "$candidate" ]] && { VENV_PYTHON="$candidate"; break; }
  done
  [[ -z "$VENV_PYTHON" ]] && VENV_PYTHON="$(command -v python3)"

  info "Starting FastAPI backend on port $BACKEND_PORT..."
  (
    cd "$SCRIPT_DIR/backend"
    "$VENV_PYTHON" -m uvicorn main:app \
      --host 0.0.0.0 --port "$BACKEND_PORT" --log-level info \
      >> "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
  )

  # Wait for health
  READY=false
  for i in $(seq 1 30); do
    curl -sf "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1 && { READY=true; break; }
    sleep 1
  done
  $READY || { error "Backend failed to start. Check $BACKEND_LOG"; exit 1; }
  success "Backend up → http://localhost:$BACKEND_PORT"
else
  # Verify backend is already reachable
  if ! curl -sf "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
    warn "No backend detected on port $BACKEND_PORT."
    warn "Start it first with:  ./start.sh --backend"
    warn "Or re-run with:       ./ngrok-start.sh --backend"
    exit 1
  fi
  success "Backend already up → http://localhost:$BACKEND_PORT"
fi

# ── Kill any existing ngrok on port 4040 ─────────────────────────────────────
pkill -f "ngrok http" 2>/dev/null || true
sleep 0.5

# ── Start ngrok ───────────────────────────────────────────────────────────────
info "Opening ngrok tunnel → port $BACKEND_PORT..."
ngrok http "$BACKEND_PORT" --domain=sadly-unyearned-pedro.ngrok-free.dev --log=stdout > "$NGROK_LOG" 2>&1 &
NGROK_PID=$!
echo "$NGROK_PID" > "$NGROK_PID_FILE"

# ── Poll ngrok local API for the public URL ───────────────────────────────────
# Static domain — URL is permanent, no need to poll
NGROK_URL="https://sadly-unyearned-pedro.ngrok-free.dev"
info "Static domain: $NGROK_URL"

if [[ -z "$NGROK_URL" ]]; then
  error "ngrok tunnel failed to start. Check $NGROK_LOG"
  kill "$NGROK_PID" 2>/dev/null || true
  exit 1
fi

# ── Print the public URL prominently ─────────────────────────────────────────
echo ""
echo -e "  ${BOLD}${GREEN}┌──────────────────────────────────────────────────────┐${RESET}"
echo -e "  ${BOLD}${GREEN}│  🌐  Public API URL (copy this into the app)          │${RESET}"
echo -e "  ${BOLD}${GREEN}│                                                        │${RESET}"
echo -e "  ${BOLD}${GREEN}│  ${BOLD}${NGROK_URL}${RESET}"
echo -e "  ${BOLD}${GREEN}│                                                        │${RESET}"
echo -e "  ${BOLD}${GREEN}│  Steps:                                                │${RESET}"
echo -e "  ${BOLD}${GREEN}│  1. Open NutriVision app                              │${RESET}"
echo -e "  ${BOLD}${GREEN}│  2. Tap Settings tab                                   │${RESET}"
echo -e "  ${BOLD}${GREEN}│  3. Paste the URL above as the API Server URL         │${RESET}"
echo -e "  ${BOLD}${GREEN}│  4. Works on any device, any network 🚀               │${RESET}"
echo -e "  ${BOLD}${GREEN}└──────────────────────────────────────────────────────┘${RESET}"
echo ""
success "ngrok dashboard → http://localhost:4040"
success "API docs        → ${NGROK_URL}/docs"
echo ""

# ── Keep alive until Ctrl+C ───────────────────────────────────────────────────
info "Press Ctrl+C to stop ngrok."
trap "info 'Stopping ngrok...'; kill $NGROK_PID 2>/dev/null; rm -f $NGROK_PID_FILE; exit 0" INT TERM
wait "$NGROK_PID"
