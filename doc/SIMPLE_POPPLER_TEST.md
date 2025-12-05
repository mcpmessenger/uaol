# Simple Poppler Test

## Test if Poppler Works

Run this simple test:

```powershell
& "C:\poppler\poppler-25.12.0\Library\bin\pdftoppm.exe" -h
```

**If you see help text** → Poppler is installed correctly! ✅

**If you see "file not found"** → Check the path is correct.

## After Poppler Works

### Option 1: Restart PowerShell (Easiest)

Just **close and reopen PowerShell**. PATH will reload automatically.

### Option 2: Add to PATH Manually

1. `Win + R` → `sysdm.cpl` → Enter
2. "Environment Variables" → "Path" → "Edit"  
3. Add: `C:\poppler\poppler-25.12.0\Library\bin`
4. OK all dialogs
5. **Restart PowerShell**

## Next Steps

Once poppler works:

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

## What You Can Test Now (Without Poppler)

Even if poppler isn't working yet, you can test:
- ✅ **Images (PNG/JPG)** → OCR works
- ✅ **Native PDFs** → Text extraction works
- ⚠️ **Scanned PDFs** → Need poppler

**Poppler is only needed for scanned PDF OCR!**

