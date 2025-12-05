# PDF Text Extraction Troubleshooting

## Current Issue
PDF files are uploading successfully, but text extraction is failing. The AI responds with: "It seems there was an issue with the file content extraction."

## What to Check

### 1. **Server Logs**
When you upload a PDF, check your server console for these log messages:

**Look for:**
- `Starting PDF parsing` - Confirms parsing started
- `PDF parsed successfully` - Shows if parsing worked
- `PDF parsing failed` - Shows the actual error
- `Text extracted successfully` - Confirms text was extracted

**Common errors to look for:**
- `DOMMatrix is not defined` - Polyfill issue
- `Cannot find module 'pdf-parse'` - Missing dependency
- `PDF parsing timeout` - PDF too large or corrupted
- `No text extracted` - PDF might be image-based (scanned)

### 2. **Check PDF Type**
The PDF might be:
- **Image-based (scanned)** - Requires OCR (needs `GOOGLE_CLOUD_VISION_API_KEY` and `poppler-utils`)
- **Encrypted/Protected** - Cannot extract text
- **Corrupted** - File is damaged

### 3. **Environment Variables**
Make sure these are set in your `.env`:
```bash
ENABLE_OCR=true
GOOGLE_CLOUD_VISION_API_KEY=your_key_here
MAX_PDF_PAGES_FOR_OCR=10
```

### 4. **Dependencies**
Verify `pdf-parse` is installed:
```powershell
cd backend/services/api-gateway
npm list pdf-parse
```

If not installed:
```powershell
npm install pdf-parse
```

## Quick Fixes

### Fix 1: Restart Server
Sometimes the server needs a fresh restart:
```powershell
# Stop server (Ctrl+C)
cd backend
npm run dev
```

### Fix 2: Check DOMMatrix Polyfill
The polyfill should be set at the top of `file-processor.ts`. If you see DOMMatrix errors, the polyfill isn't loading.

### Fix 3: Test PDF Parsing Directly
Run the test script:
```powershell
cd backend
node test-pdf-extraction.js "path\to\your\pdf.pdf"
```

This will show if PDF parsing works outside the server.

### Fix 4: Enable OCR for Scanned PDFs
If the PDF is scanned (image-based), enable OCR:
1. Set `GOOGLE_CLOUD_VISION_API_KEY` in `.env`
2. Set `ENABLE_OCR=true`
3. Install `poppler-utils` (see `doc/POPPLER_MANUAL_INSTALL_WINDOWS.md`)

## Next Steps

1. **Check server logs** when uploading the PDF
2. **Copy the error message** from the logs
3. **Share the error** so we can pinpoint the exact issue

The enhanced error handling will now:
- Show better error messages in the UI
- Suggest OCR if the PDF is scanned
- Provide helpful guidance on what went wrong
