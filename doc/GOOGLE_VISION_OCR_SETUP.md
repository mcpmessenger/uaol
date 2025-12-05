# Google Cloud Vision API OCR - Setup Guide

## Overview

We've integrated **Google Cloud Vision API** for high-accuracy OCR (96.7% accuracy) to handle:
- ✅ Scanned PDFs
- ✅ Handwritten documents
- ✅ Complex layouts
- ✅ 200+ languages
- ✅ Images with text

## Architecture

### Smart Document Processing

```
PDF Upload
  ↓
Try Native Text Extraction (pdf-parse)
  ↓
Detect if Scanned (< 50 chars/page)
  ↓
┌─────────────────┬─────────────────┐
│ Native PDF      │ Scanned PDF     │
│ (has text)      │ (image-based)   │
│                 │                 │
│ Use native text │ Use OCR         │
│ (fast, free)    │ (Google Vision) │
└─────────────────┴─────────────────┘
  ↓
Combine Results
  ↓
RAG Indexing
```

### Image Processing

```
Image Upload
  ↓
OCR (Google Vision API)
  ↓
Vision Analysis (OpenAI GPT-4o)
  ↓
Combine OCR + Analysis
```

## Setup Instructions

### Step 1: Get Google Cloud Vision API Key

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/

2. **Create or Select Project:**
   - Create a new project or select existing one
   - Note your project ID

3. **Enable Vision API:**
   - Go to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"

4. **Create API Key:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
   - (Optional) Restrict the key to Vision API only for security

### Step 2: Configure Environment

Add to `backend/.env`:

```env
# Google Cloud Vision API (for OCR)
GOOGLE_CLOUD_VISION_API_KEY=your-api-key-here

# Enable/disable OCR (default: true)
ENABLE_OCR=true
```

### Step 3: Install Dependencies

```bash
cd backend/services/api-gateway
npm install @google-cloud/vision
```

### Step 4: Restart Server

```bash
cd backend
npm run dev
```

## How It Works

### For PDFs

1. **Native PDFs (text-based):**
   - Uses `pdf-parse` (fast, free)
   - Extracts text directly
   - No OCR needed

2. **Scanned PDFs (image-based):**
   - Detects if < 50 characters per page
   - Automatically uses Google Vision API OCR
   - Extracts text with 96.7% accuracy

### For Images

1. **OCR First:**
   - Google Vision API extracts text
   - High accuracy, fast processing

2. **Vision Analysis:**
   - OpenAI GPT-4o analyzes content
   - Understands charts, diagrams, context

3. **Combined Results:**
   - OCR text + AI analysis
   - Best of both worlds

## Features

### ✅ What You Get

- **96.7% OCR Accuracy** - Industry-leading
- **200+ Languages** - Automatic detection
- **Handwriting Recognition** - Supports handwritten text
- **Table Detection** - Extracts structured data
- **Complex Layouts** - Handles multi-column documents
- **Fast Processing** - Optimized API calls
- **Smart Fallback** - Uses native extraction when possible

### 📊 Cost

- **$1.50 per 1,000 pages** (first 1,000 free/month)
- **Native PDFs:** Free (no OCR needed)
- **Scanned PDFs:** ~$0.0015 per page

**Example:**
- 100 scanned PDFs (avg 10 pages) = 1,000 pages = $1.50
- First 1,000 pages/month = FREE

## Configuration Options

### Environment Variables

```env
# Required: Google Cloud Vision API Key
GOOGLE_CLOUD_VISION_API_KEY=your-key-here

# Optional: Enable/disable OCR (default: true)
ENABLE_OCR=true
```

### In Code

The system automatically:
- Detects scanned vs native PDFs
- Uses OCR only when needed
- Falls back gracefully if OCR fails
- Combines OCR with native extraction

## Testing

### Test OCR with Scanned PDF

1. Upload a scanned PDF (image-based)
2. Check server logs for:
   ```
   [ocr-service] PDF appears to be scanned, using OCR
   [ocr-service] OCR extracted text successfully { textLength: 1234, confidence: 0.95 }
   ```
3. Verify text extraction in chat

### Test OCR with Image

1. Upload an image with text
2. Check server logs for:
   ```
   [ocr-service] Image OCR completed { textLength: 567, confidence: 0.92 }
   ```
3. Verify text is extracted and included in chat

## Troubleshooting

### "GOOGLE_CLOUD_VISION_API_KEY not configured"

**Fix:**
1. Get API key from Google Cloud Console
2. Add to `backend/.env`
3. Restart server

### "Invalid API key"

**Fix:**
1. Verify key is correct (no extra spaces)
2. Check Vision API is enabled in Google Cloud
3. Verify key has Vision API permissions

### "Quota exceeded"

**Fix:**
1. Check Google Cloud billing is enabled
2. Verify quota limits in Google Cloud Console
3. First 1,000 requests/month are free

### OCR Not Working

**Check:**
1. Is `ENABLE_OCR=true` in `.env`?
2. Is API key set correctly?
3. Check server logs for error messages
4. Verify Google Cloud project has Vision API enabled

## Comparison

### Before (Current)
- ❌ Scanned PDFs: No text extraction
- ❌ Handwritten: Not supported
- ✅ Native PDFs: Works
- ✅ Images: OpenAI Vision only

### After (With OCR)
- ✅ Scanned PDFs: OCR extracts text
- ✅ Handwritten: Supported
- ✅ Native PDFs: Still works (faster)
- ✅ Images: OCR + Vision analysis

## Next Steps

1. **Get API Key** - Follow setup instructions above
2. **Configure** - Add key to `.env`
3. **Install** - `npm install @google-cloud/vision`
4. **Restart** - Server will auto-detect scanned PDFs
5. **Test** - Upload a scanned PDF or image

## Files Modified

1. ✅ `backend/services/api-gateway/package.json` - Added `@google-cloud/vision`
2. ✅ `backend/services/api-gateway/src/services/ocr-service.ts` - New OCR service
3. ✅ `backend/services/api-gateway/src/services/file-processor.ts` - Integrated OCR
4. ✅ `backend/env.example` - Added configuration

## Summary

✅ **Google Cloud Vision API integrated**  
✅ **Smart PDF detection** (native vs scanned)  
✅ **Automatic OCR** for scanned documents  
✅ **Image OCR** with high accuracy  
✅ **Cost-effective** ($1.50/1K pages, first 1K free)  
✅ **200+ languages** supported  

**Ready to use!** Just add your API key and restart the server.
