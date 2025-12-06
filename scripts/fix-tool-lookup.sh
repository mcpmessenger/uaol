#!/bin/bash
# Script to fix the "Tool not found" issue
# This rebuilds the shared package and restarts services

echo "========================================"
echo "  Fixing Tool Lookup Issue"
echo "========================================"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
SHARED_DIR="$BACKEND_DIR/shared"

echo "1. Rebuilding shared package..."
cd "$SHARED_DIR"
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "2. Next steps:"
echo "   - Restart all backend services:"
echo "     cd $BACKEND_DIR"
echo "     npm run dev"
echo ""
echo "   - Or use the startup script:"
echo "     bash $SCRIPT_DIR/start-all-services.sh"
echo ""
echo "3. Test the fix:"
echo "   curl http://localhost:3004/proxy/940bb568-d19e-42fa-aa10-d880f5267e1c/tools"
echo ""
