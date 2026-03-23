#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

# Start backend
echo "Starting backend..."
cd "$DIR/backend"
bun run dev &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd "$DIR/frontend"
bun run dev &
FRONTEND_PID=$!

echo ""
echo "  ruhclaw running:"
echo "  Frontend → http://localhost:5173"
echo "  Backend  → http://localhost:3000"
echo "  Swagger  → http://localhost:3000/docs"
echo ""
echo "  Press Ctrl+C to stop both"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
