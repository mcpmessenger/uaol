# PDF Chat API Key Error - Troubleshooting Guide

## Issue

You're getting this error when trying to chat about a PDF:
> "Incorrect or invalid openai API key. Please verify your API key is correct and active."

But CSV files work fine, which suggests the API key is valid.

## What We've Fixed

1. ✅ **Enhanced error logging** - Better diagnostics to identify the exact issue
2. ✅ **Improved error messages** - More helpful guidance based on user type
3. ✅ **API key validation** - Better trimming and format checking
4. ✅ **Detailed logging** - Logs API key format, length, and validation status

## Possible Causes

### 1. API Key Quota/Rate Limits
- Your API key might have hit rate limits or quota
- Check your OpenAI dashboard for usage/quota status
- Try waiting a few minutes and retry

### 2. Model-Specific Restrictions
- PDF processing might use different models (e.g., `gpt-4o` for Vision API)
- Your API key might not have access to certain models
- Check which models your key has access to

### 3. API Key Format Issues
- Extra whitespace or special characters
- Key might be getting corrupted during storage/retrieval
- Check your API key settings in the app

### 4. Different API Key Used
- PDF image extraction uses user API keys (if configured)
- Chat endpoint might be using a different key
- Verify which key is being used

## Diagnostic Steps

### Step 1: Check Server Logs

Look for these log entries when you try to chat about the PDF:

```
API key config check: {
  hasApiKey: true/false,
  keyFormatValid: true/false,
  keyStarts: "sk-...",
  userId: "...",
  isGuest: true/false
}

OpenAI API Error Details: {
  status: 401/403/etc,
  errorMessage: "...",
  apiKeyFormatValid: true/false
}
```

### Step 2: Verify Your API Key

1. **Check in OpenAI Dashboard:**
   - Go to https://platform.openai.com/api-keys
   - Verify your key is active
   - Check usage/quota limits
   - Verify model access

2. **Test Your Key Directly:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

### Step 3: Check Application Settings

1. **If you're authenticated:**
   - Go to API Key Settings in the app
   - Verify your OpenAI key is saved correctly
   - Try removing and re-adding it

2. **If you're a guest:**
   - Check if `OPENAI_API_KEY` is set in backend `.env`
   - Verify there's no extra whitespace
   - Format should be: `OPENAI_API_KEY=sk-...` (no quotes)

### Step 4: Try Different Scenarios

1. **Test with a simple message** (no file):
   - Should work if API key is valid

2. **Test with CSV again:**
   - Confirms basic functionality

3. **Test with PDF (text only, no images):**
   - Disable image extraction: `ENABLE_PDF_IMAGE_EXTRACTION=false`
   - See if it works without image analysis

## Quick Fixes

### Fix 1: Re-add Your API Key

1. Go to Settings → API Keys
2. Remove your OpenAI key
3. Add it again (copy-paste carefully, no extra spaces)
4. Set it as default
5. Try again

### Fix 2: Use Global API Key

If you're a guest or having issues with user keys:

1. Set `OPENAI_API_KEY` in `backend/.env`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```
2. Restart the backend server
3. Try again

### Fix 3: Disable PDF Image Extraction (Temporary)

If image extraction is causing issues:

1. Set in `backend/.env`:
   ```env
   ENABLE_PDF_IMAGE_EXTRACTION=false
   ```
2. Restart backend
3. PDFs will process text only (no image analysis)

## What the Logs Will Tell Us

The enhanced logging will show:

- ✅ **API Key Format**: Valid (`sk-...`) or invalid
- ✅ **Key Source**: User key vs global key
- ✅ **OpenAI Error**: Exact error code and message from OpenAI
- ✅ **Request Details**: Which endpoint/model was used

## Next Steps

1. **Check the server logs** when you reproduce the error
2. **Share the log output** (redact the actual API key)
3. **Try the quick fixes** above
4. **Report back** what you find

## Expected Behavior

- ✅ CSV files: Should work (text extraction only)
- ✅ PDFs without images: Should work (text extraction only)
- ✅ PDFs with images: Should work (text + image analysis)
- ✅ Standalone images: Should work (Vision API)

If CSV works but PDF doesn't, it suggests:
- The API key is valid
- But something about PDF processing is different
- Could be model access, rate limits, or a bug

## Contact

If none of these steps resolve the issue, please share:
1. Server logs (with API key redacted)
2. Whether you're authenticated or guest
3. Your OpenAI account status (active, quota, etc.)
4. Which specific error message you see
