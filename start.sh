#!/usr/bin/env bash
# =============================================================================
# NutriVision — End-to-End Startup Script
# =============================================================================
# Starts the FastAPI backend and the Expo mobile app in one command.
#
# Usage:
#   ./start.sh              # default: backend + expo (shows QR code)
#   ./start.sh --android    # backend + open Android emulator
#   ./start.sh --web        # backend + open in browser
#   ./start.sh --backend    # backend only (no mobile)
#   ./start.sh --stop       # kill any running backend/expo processes
# =============================================================================

set -euo pipefail

# ── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[nutrivision]${RESET} $*"; }
success() { echo -e "${GREEN}[nutrivision]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[nutrivision]${RESET} $*"; }
error()   { echo -e "${RED}[nutrivision]${RESET} $*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID_FILE="/tmp/nutrivision_backend.pid"
BACKEND_LOG="/tmp/nutrivision_backend.log"
BACKEND_PORT=8000

# ── Parse arguments ──────────────────────────────────────────────────────────
MOBILE_TARGET="start"   # default: QR code
BACKEND_ONLY=false
USE_NGROK=false
NGROK_PID_FILE="/tmp/nutrivision_ngrok.pid"

for arg in "$@"; do
  case "$arg" in
    --android)  MOBILE_TARGET="android" ;;
    --web)      MOBILE_TARGET="web"     ;;
    --backend)  BACKEND_ONLY=true       ;;
    --ngrok)    USE_NGROK=true          ;;
    --stop)
      info "Stopping NutriVision processes..."
      if [[ -f "$BACKEND_PID_FILE" ]]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
          kill "$PID" && success "Backend (PID $PID) stopped."
        else
          warn "Backend PID $PID not running."
        fi
        rm -f "$BACKEND_PID_FILE"
      else
        warn "No backend PID file found."
      fi
      # also kill any stray expo/uvicorn/ngrok processes from this project
      pkill -f "uvicorn main:app" 2>/dev/null && info "Killed stray uvicorn." || true
      pkill -f "expo start"       2>/dev/null && info "Killed stray expo."    || true
      if [[ -f "$NGROK_PID_FILE" ]]; then
        NGPID=$(cat "$NGROK_PID_FILE")
        kill "$NGPID" 2>/dev/null && info "ngrok (PID $NGPID) stopped." || true
        rm -f "$NGROK_PID_FILE"
      fi
      success "Done."
      exit 0
      ;;
    --help|-h)
      echo ""
      echo -e "  ${BOLD}NutriVision startup script${RESET}"
      echo ""
      echo "  Usage: ./start.sh [option]"
      echo ""
      echo "  Options:"
      echo "    (none)      Start backend + Expo dev server (scan QR code)"
      echo "    --android   Start backend + open Android emulator"
      echo "    --web       Start backend + open browser preview"
      echo "    --backend   Start backend only (no mobile)"
      echo "    --ngrok     Tunnel backend via ngrok and print the public URL"
      echo "    --stop      Stop all NutriVision processes"
      echo "    --help      Show this message"
      echo ""
      exit 0
      ;;
    *)
      error "Unknown argument: $arg  (use --help for usage)"
      exit 1
      ;;
  esac
done

# ── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}  ╔══════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}  ║       NutriVision  🍎        ║${RESET}"
echo -e "${BOLD}${CYAN}  ╚══════════════════════════════╝${RESET}"
echo ""

# ── 1. Locate Python virtualenv ───────────────────────────────────────────────
VENV_PYTHON=""
for candidate in \
    "$SCRIPT_DIR/.venv/bin/python" \
    "$SCRIPT_DIR/venv/bin/python" \
    "$SCRIPT_DIR/backend/.venv/bin/python"; do
  if [[ -x "$candidate" ]]; then
    VENV_PYTHON="$candidate"
    break
  fi
done

if [[ -z "$VENV_PYTHON" ]]; then
  warn "No .venv found. Falling back to system Python."
  VENV_PYTHON="$(command -v python3 || command -v python)"
fi

PYTHON_VERSION=$("$VENV_PYTHON" --version 2>&1)
info "Python : $PYTHON_VERSION  ($VENV_PYTHON)"

# ── 2. Verify backend dependencies ───────────────────────────────────────────
info "Checking backend dependencies..."
MISSING_DEPS=()
for pkg in fastapi uvicorn PIL pydantic; do
  "$VENV_PYTHON" -c "import $pkg" 2>/dev/null || MISSING_DEPS+=("$pkg")
done

if [[ ${#MISSING_DEPS[@]} -gt 0 ]]; then
  warn "Missing packages: ${MISSING_DEPS[*]}"
  info "Installing backend requirements..."
  "$VENV_PYTHON" -m pip install -r "$SCRIPT_DIR/backend/requirements.txt" --quiet
  success "Backend dependencies installed."
else
  success "Backend dependencies OK."
fi

# ── 3. Check backend port availability ───────────────────────────────────────
if lsof -i ":$BACKEND_PORT" -sTCP:LISTEN -t &>/dev/null; then
  warn "Port $BACKEND_PORT already in use. Attempting to stop existing backend..."
  lsof -ti ":$BACKEND_PORT" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# ── 4. Start FastAPI backend ──────────────────────────────────────────────────
info "Starting FastAPI backend on port $BACKEND_PORT..."

(
  cd "$SCRIPT_DIR/backend"
  "$VENV_PYTHON" -m uvicorn main:app \
    --host 0.0.0.0 \
    --port "$BACKEND_PORT" \
    --log-level info \
    >> "$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
)

BACKEND_PID=$(cat "$BACKEND_PID_FILE")
info "Backend PID $BACKEND_PID — waiting for it to be ready..."

# Poll /health until it responds (up to 30 s)
READY=false
for i in $(seq 1 30); do
  if curl -sf "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
    READY=true
    break
  fi
  sleep 1
done

if $READY; then
  success "Backend is up → http://localhost:$BACKEND_PORT"
  success "API docs     → http://localhost:$BACKEND_PORT/docs"
else
  error "Backend failed to start within 30 s. Check logs: $BACKEND_LOG"
  if kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID"
  fi
  exit 1
fi

# ── 4b. Launch ngrok tunnel (optional) ───────────────────────────────────────
NGROK_URL=""
if $USE_NGROK; then
  if ! command -v ngrok &>/dev/null; then
    error "ngrok not found. Install it from https://ngrok.com then re-run."
    kill "$BACKEND_PID" 2>/dev/null; exit 1
  fi
  info "Starting ngrok tunnel on port $BACKEND_PORT..."
  # Launch ngrok in background; its web API listens on 4040
  ngrok http "$BACKEND_PORT" --domain=sadly-unyearned-pedro.ngrok-free.dev --log=stdout > /tmp/nutrivision_ngrok.log 2>&1 &
  echo $! > "$NGROK_PID_FILE"

  # Static domain — URL is permanent, no polling needed
  NGROK_URL="https://sadly-unyearned-pedro.ngrok-free.dev"
  echo ""
  echo -e "  ${BOLD}${GREEN}┌─────────────────────────────────────────────┐${RESET}"
  echo -e "  ${BOLD}${GREEN}│  🌐  Public API URL (ngrok)                  │${RESET}"
  echo -e "  ${BOLD}${GREEN}│  ${NGROK_URL}${RESET}"
  echo -e "  ${BOLD}${GREEN}│                                              │${RESET}"
  echo -e "  ${BOLD}${GREEN}│  Use this URL in the app Settings screen     │${RESET}"
  echo -e "  ${BOLD}${GREEN}│  Works on any device, any network            │${RESET}"
  echo -e "  ${BOLD}${GREEN}└─────────────────────────────────────────────┘${RESET}"
  echo ""
  success "ngrok dashboard → http://localhost:4040"
fi

# ── 5. Early exit if --backend only ──────────────────────────────────────────
if $BACKEND_ONLY; then
  echo ""
  success "Backend running. Press Ctrl+C to stop."
  trap "kill $BACKEND_PID 2>/dev/null; [[ -f $NGROK_PID_FILE ]] && kill \$(cat $NGROK_PID_FILE) 2>/dev/null; rm -f $NGROK_PID_FILE; exit 0" INT TERM
  wait "$BACKEND_PID"
  exit 0
fi

# ── 6. Check Node / npm ───────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  error "Node.js not found. Install it from https://nodejs.org then re-run."
  kill "$BACKEND_PID" 2>/dev/null
  exit 1
fi
if ! command -v npm &>/dev/null; then
  error "npm not found. Please install npm then re-run."
  kill "$BACKEND_PID" 2>/dev/null
  exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
info "Node : $NODE_VERSION   npm : $NPM_VERSION"

# ── 7. Install mobile dependencies if needed ─────────────────────────────────
if [[ ! -d "$SCRIPT_DIR/mobile/node_modules" ]]; then
  info "Installing mobile npm dependencies (first run)..."
  npm install --prefix "$SCRIPT_DIR/mobile" --silent
  success "npm install complete."
else
  success "mobile/node_modules present — skipping npm install."
fi

# ── 8. Print connection info ──────────────────────────────────────────────────
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")
echo ""
echo -e "  ${BOLD}Connection info${RESET}"
echo -e "  Android emulator : ${GREEN}http://10.0.2.2:$BACKEND_PORT${RESET}"
echo -e "  Physical device  : ${GREEN}http://$LOCAL_IP:$BACKEND_PORT${RESET}"
echo -e "  Browser / web    : ${GREEN}http://localhost:$BACKEND_PORT${RESET}"
if [[ -n "$NGROK_URL" ]]; then
  echo -e "  Public (ngrok)   : ${GREEN}$NGROK_URL${RESET}"
fi
echo ""
echo -e "  ${YELLOW}Tip:${RESET} Open the app → Settings and set the API URL above."
echo ""

# ── 9. Resolve browser for web target ────────────────────────────────────────
# Always detect a working browser — do not inherit BROWSER from the shell
# because it may point to a binary that isn't on PATH (e.g. zen-browser).
BROWSER=""
for candidate in chromium google-chrome chromium-browser; do
  if command -v "$candidate" &>/dev/null; then
    BROWSER="$candidate"
    break
  fi
done

if [[ -n "$BROWSER" ]]; then
  export BROWSER
  info "Browser : $BROWSER"
else
  warn "No supported browser found (chromium / google-chrome). Expo will try the default."
fi

# ── 10. Start Expo ────────────────────────────────────────────────────────────
info "Starting Expo ($MOBILE_TARGET)..."

cleanup() {
  info "Shutting down..."
  kill "$BACKEND_PID" 2>/dev/null && info "Backend stopped." || true
  if [[ -f "$NGROK_PID_FILE" ]]; then
    kill "$(cat $NGROK_PID_FILE)" 2>/dev/null && info "ngrok stopped." || true
    rm -f "$NGROK_PID_FILE"
  fi
  exit 0
}
trap cleanup INT TERM

cd "$SCRIPT_DIR/mobile"
npm run "$MOBILE_TARGET"

# If expo exits, stop the backend too
kill "$BACKEND_PID" 2>/dev/null || true
success "All services stopped."
