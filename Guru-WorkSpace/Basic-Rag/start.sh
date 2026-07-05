#!/usr/bin/env bash
# RAG Explorer — Start both backend and frontend
# Usage: ./start.sh
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⚡ RAG Explorer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Prerequisites check ───────────────────────────────────────────────────

if ! command -v python3 &>/dev/null; then
  echo "❌ python3 not found. Install Python 3.10+"; exit 1
fi

if ! command -v node &>/dev/null; then
  echo "❌ node not found. Install Node.js 18+"; exit 1
fi

if ! command -v ollama &>/dev/null; then
  echo "⚠  ollama not found. Install from https://ollama.com and run:"
  echo "   ollama pull nomic-embed-text"
fi

# ── Backend setup ─────────────────────────────────────────────────────────

cd "$ROOT/backend"

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "📝 Created backend/.env from .env.example — add your GROQ_API_KEY!"
  fi
fi

if [ ! -d "venv" ]; then
  echo "🐍 Creating Python virtualenv…"
  python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "✅ Python dependencies ready"

# Load .env safely (avoids bash misreading < > as redirects)
if [ -f .env ]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue   # skip comments
    [[ -z "${key// }" ]] && continue              # skip blank lines
    value="${value%%#*}"                           # strip inline comments
    value="${value%"${value##*[![:space:]]}"}"     # trim trailing whitespace
    [[ "$value" == *"<"* ]] && continue           # skip unfilled placeholders
    export "$key=$value"
  done < .env
fi

# Start backend in background
uvicorn app:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "🚀 Backend started on http://localhost:8000 (PID $BACKEND_PID)"

# ── Frontend setup ────────────────────────────────────────────────────────

cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm packages…"
  npm install
fi

echo "🎨 Starting frontend on http://localhost:3500…"
npm run dev &
FRONTEND_PID=$!

# ── Cleanup on exit ───────────────────────────────────────────────────────

trap "echo ''; echo 'Shutting down…'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Frontend : http://localhost:3500"
echo "  Backend  : http://localhost:8000"
echo "  API docs : http://localhost:8000/docs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Press Ctrl+C to stop."

wait
