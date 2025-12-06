#!/bin/bash
# Bash script to start all backend services
# This starts all services needed for the workflow builder and MCP tools

echo "========================================"
echo "  Starting UAOL Backend Services"
echo "========================================"
echo ""

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Error: backend directory not found at: $BACKEND_DIR"
    exit 1
fi

# Check if .env exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "⚠️  Warning: backend/.env file not found"
    echo "   Services may not start correctly without environment variables"
    echo ""
fi

echo "Services that will start:"
echo "  ✓ API Gateway (port 3000)"
echo "  ✓ Auth Service (port 3001)"
echo "  ✓ Tool Registry Service (port 3002)"
echo "  ✓ Job Orchestration Service (port 3003)"
echo "  ✓ Tool Proxy Service (port 3004)"
echo "  ✓ Billing Service (port 3005)"
echo "  ✓ Storage Service (port 3006)"
echo ""

echo "Changing to backend directory..."
cd "$BACKEND_DIR"

echo ""
echo "Starting all services..."
echo "  (Press Ctrl+C to stop all services)"
echo ""

# Start all services using npm run dev
npm run dev
