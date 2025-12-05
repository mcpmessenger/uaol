# Quick Fix for Persistent Issues

## Current Problems

1. ❌ **PDF text extraction failing** - "content extraction not available"
2. ❌ **API key rejected by OpenAI** - "Incorrect or invalid openai API key"

## Critical Steps to Fix

### Step 1: Verify dommatrix Installation

```bash
cd backend/services/api-gateway
npm install dommatrix
```

Verify it's installed:
```bash
npm list dommatrix
```

### Step 2: RESTART Backend Server

**This is critical!** The server must be restarted to:
- Load the `dommatrix` dependency
- Apply code changes
- Reload environment variables

```bash
# Stop the current server (Ctrl+C in the terminal running it)
# Then restart:
cd backend
npm run dev
```

### Step 3: Check Server Logs

When you upload a PDF, you should see:
- ✅ `DOM polyfills loaded for PDF parsing` (not a warning)
- ✅ `Text extracted successfully` with text length > 0
- ❌ NOT `DOMMatrix is not defined`

### Step 4: Fix API Key Issue

The API key format is valid but OpenAI is rejecting it. This means:

1. **Check OpenAI Dashboard:**
   - Go to https://platform.openai.com/api-keys
   - Find your key (`sk-proj-...`)
   - Check if it's **Active** (not revoked)
   - Check if you have **credits/quota**

2. **If Key is Revoked/Expired:**
   - Create a new API key
   - Update in `backend/.env`:
     ```env
     OPENAI_API_KEY=sk-your-new-key-here
     ```
   - **Restart server** after updating

3. **If Key is Active but Still Rejected:**
   - Check account billing/credits
   - Verify key has access to `gpt-4o` model
   - Try a personal key instead of project key

## Verification Checklist

After restarting, test:

- [ ] Upload a PDF file
- [ ] Check server logs for "DOM polyfills loaded" (no error)
- [ ] Check server logs for "Text extracted successfully" with length > 0
- [ ] Check console: `withText` should be > 0 (not 0)
- [ ] Chat should work (if API key is valid)

## If PDF Still Fails After Restart

Check server logs for:
- `Could not load DOM polyfills` → `dommatrix` not installed correctly
- `DOMMatrix is not defined` → Polyfills not loading before PDF libraries
- `PDF parsing failed` → Check the specific error message

## If API Key Still Rejected

1. **Test key directly:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```
   If this fails, the key is definitely invalid.

2. **Check .env file:**
   - No quotes around the key
   - No extra whitespace
   - Key starts with `sk-`

3. **Try a different key:**
   - Create a new key in OpenAI dashboard
   - Update `.env` and restart

## Expected Server Logs (After Fix)

**Good logs:**
```
[file-processor] DOM polyfills loaded for PDF parsing
[file-processor] Text extracted successfully { textLength: 1234, ... }
[file-processor] Document indexed for RAG { chunkCount: 5 }
```

**Bad logs (still broken):**
```
[file-processor] Could not load DOM polyfills for PDF parsing { error: "..." }
[file-processor] PDF parsing failed { error: "DOMMatrix is not defined" }
[file-processor] Text extraction failed
```

## Summary

**Most likely cause:** Server wasn't restarted after installing `dommatrix`

**Fix:**
1. ✅ `npm install dommatrix` (if not done)
2. ✅ **RESTART backend server** (critical!)
3. ✅ Verify API key in OpenAI dashboard
4. ✅ Update API key if needed and restart again

The code changes are in place - you just need to restart the server!
