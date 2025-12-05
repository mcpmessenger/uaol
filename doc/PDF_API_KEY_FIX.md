# PDF Image Extraction - API Key Fix

## Problem

When uploading PDFs with images, users were getting the error:
> "Incorrect or invalid openai API key. Please verify your API key is correct and active."

This happened because the PDF image extraction feature was only using the global `OPENAI_API_KEY` environment variable, ignoring user-specific API keys configured in the application.

## Root Cause

The `analyzeImageWithVisionAPI()` function in `file-processor.ts` was hardcoded to use `process.env.OPENAI_API_KEY` directly, while the chat endpoint had logic to:
1. Try user-specific API keys first
2. Fall back to global API key

This inconsistency meant that:
- Users with their own API keys configured couldn't use them for PDF image analysis
- The error message wasn't helpful for users

## Solution

### 1. Added User API Key Support

Created a `getOpenAIApiKey()` helper function that:
- Accepts optional `userId` parameter
- Tries to retrieve and decrypt user's OpenAI API key from database
- Falls back to global `OPENAI_API_KEY` if no user key found
- Returns `null` if no key is available (with helpful error message)

### 2. Updated Function Signatures

- `analyzeImageWithVisionAPI()` now accepts optional `userId` parameter
- `extractTextAndMetadata()` now accepts optional `userId` parameter
- `userId` is passed through the entire call chain from `processFile()`

### 3. Improved Error Messages

Enhanced error handling to provide clearer messages:
- If API key is invalid: "Invalid OpenAI API key. Please verify your API key is correct and active. Check your API key settings."
- If no key configured: "OpenAI API key not configured. Please add your API key in settings or configure OPENAI_API_KEY environment variable."

### 4. Guest User Support

Updated upload endpoint to handle guest users:
- Uses `'guest'` as userId fallback if user is not authenticated
- Prevents errors when guests upload files

## Files Modified

1. **`backend/services/api-gateway/src/services/file-processor.ts`**
   - Added `getOpenAIApiKey()` helper function
   - Updated `analyzeImageWithVisionAPI()` to accept `userId` and use user keys
   - Updated `extractTextAndMetadata()` to accept and pass `userId`
   - Updated PDF image analysis to pass `userId`
   - Updated standalone image processing to pass `userId`

2. **`backend/services/api-gateway/src/index.ts`**
   - Updated `/chat/upload` endpoint to handle guest users
   - Passes `userId` (or `'guest'`) to `processFile()`

## How It Works Now

### For Authenticated Users

1. User uploads PDF with images
2. System tries to get user's OpenAI API key from database
3. If found, uses user's key for Vision API calls
4. If not found, falls back to global API key
5. If neither exists, returns helpful error message

### For Guest Users

1. Guest uploads PDF with images
2. System uses `'guest'` as userId
3. Falls back to global API key
4. If no global key, returns error message

## Testing

To test the fix:

1. **With User API Key:**
   - Configure your OpenAI API key in settings
   - Upload a PDF with charts/diagrams
   - Should use your API key for image analysis

2. **With Global API Key:**
   - Set `OPENAI_API_KEY` in `.env`
   - Upload a PDF with charts/diagrams
   - Should use global API key

3. **Without Any Key:**
   - Remove all API keys
   - Upload a PDF with images
   - Should get helpful error message (not crash)

## Benefits

✅ **Consistent behavior** - PDF image extraction now works like chat endpoint  
✅ **User API keys supported** - Users can use their own keys  
✅ **Better error messages** - Clear guidance when keys are missing/invalid  
✅ **Guest support** - Guests can upload files (uses global key if available)  
✅ **Backward compatible** - Still works with global API key  

## Next Steps

The fix is complete and ready to use. Users should now be able to:
- Upload PDFs with images using their own API keys
- Get clear error messages if keys are missing or invalid
- Use the feature as guests (if global key is configured)
