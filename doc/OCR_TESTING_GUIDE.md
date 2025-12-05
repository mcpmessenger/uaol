# OCR Testing Guide - Ready to Test! ✅

## ✅ Everything is Wired Up

- ✅ OCR service created (`ocr-service.ts`)
- ✅ Integrated into PDF processing
- ✅ Integrated into image processing
- ✅ API key check in place
- ✅ Smart detection (scanned vs native PDFs)

## Quick Test Steps

### 1. Restart Server (Important!)

```bash
cd backend
npm run dev
```

**Why?** Server needs to load the new OCR code and environment variables.

### 2. Test with Image (Easiest - Recommended First)

1. **Upload an image with text** (PNG, JPG, etc.)
2. **Check server logs** for:
   ```
   [ocr-service] Calling Google Cloud Vision API for OCR
   [ocr-service] OCR completed with DOCUMENT_TEXT_DETECTION
   [file-processor] Image OCR completed { textLength: 123, confidence: 0.95 }
   ```
3. **Verify in chat** - Text should be extracted and available

### 3. Test with Scanned PDF

1. **Upload a scanned PDF** (image-based, not native text)
2. **Check server logs** for:
   ```
   [file-processor] PDF appears to be scanned, using OCR
   [ocr-service] OCR extracted text successfully
   ```
3. **Verify text extraction** - Should work now!

### 4. Test with Native PDF (Should Still Work)

1. **Upload a native PDF** (text-based, not scanned)
2. **Check logs** - Should use fast `pdf-parse` (no OCR needed)
3. **Should work as before** - No changes expected

## What to Look For in Logs

### ✅ Success Indicators

```
[ocr-service] Calling Google Cloud Vision API for OCR
[ocr-service] OCR completed with DOCUMENT_TEXT_DETECTION
  textLength: 1234
  confidence: 0.95
  language: en
```

### ❌ Error Indicators

```
[ocr-service] Google Cloud Vision API OCR failed
  error: "Invalid API key"
```

## Common Issues & Fixes

### Issue: "GOOGLE_CLOUD_VISION_API_KEY not configured"

**Fix:**
1. Check `backend/.env` has the key
2. Restart server
3. Verify no extra spaces/quotes around key

### Issue: "Invalid API key"

**Fix:**
1. Verify key is correct in Google Cloud Console
2. Check Vision API is enabled
3. Ensure key has Vision API permissions

### Issue: OCR Not Triggering for PDFs

**Check:**
- Is PDF actually scanned? (Try a clearly scanned PDF)
- Is `ENABLE_OCR=true` in `.env`?
- Check logs for detection: `PDF type detection`

### Issue: "Quota exceeded"

**Fix:**
1. Check Google Cloud billing is enabled
2. First 1,000 requests/month are free
3. Check quota in Google Cloud Console

## Expected Behavior

### Images
- ✅ OCR extracts text
- ✅ Vision API analyzes content
- ✅ Combined results in chat

### Scanned PDFs
- ✅ Detects as scanned (< 50 chars/page)
- ✅ Uses OCR automatically
- ✅ Extracts text with high accuracy

### Native PDFs
- ✅ Uses fast native extraction
- ✅ No OCR needed (saves cost)
- ✅ Works as before

## Testing Checklist

- [ ] Server restarted after adding API key
- [ ] `GOOGLE_CLOUD_VISION_API_KEY` set in `.env`
- [ ] `ENABLE_OCR=true` (or not set, defaults to true)
- [ ] Tested with image (should work)
- [ ] Tested with scanned PDF (should work)
- [ ] Tested with native PDF (should still work)

## Next Steps After Testing

1. **If images work but PDFs don't:**
   - Google Vision API REST endpoint may need PDF-to-image conversion
   - We can enhance this if needed

2. **If everything works:**
   - ✅ OCR is fully functional!
   - ✅ Ready for production use

3. **If errors occur:**
   - Check logs for specific error messages
   - Verify API key in Google Cloud Console
   - Check billing/quota status

## Quick Verification

Run this in your terminal to verify API key is loaded:

```bash
cd backend
node -e "require('dotenv').config(); console.log('API Key set:', !!process.env.GOOGLE_CLOUD_VISION_API_KEY)"
```

Should output: `API Key set: true`

---

**Ready to test!** Upload an image or scanned PDF and check the logs! 🚀
