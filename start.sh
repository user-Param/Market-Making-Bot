#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n[SYSTEM] Shutting down services..."
    # Kill all background processes started by this script
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

echo "==========================================="
echo "   Market Making Bot Startup Script        "
echo "==========================================="

# 1. Build and Start Backend (C++)
echo "[1/2] Starting C++ Backend..."
mkdir -p build
cd build
cmake .. > /dev/null
if [ $? -ne 0 ]; then
    echo "ERROR: CMake configuration failed."
    exit 1
fi

make -j$(sysctl -n hw.ncpu) > /dev/null
if [ $? -ne 0 ]; then
    echo "ERROR: Backend compilation failed."
    exit 1
fi

./jupiter_feed &
BACKEND_PID=$!
cd ..
echo "      Backend running (PID: $BACKEND_PID)"

# 2. Start Frontend (Next.js)
echo "[2/2] Starting Next.js Frontend..."
cd interface/arbot

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "      Installing frontend dependencies (this may take a minute)..."
    npm install --silent
fi

npm run dev &
FRONTEND_PID=$!
cd ../..
echo "      Frontend running (PID: $FRONTEND_PID)"

echo "==========================================="
echo "   All services active. Press Ctrl+C to stop."
echo "   Frontend: http://localhost:3000"
echo "==========================================="

# Wait for background processes to keep the script alive
wait
