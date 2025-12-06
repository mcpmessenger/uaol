@echo off
REM Batch script to start all backend services
REM This starts all services needed for the workflow builder and MCP tools

echo ========================================
echo   Starting UAOL Backend Services
echo ========================================
echo.

REM Get script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
set BACKEND_DIR=%PROJECT_ROOT%\backend

REM Check if backend directory exists
if not exist "%BACKEND_DIR%" (
    echo ❌ Error: backend directory not found at: %BACKEND_DIR%
    exit /b 1
)

REM Check if .env exists
if not exist "%BACKEND_DIR%\.env" (
    echo ⚠️  Warning: backend\.env file not found
    echo    Services may not start correctly without environment variables
    echo.
)

echo Services that will start:
echo   ✓ API Gateway (port 3000)
echo   ✓ Auth Service (port 3001)
echo   ✓ Tool Registry Service (port 3002)
echo   ✓ Job Orchestration Service (port 3003)
echo   ✓ Tool Proxy Service (port 3004)
echo   ✓ Billing Service (port 3005)
echo   ✓ Storage Service (port 3006)
echo.

echo Changing to backend directory...
cd /d "%BACKEND_DIR%"

echo.
echo Starting all services...
echo   (Press Ctrl+C to stop all services)
echo.

REM Start all services using npm run dev
npm run dev
