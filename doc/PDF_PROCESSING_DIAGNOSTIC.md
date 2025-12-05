# PDF Processing Diagnostic - Troubleshooting Guide

## Current Issue

You're seeing:
- ❌ "content extraction not available for this file type"
- ❌ "Incorrect or invalid openai API key"

This means:
1. **PDF processing is failing** (no text extracted)
2. **OpenAI API key issue** (separate problem)

## Step 1: Check Server Logs

When you upload the PDF, check your **server terminal** for these logs:

### ✅ What You Should See (If Working)

```
[file-processor] DOM polyfills loaded for PDF parsing
[file-processor] Text extracted successfully { textLength: 1234, pages: 5 }
[file-processor] PDF type detection { detectedType: 'native (text-based)' }
```

OR (if scanned):

```
[file-processor] PDF appears to be scanned, using OCR
[ocr-service] Calling Google Cloud Vision API for OCR
[ocr-service] OCR completed with DOCUMENT_TEXT_DETECTION
[file-processor] OCR extracted text successfully
```

### ❌ What You Might See (If Broken)

```
[file-processor] Could not load DOM polyfills
[file-processor] PDF parsing failed { error: "..." }
[file-processor] Text extraction failed
```

## Step 2: Verify Server Restart

**CRITICAL:** Did you restart the server after:
- Adding `GOOGLE_CLOUD_VISION_API_KEY`?
- Installing any new packages?

**Restart command:**
```bash
cd backend
npm run dev
```

## Step 3: Check Environment Variables

Verify your `backend/.env` has:

```env
# Required for OCR
GOOGLE_CLOUD_VISION_API_KEY=your-key-here
ENABLE_OCR=true

# Required for chat
OPENAI_API_KEY=your-openai-key-here
```

**Quick check:**
```bash
cd backend
node -e "require('dotenv').config(); console.log('OCR Key:', !!process.env.GOOGLE_CLOUD_VISION_API_KEY); console.log('OpenAI Key:', !!process.env.OPENAI_API_KEY)"
```

Should output:
```
OCR Key: true
OpenAI Key: true
```

## Step 4: Test PDF Processing Directly

Create a test script to check PDF processing:

```bash
cd backend/services/api-gateway
node -e "
import('./src/services/file-processor.js').then(async (module) => {
  const fs = await import('fs');
  const pdfBuffer = fs.readFileSync('path/to/your/test.pdf');
  const mockFile = {
    buffer: pdfBuffer,
    mimetype: 'application/pdf',
    originalname: 'test.pdf'
  };
  try {
    const result = await module.processFile(mockFile, 'test.pdf', 'guest');
    console.log('Success!', { textLength: result.text?.length || 0 });
  } catch (error) {
    console.error('Error:', error.message);
  }
});
"
```

## Step 5: Common Issues & Fixes

### Issue 1: "DOMMatrix is not defined"

**Fix:**
```bash
cd backend/services/api-gateway
npm install @thednp/dommatrix
npm run dev  # Restart server
```

### Issue 2: PDF Parsing Fails Silently

**Check:**
- Server logs for specific error
- PDF might be corrupted
- Try a different PDF

### Issue 3: OCR Not Triggering

**Check:**
- Is `ENABLE_OCR=true` in `.env`?
- Is `GOOGLE_CLOUD_VISION_API_KEY` set?
- Check logs for: `PDF type detection`

### Issue 4: "Invalid API key" (OpenAI)

**Fix:**
- Verify `OPENAI_API_KEY` in `.env`
- Check key is active in OpenAI dashboard
- Restart server after updating

## Step 6: Enable Debug Logging

Add to `backend/.env`:
```env
LOG_LEVEL=debug
```

This will show more detailed logs.

## Step 7: Test with Simple PDF

Try uploading a **simple, native PDF** (not scanned) first to verify basic PDF parsing works.

## What to Share for Help

If still not working, share:

1. **Server logs** when uploading PDF (the full error)
2. **Environment check output** (from Step 3)
3. **PDF type** (native text-based or scanned image-based)
4. **Whether server was restarted** after adding keys

## Quick Fix Checklist

- [ ] Server restarted after adding `GOOGLE_CLOUD_VISION_API_KEY`
- [ ] `GOOGLE_CLOUD_VISION_API_KEY` set in `backend/.env`
- [ ] `OPENAI_API_KEY` set in `backend/.env`
- [ ] `ENABLE_OCR=true` in `backend/.env`
- [ ] `@thednp/dommatrix` installed
- [ ] Checked server logs for specific error
- [ ] Tried a different PDF file

## Expected Flow

1. **PDF Upload** → Server receives file
2. **Polyfills Load** → `DOM polyfills loaded for PDF parsing`
3. **PDF Parse** → Extract text with `pdf-parse`
4. **Type Detection** → Check if scanned (< 50 chars/page)
5. **If Scanned** → Call OCR (Google Vision API)
6. **Return Text** → Text available in chat

**If any step fails, check logs for that specific step!**
