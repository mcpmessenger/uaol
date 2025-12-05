# PDF Parsing Diagnostic Guide

## Current Status

- ✅ **CSV files work** - Text extraction successful
- ❌ **PDF files fail** - "content extraction not available"

## What to Check

### Step 1: Check Server Logs

When you upload a PDF, look for these log entries in your server terminal:

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

### Step 2: Run Diagnostic Script

I've created a test script to diagnose the issue:

```bash
cd backend/services/api-gateway
node test-pdf-parsing.js
```

Or test with a real PDF:
```bash
cd backend/services/api-gateway
node test-pdf-parsing.js path/to/your/test.pdf
```

This will check:
- ✅ Is `dommatrix` installed?
- ✅ Are polyfills loading correctly?
- ✅ Can `pdf-parse` be imported?
- ✅ Can a PDF actually be parsed?

### Step 3: Check What Error You're Getting

The improved error logging will now show:
- Exact error message
- Polyfill state (which ones are loaded)
- Stack trace
- Error type

## Common Issues

### Issue 1: `dommatrix` Not Installed

**Symptoms:**
- `Cannot find package 'dommatrix'`
- `Failed to import dommatrix`

**Fix:**
```bash
cd backend/services/api-gateway
npm install dommatrix
npm list dommatrix  # Verify it's installed
```

### Issue 2: Polyfills Not Loading

**Symptoms:**
- `DOMMatrix is not defined`
- Polyfills show as not loaded in logs

**Fix:**
- Check that `dommatrix` is in `package.json`
- Restart server after installing
- Check import path is correct

### Issue 3: PDF Library Import Fails

**Symptoms:**
- `pdf-parse` import fails
- Error during PDF library initialization

**Fix:**
```bash
cd backend/services/api-gateway
npm install pdf-parse
```

### Issue 4: PDF File Issue

**Symptoms:**
- Parsing starts but fails
- Error about PDF structure

**Possible causes:**
- Corrupted PDF
- Password-protected PDF
- Unsupported PDF version
- Very large PDF

## Next Steps

1. **Check your server logs** when uploading a PDF
2. **Run the diagnostic script** to test the setup
3. **Share the error message** from the logs
4. **Try a different PDF** to rule out file-specific issues

## What the Logs Will Tell Us

The enhanced logging now shows:
- ✅ Polyfill loading status
- ✅ Which polyfills are available
- ✅ Exact error message and stack trace
- ✅ File information (name, type, size)

**Please share the server log output when you upload a PDF** - this will tell us exactly what's failing!
