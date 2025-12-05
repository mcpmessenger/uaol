# Quick Fix for Poppler Installation on Windows

## The Issue

Chocolatey failed due to a lock file. Here are **3 quick solutions**:

## Solution 1: Manual Installation (Easiest - 5 minutes)

### Step 1: Download Poppler

1. Go to: https://github.com/oschwartz10612/poppler-windows/releases
2. Download latest: `Release-XX.XX.X-X.zip`
3. Extract to: `C:\poppler`

### Step 2: Add to PATH

**Quick method (PowerShell as Admin):**
```powershell
# Run PowerShell as Administrator
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\poppler\Library\bin", [EnvironmentVariableTarget]::Machine)
```

**Or manually:**
1. Press `Win + R` → type `sysdm.cpl` → Enter
2. "Environment Variables" → "Path" → "Edit"
3. Add: `C:\poppler\Library\bin`
4. OK all dialogs

### Step 3: Restart Terminal

**Close and reopen PowerShell/IDE** (required for PATH to update)

### Step 4: Verify

```powershell
pdftoppm -h
# Should show help (not error)
```

## Solution 2: Fix Chocolatey Lock (If you prefer Chocolatey)

```powershell
# Run PowerShell as Administrator
# Remove lock file
Remove-Item "C:\ProgramData\chocolatey\lib\4e648a20689ec7f5cb6f6c83f5e3238954966173" -Force -ErrorAction SilentlyContinue

# Retry install
choco install poppler -y
```

## Solution 3: Skip for Now (Test Other Features)

Poppler is only needed for **scanned PDF OCR**. You can still test:
- ✅ **Images** - OCR works without poppler
- ✅ **Native PDFs** - Text extraction works without poppler
- ⚠️ **Scanned PDFs** - Need poppler

## What's Already Done

✅ **pdf2pic npm package** - Already installed  
✅ **Code implementation** - Complete  
✅ **OCR service** - Ready  

**Only missing:** Poppler system installation

## After Installing Poppler

1. **Restart server:**
   ```powershell
   cd backend
   npm run dev
   ```

2. **Test with scanned PDF** - Should work!

## Quick Test (Without Poppler)

You can test OCR with **images** right now:

1. Upload a PNG/JPG with text
2. Should see: `[ocr-service] OCR completed`
3. Text should be extracted

**Poppler is only needed for scanned PDFs!**
