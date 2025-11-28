#!/bin/bash

set -e

mkdir -p logs findings

echo "🚀 Starting Backend on 0.0.0.0:8000..."
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 3

echo "🚀 Starting Frontend on 0.0.0.0:5000..."
npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

cleanup() {
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "✅ Services running!"
echo "   Frontend: http://0.0.0.0:5000"
echo "   Backend: http://0.0.0.0:8000"

wait
