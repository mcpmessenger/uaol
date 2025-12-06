# Fix: Ports Already in Use (EADDRINUSE)

## 🔴 Problem

When trying to start services, you get errors like:
```
Error: listen EADDRINUSE: address already in use :::3000
Error: listen EADDRINUSE: address already in use :::3004
```

This means old service processes are still running.

## ✅ Solution

### Option 1: Kill All Backend Ports (Recommended)

```powershell
.\scripts\kill-all-backend-ports.ps1
```

This will kill all processes on ports 3000-3006.

### Option 2: Manual Kill

```powershell
# Kill processes on specific ports
Get-NetTCPConnection -LocalPort 3000,3001,3002,3003,3004,3005,3006 -ErrorAction SilentlyContinue | 
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Option 3: Find and Kill Manually

```powershell
# Find what's using port 3004 (Tool Proxy Service)
Get-NetTCPConnection -LocalPort 3004 | Select-Object OwningProcess

# Kill that process (replace PID with actual process ID)
Stop-Process -Id <PID> -Force
```

## 🚀 After Killing Processes

1. **Wait 2-3 seconds** for ports to be released
2. **Restart services:**
   ```powershell
   cd backend
   npm run dev
   ```

## 📋 Quick Command

```powershell
# One-liner to kill all backend ports and restart
.\scripts\kill-all-backend-ports.ps1; Start-Sleep -Seconds 3; cd backend; npm run dev
```

---

**Status:** ⚠️ Ports in use - need to kill old processes first
