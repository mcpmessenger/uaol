# Quick Fix: Port Conflicts (3002, 3004)

## The Problem
You're getting `EADDRINUSE` errors because ports 3002 and 3004 are already in use.

## Quick Solution

### Option 1: Run the Batch File
Double-click or run:
```
scripts\fix-ports.bat
```

### Option 2: Manual PowerShell Command
Open PowerShell and run:
```powershell
# Kill port 3002
$pid = (Get-NetTCPConnection -LocalPort 3002).OwningProcess
Stop-Process -Id $pid -Force
Write-Host "Freed port 3002"

# Kill port 3004
$pid = (Get-NetTCPConnection -LocalPort 3004).OwningProcess
Stop-Process -Id $pid -Force
Write-Host "Freed port 3004"
```

### Option 3: Use Task Manager
1. Press `Ctrl+Shift+Esc` to open Task Manager
2. Go to "Details" tab
3. Look for `node.exe` or `tsx.exe` processes
4. Right-click → End Task

## After Freeing Ports

Start the services in separate terminals:

**Terminal 1 - API Gateway:**
```powershell
cd backend/services/api-gateway
npm run dev
```

**Terminal 2 - Tool Registry Service:**
```powershell
cd backend/services/tool-registry-service
npm run dev
```

**Terminal 3 - Tool Proxy Service:**
```powershell
cd backend/services/tool-proxy-service
npm run dev
```

## Then Register LangchainMCP

Once all services are running:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/register-langchain-mcp.ps1
```
