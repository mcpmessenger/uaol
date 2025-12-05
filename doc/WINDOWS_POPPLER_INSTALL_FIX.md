# Windows Poppler Installation - Fix for Lock File Error

## Problem

Chocolatey installation failed with:
```
Unable to obtain lock file access on 'C:\ProgramData\chocolatey\lib\4e648a20689ec7f5cb6f6c83f5e3238954966173'
```

## Solution Options

### Option 1: Remove Lock File and Retry (Quick Fix)

1. **Close any running Chocolatey processes** (check Task Manager)

2. **Remove the lock file:**
   ```powershell
   # Run PowerShell as Administrator
   Remove-Item "C:\ProgramData\chocolatey\lib\4e648a20689ec7f5cb6f6c83f5e3238954966173" -Force -ErrorAction SilentlyContinue
   ```

3. **Retry installation (as Administrator):**
   ```powershell
   # Right-click PowerShell → "Run as Administrator"
   choco install poppler -y
   ```

### Option 2: Manual Installation (Recommended for Windows)

Since Chocolatey is having issues, use manual installation:

#### Step 1: Download Poppler

1. Go to: https://github.com/oschwartz10612/poppler-windows/releases
2. Download the latest release (e.g., `Release-XX.XX.X-X.zip`)
3. Extract to `C:\poppler` (or your preferred location)

#### Step 2: Add to PATH

1. **Open System Environment Variables:**
   - Press `Win + R`
   - Type: `sysdm.cpl` and press Enter
   - Click "Environment Variables"

2. **Edit PATH:**
   - Under "System variables", find `Path`
   - Click "Edit"
   - Click "New"
   - Add: `C:\poppler\Library\bin` (or your poppler bin path)
   - Click "OK" on all dialogs

3. **Restart Terminal/IDE** (required for PATH changes)

#### Step 3: Verify Installation

```powershell
# Open NEW PowerShell window (to reload PATH)
pdftoppm -h
# Should show help text (not "command not found")
```

### Option 3: Use Chocolatey with Admin Rights

1. **Close current PowerShell**

2. **Open PowerShell as Administrator:**
   - Right-click PowerShell
   - Select "Run as Administrator"

3. **Install:**
   ```powershell
   choco install poppler -y
   ```

## Quick Verification

After installation, verify it works:

```powershell
# Check if pdftoppm is available
pdftoppm -h

# Should output help text like:
# pdftoppm version 0.XX.X
# Usage: pdftoppm [options] PDF-file PPM-root
# ...
```

## Troubleshooting

### "pdftoppm: command not found" after manual install

**Fix:**
1. Verify PATH includes poppler bin directory
2. **Restart PowerShell/IDE** (PATH changes require restart)
3. Check path: `$env:PATH -split ';' | Select-String poppler`

### Still can't find pdftoppm

**Check installation:**
```powershell
# Check if poppler exists
Test-Path "C:\poppler\Library\bin\pdftoppm.exe"

# If false, check where you extracted it
Get-ChildItem -Path C:\ -Filter "pdftoppm.exe" -Recurse -ErrorAction SilentlyContinue
```

## Next Steps After Installation

Once poppler is installed:

1. **Install pdf2pic npm package:**
   ```powershell
   cd backend/services/api-gateway
   npm install pdf2pic
   ```

2. **Restart server:**
   ```powershell
   cd backend
   npm run dev
   ```

3. **Test with scanned PDF** - Should work now!

## Alternative: Skip Poppler for Now

If you can't install poppler right now, the OCR will still work for:
- ✅ **Standalone images** (PNG, JPG, etc.)
- ✅ **Native PDFs** (text-based, not scanned)

Only **scanned PDFs** require poppler for PDF-to-image conversion.
