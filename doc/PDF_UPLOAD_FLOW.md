# PDF Upload and Processing Flow

## Current Flow

When you upload a PDF, here's what happens:

### Step 1: File Upload
- File is received by the server
- Stored in `backend/uploads/{userId}/`
- Processing begins

### Step 2: Native Text Extraction
- Attempts to extract text using `pdf-parse`
- If successful → text is extracted
- If failed → proceeds to Step 3

### Step 3: OCR Fallback (if enabled)
- If `ENABLE_OCR=true` and `GOOGLE_CLOUD_VISION_API_KEY` is set
- Converts PDF pages to images using `poppler-utils`
- Sends images to Google Cloud Vision API for OCR
- Extracts text from images

### Step 4: RAG Indexing
- If text was extracted (native or OCR)
- Text is normalized, chunked, and indexed in vector store
- Available for semantic search

## What You Should See in Logs

When uploading a PDF, check your server console for:

```
[api-gateway] File upload request
[api-gateway] Starting PDF parsing
[api-gateway] PDF parsed successfully (or PDF parsing failed)
[api-gateway] Attempting OCR as fallback (if native parsing failed)
[api-gateway] OCR fallback succeeded (if OCR worked)
[api-gateway] Text extracted successfully
```

## Troubleshooting

### If you see "PDF parsing failed":
1. Check the error message in logs
2. If it's a DOMMatrix error → polyfill issue
3. If it's an import error → `pdf-parse` not installed
4. OCR fallback should automatically trigger

### If OCR fallback doesn't trigger:
1. Check `ENABLE_OCR` is not `false`
2. Check `GOOGLE_CLOUD_VISION_API_KEY` is set
3. Check `poppler-utils` is installed (for PDF-to-image conversion)

### If OCR fails:
1. Check Google Cloud Vision API key is valid
2. Check poppler-utils is in PATH
3. Check server logs for specific OCR error

## Quick Test

Upload a PDF and immediately check your server console. You should see the log messages above. Share those logs if extraction is still failing.
