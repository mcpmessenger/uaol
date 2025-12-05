# PDF Extraction Diagnostic Guide

## Current Issue
PDF uploads are completing, but text extraction is failing silently. The frontend shows "content extraction not available for this file type" even for PDFs.

## Enhanced Logging Added

I've added detailed logging to help diagnose the issue. Check your server logs for:

### 1. **PDF Parsing Start Log**
Look for:
```
Starting PDF parsing
- hasDOMMatrix: true/false
- bufferSize: <number>
- filename: <filename>
```

### 2. **PDF Parsing Success Log**
If successful, you'll see:
```
PDF parsed successfully
- pages: <number>
- textLength: <number>
- hasText: true/false
- preview: <first 200 chars>
```

### 3. **PDF Parsing Error Log**
If it fails, you'll see:
```
PDF parsing failed
- error: <error message>
- isDOMMatrixError: true/false
- isImportError: true/false
- hasDOMMatrix: true/false
- bufferSize: <number>
```

### 4. **Text Extraction Error Log**
Also check for:
```
Text extraction failed
- isPDF: true
- isDOMMatrixError: true/false
- isImportError: true/false
- hasDOMMatrix: true/false
```

## Quick Diagnostic Steps

### Step 1: Check Server Logs
When you upload a PDF, check the server console for the logs above. Look specifically for:
- Is `hasDOMMatrix: true`?
- What is the actual error message?
- Is it a DOMMatrix error, import error, or parse error?

### Step 2: Test PDF Parsing Directly
Run the test script I created:

```powershell
cd backend
node test-pdf-extraction.js "path\to\your\pdf\file.pdf"
```

This will:
- Verify DOMMatrix polyfill is working
- Test pdf-parse import
- Parse the PDF and show extracted text

### Step 3: Verify Dependencies
Make sure `pdf-parse` is installed:

```powershell
cd backend/services/api-gateway
npm list pdf-parse
```

If it's not listed, install it:
```powershell
npm install pdf-parse
```

### Step 4: Check Server Restart
After code changes, make sure the server restarted:
- If using `tsx watch`, it should auto-reload
- If not, manually restart: `npm run dev`

## Common Issues and Fixes

### Issue 1: DOMMatrix Not Defined
**Symptoms:** `hasDOMMatrix: false` in logs, `isDOMMatrixError: true`

**Fix:** The top-level polyfill should handle this. If not:
1. Check that `file-processor.ts` has the polyfill at the very top (before any imports)
2. Restart the server completely
3. Check for any import errors

### Issue 2: pdf-parse Import Error
**Symptoms:** `isImportError: true`, "Cannot find module 'pdf-parse'"

**Fix:**
```powershell
cd backend/services/api-gateway
npm install pdf-parse
```

### Issue 3: PDF Buffer Issues
**Symptoms:** `bufferSize: 0` or buffer-related errors

**Fix:** Check that multer is properly configured and files are being received

### Issue 4: PDF Parse Error
**Symptoms:** `isParseError: true`, PDF-specific error messages

**Fix:** The PDF might be corrupted or encrypted. Try with a different PDF.

## Next Steps

1. **Upload a PDF** and immediately check server logs
2. **Copy the error logs** from the console
3. **Run the test script** with your PDF file
4. **Share the results** so we can pinpoint the exact issue

## Test Script Usage

```powershell
# Test with a specific PDF
cd backend
node test-pdf-extraction.js "C:\Users\senti\Downloads\test.pdf"

# Or test with a PDF from uploads
node test-pdf-extraction.js "uploads\guest\file_1234567890.pdf"
```

The script will:
- ✅ Verify DOMMatrix polyfill
- ✅ Test pdf-parse import
- ✅ Parse the PDF
- ✅ Show extracted text (first 500 chars)

If the test script works but the server doesn't, it's likely a server restart or environment issue.
