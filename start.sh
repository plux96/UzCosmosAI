#!/bin/bash
echo "========================================"
echo "  UzCosmos AI — Mission Control"
echo "  Starting all systems..."
echo "========================================"

# Start backend
echo "[1/2] Starting backend (10 agents)..."
cd "$(dirname "$0")"
python main.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "[2/2] Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  UzCosmos AI is ONLINE!"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:8000/docs"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
