# Poppler Quick Fix - Corrected Commands

## Simple Fix: Reload PATH

Run this **corrected** command in PowerShell:

```powershell
$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath"
pdftoppm -h
```

**OR** just **restart PowerShell** (easiest).

## Test with Full Path (Works Immediately)

Test if poppler is installed correctly:

```powershell
& "C:\poppler\poppler-25.12.0\Library\bin\pdftoppm.exe" -h
```

**If this shows help text**, poppler is working! Just restart PowerShell.

## Verify PATH Was Added

Check if PATH includes poppler:

```powershell
[Environment]::GetEnvironmentVariable("Path", "Machine") -split ';' | Select-String poppler
```

Should show: `C:\poppler\poppler-25.12.0\Library\bin`

## If PATH Not Set

Add manually via GUI:

1. `Win + R` → `sysdm.cpl` → Enter
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

