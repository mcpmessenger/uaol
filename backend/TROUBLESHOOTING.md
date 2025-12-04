# Troubleshooting Guide

## Services Not Showing in Output

If you only see the API Gateway in the `npm run dev` output, but other services are running (check ports), the issue is with concurrently output display.

### Solution

The `dev` script has been updated to explicitly show all services with colored output. Restart with:

```powershell
npm run dev
```

You should now see output from all 7 services with different colors:
- **api-gateway** (cyan)
- **auth** (magenta) 
- **tool-registry** (green)
- **job-orch** (yellow)
- **tool-proxy** (blue)
- **billing** (red)
- **storage** (white)

## Common Issues

### 1. Port Already in Use

If a service fails to start with "port already in use":

```powershell
# Check what's using the port
Get-NetTCPConnection -LocalPort 3001

# Kill the process if needed
Stop-Process -Id <PID> -Force
```

### 2. Database Connection Errors

Services will start even if the database isn't running, but API calls will fail. Start PostgreSQL:

```powershell
# Using Docker
docker-compose up -d postgres

# Or start your local PostgreSQL service
```

### 3. Module Resolution Errors

If you see `Cannot find module '@uaol/shared/...'`:

```powershell
# Rebuild shared package
cd shared
npm run build
cd ..

# Reinstall dependencies
npm install
```

### 4. ES Module Import Errors

If you see `ERR_UNSUPPORTED_DIR_IMPORT`, ensure:
- All relative imports in `shared/` have `.js` extensions
- The shared package is built: `cd shared && npm run build`

### 5. Services Starting But No Logs

Services might be running but not logging. Check if they're listening:

```powershell
Get-NetTCPConnection -LocalPort 3001,3002,3003,3004,3005,3006 | Select-Object LocalPort, State
```

If ports are listening, the services are running. Test with:

```powershell
# Test auth service
curl http://localhost:3001/health

# Test API Gateway
curl http://localhost:3000/health
```

## Verifying Services Are Running

### Check Ports

```powershell
Get-NetTCPConnection -LocalPort 3000,3001,3002,3003,3004,3005,3006 -ErrorAction SilentlyContinue | Select-Object LocalPort, State
```

### Test Health Endpoints

```powershell
# API Gateway
Invoke-WebRequest http://localhost:3000/health

# Auth Service
Invoke-WebRequest http://localhost:3001/health

# Tool Registry
Invoke-WebRequest http://localhost:3002/health

# Job Orchestration
Invoke-WebRequest http://localhost:3003/health

# Tool Proxy
Invoke-WebRequest http://localhost:3004/health

# Billing
Invoke-WebRequest http://localhost:3005/health

# Storage
Invoke-WebRequest http://localhost:3006/health
```

## Starting Services Individually

If `npm run dev` isn't working, start services individually to see errors:

```powershell
# Terminal 1
cd services/auth-service
npm run dev

# Terminal 2
cd services/tool-registry-service
npm run dev

# etc...
```

This will show you exactly which service is failing and why.

