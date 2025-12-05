# Test After Server Restart

## ✅ Server Restarted Successfully

All services are running:
- ✅ API Gateway (port 3000)
- ✅ Auth Service (port 3001)
- ✅ Tool Registry (port 3002)
- ✅ Job Orchestration (port 3003)
- ✅ Tool Proxy (port 3004)
- ✅ Billing Service (port 3005)
- ✅ Storage Service (port 3006)

## Now Test PDF Upload

### Step 1: Upload a PDF File

1. Go to your chat interface
2. Upload a PDF file (the same one you tried before)
3. Watch the server logs in your terminal

### Step 2: Check Server Logs

**Look for these SUCCESS indicators:**

✅ **Good signs:**
```
[file-processor] DOM polyfills loaded for PDF parsing
[file-processor] Text extracted successfully { textLength: 1234, ... }
[file-processor] Document indexed for RAG { chunkCount: 5 }
```

❌ **Bad signs (still broken):**
```
[file-processor] Could not load DOM polyfills for PDF parsing
[file-processor] PDF parsing failed { error: "DOMMatrix is not defined" }
[file-processor] Text extraction failed
```

### Step 3: Check Browser Console

**Look for:**
- `Files uploaded successfully` with `withText: 1` or more (not 0)
- No "content extraction not available" message
- Document content should be included in the chat

### Step 4: Test Chat

1. After uploading, send a message about the PDF
2. Check if you get a proper AI response (not API key error)
3. If API key error persists, check OpenAI dashboard

## Expected Results

### PDF Upload Should Now:
- ✅ Extract text successfully
- ✅ Show `withText: > 0` in console
- ✅ Include document content in chat context
- ✅ Index for RAG retrieval

### Chat Should:
- ✅ Work if API key is valid
- ✅ Use extracted PDF text in responses
- ✅ Provide relevant answers about the document

## If PDF Still Fails

Check server logs for the exact error:
- `DOMMatrix is not defined` → Polyfill still not loading
- `Cannot find package 'dommatrix'` → Package not installed
- `PDF parsing failed` → Check the specific error message

## If API Key Still Rejected

1. **Verify in OpenAI Dashboard:**
   - https://platform.openai.com/api-keys
   - Check if key is active (not revoked)
   - Check credits/quota

2. **Test key directly:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

3. **If key is invalid:**
   - Create new key in dashboard
   - Update `backend/.env`
   - Restart server again

## Next Steps

1. **Upload a PDF now** and check the results
2. **Share the server logs** if issues persist
3. **Check browser console** for `withText` value

The server is ready - time to test! 🚀
