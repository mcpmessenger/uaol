# Manual Poppler Installation for Windows - Step by Step

## Why Manual Installation?

Chocolatey is having lock file issues. Manual installation is more reliable and takes only 5 minutes.

## Step-by-Step Instructions

### Step 1: Download Poppler

1. **Open browser** and go to:
   ```
   https://github.com/oschwartz10612/poppler-windows/releases
   ```

2. **Download latest release:**
   - Look for: `Release-XX.XX.X-X.zip` (latest version)
   - Example: `Release-25.12.0-0.zip`
   - Click to download

### Step 2: Extract Poppler

1. **Navigate to Downloads folder**
2. **Right-click** the zip file → "Extract All..."
3. **Extract to:** `C:\poppler`
   - Make sure the path is: `C:\poppler\Library\bin\pdftoppm.exe`
   - NOT: `C:\poppler\poppler-XX\Library\bin\pdftoppm.exe`

### Step 3: Add to PATH (PowerShell as Admin)

**Option A: Quick PowerShell Method (Recommended)**

1. **Open PowerShell as Administrator:**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Run this command:**
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\poppler\Library\bin", [EnvironmentVariableTarget]::Machine)
   ```

3. **Close and reopen PowerShell** (to reload PATH)

**Option B: Manual GUI Method**

1. Press `Win + R`
2. Type: `sysdm.cpl` → Press Enter
3. Click **"Environment Variables"** button
4. Under **"System variables"**, find `Path`
5. Click **"Edit"**
6. Click **"New"**
7. Add: `C:\poppler\Library\bin`
8. Click **"OK"** on all dialogs
9. **Close and reopen PowerShell/IDE**

### Step 4: Verify Installation

**Open a NEW PowerShell window** (to reload PATH) and run:

```powershell
pdftoppm -h
```

**Expected output:**
```
pdftoppm version 0.XX.X
Usage: pdftoppm [options] PDF-file PPM-root
...
```

**If you see "command not found":**
- PATH wasn't updated - try Option B (manual GUI method)
- Restart your computer if needed
- Check path exists: `Test-Path "C:\poppler\Library\bin\pdftoppm.exe"`

## Quick Verification Commands

```powershell
# Check if file exists
Test-Path "C:\poppler\Library\bin\pdftoppm.exe"

# Check if in PATH
$env:PATH -split ';' | Select-String poppler

# Try to run
pdftoppm -h
```

## After Installation

Once `pdftoppm -h` works:

1. **Install pdf2pic (if not done):**
   ```powershell
   cd backend/services/api-gateway
   npm install pdf2pic
   ```

2. **Restart server:**
   ```powershell
   cd backend
   npm run dev
   ```

3. **Test with scanned PDF** - Should work!

## Troubleshooting

### "pdftoppm: command not found"

**Check:**
1. Is file at `C:\poppler\Library\bin\pdftoppm.exe`?
2. Is PATH updated? (restart PowerShell)
3. Try: `C:\poppler\Library\bin\pdftoppm.exe -h` (full path)

### "Access Denied" when adding to PATH

**Fix:** Run PowerShell as Administrator

### Still Not Working

**Alternative:** You can test OCR with **images** (PNG/JPG) without poppler. Only scanned PDFs need poppler.

## What You Can Test Now (Without Poppler)

- ✅ **Upload PNG/JPG images** → OCR works
- ✅ **Upload native PDFs** → Text extraction works
- ⚠️ **Upload scanned PDFs** → Need poppler

**Poppler is only needed for scanned PDF OCR!**
