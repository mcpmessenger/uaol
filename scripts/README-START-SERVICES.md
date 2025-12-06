# Starting Backend Services

## Quick Start

### Windows (PowerShell)
```powershell
.\scripts\start-all-services.ps1
```

### Windows (Command Prompt)
```cmd
scripts\start-all-services.bat
```

### Linux/Mac/Git Bash
```bash
bash scripts/start-all-services.sh
```

Or make it executable:
```bash
chmod +x scripts/start-all-services.sh
./scripts/start-all-services.sh
```

## What Gets Started

All services needed for the workflow builder and MCP tools:

- **API Gateway** (port 3000) - Main entry point
- **Auth Service** (port 3001) - Authentication
- **Tool Registry Service** (port 3002) - Tool management
- **Job Orchestration Service** (port 3003) - Workflow execution
- **Tool Proxy Service** (port 3004) - MCP tool proxy (needed for tool methods)
- **Billing Service** (port 3005) - Credit management
- **Storage Service** (port 3006) - File storage

## Manual Start

If you prefer to start services individually:

```bash
cd backend
npm run dev --workspace=@uaol/api-gateway
npm run dev --workspace=@uaol/tool-registry-service
npm run dev --workspace=@uaol/tool-proxy-service
# ... etc
```

Or start all at once:
```bash
cd backend
npm run dev
```

## Stopping Services

Press `Ctrl+C` in the terminal where services are running to stop all services.

## Verifying Services Are Running

Test each service:
```bash
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3002/health  # Tool Registry
curl http://localhost:3004/health  # Tool Proxy
```

## Troubleshooting

### Port Already in Use
If you get `EADDRINUSE` errors:
- Use `scripts/kill-all-backend-ports.ps1` (Windows) to free ports
- Or manually kill processes using those ports

### Services Not Starting
- Check `backend/.env` exists and has correct `DATABASE_URL`
- Verify Node.js and npm are installed
- Check service logs for errors

### Database Connection Issues
- Verify `DATABASE_URL` in `backend/.env` is correct
- Check CockroachDB cluster is accessible
- Verify network connectivity
