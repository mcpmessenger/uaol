# Poppler Verification - Quick Fix

## Current Status

Poppler is installed at: `C:\poppler\poppler-25.12.0\Library\bin\pdftoppm.exe`

PATH was updated, but **current PowerShell session** hasn't reloaded it yet.

## Quick Fix: Reload PATH in Current Session

Run this in your current PowerShell:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine) + ";" + [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
pdftoppm -h
```

**OR** simply **restart PowerShell** (close and reopen).

## Verify Installation

After reloading PATH, test:

```powershell
# Should show help text
pdftoppm -h

# Should find the command
where.exe pdftoppm
```

## If Still Not Working

### Option 1: Test with Full Path

```powershell
& "C:\poppler\poppler-25.12.0\Library\bin\pdftoppm.exe" -h
```

If this works, poppler is installed correctly - just need to reload PATH.

### Option 2: Verify PATH Was Set

```powershell
# Check system PATH
[Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine) -split ';' | Select-String poppler

# Should show: C:\poppler\poppler-25.12.0\Library\bin
```

### Option 3: Add to PATH Manually (GUI)

1. Press `Win + R` → `sysdm.cpl` → Enter
2. "Environment Variables" → "Path" → "Edit"
3. Add: `C:\poppler\poppler-25.12.0\Library\bin`
4. OK all dialogs
5. **Restart PowerShell**

## After Verification

Once `pdftoppm -h` works:

1. **Install pdf2pic:**
   ```powershell
   cd backend/services/api-gateway
   npm install pdf2pic
   ```

2. **Restart server:**
   ```powershell
   cd backend
   npm run dev
   ```

3. **Test with scanned PDF!**

## Quick Test Right Now

You can test if poppler works using the full path:

```powershell
& "C:\poppler\poppler-25.12.0\Library\bin\pdftoppm.exe" -h
```

If this shows help text, **poppler is working** - just restart PowerShell to use `pdftoppm` directly!

