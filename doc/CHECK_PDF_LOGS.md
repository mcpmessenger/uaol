# How to Check PDF Parsing Logs

## The Real Issue

The diagnostic script shows `dommatrix` isn't found when running from `backend/`, but it should be installed in `backend/services/api-gateway/`.

## What to Do Right Now

### 1. Check Server Logs When Uploading PDF

**When you upload a PDF, look at your server terminal** (where `npm run dev` is running) and find these log entries:

**Look for:**
```
[file-processor] DOM polyfills loaded for PDF parsing
[file-processor] DOMMatrix polyfill loaded successfully
[file-processor] Text extracted successfully
```

**Or errors:**
```
[file-processor] Could not load DOM polyfills for PDF parsing
[file-processor] Failed to import dommatrix
[file-processor] PDF parsing failed
```

### 2. The Enhanced Logging Will Show

When PDF parsing fails, you'll now see:
- ✅ Exact error message
- ✅ Polyfill state (which ones loaded)
- ✅ Stack trace
- ✅ File information

### 3. Most Likely Issue

Based on the diagnostic, `dommatrix` might not be properly installed. Try:

```bash
cd backend/services/api-gateway
npm install dommatrix --save
```

Then **restart your server** and try uploading a PDF again.

## Quick Test

1. **Upload a PDF** in your chat interface
2. **Watch the server terminal** for log messages
3. **Copy the error message** you see (especially any `[file-processor]` logs)
4. **Share it here** so we can see exactly what's failing

The enhanced error logging I added will show us exactly what's wrong!

## Expected Log Output

**If working:**
```
[file-processor] DOM polyfills loaded for PDF parsing { hasDOMMatrix: true, ... }
[file-processor] Text extracted successfully { textLength: 1234, ... }
```

**If broken:**
```
[file-processor] Could not load DOM polyfills for PDF parsing { error: "...", ... }
[file-processor] PDF parsing failed { error: "...", polyfillsLoaded: false, ... }
```

**Please share the server log output when you upload a PDF!**
