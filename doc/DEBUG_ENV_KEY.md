# Debug: Google Cloud Vision API Key Not Loading

## Issue

The key is in `.env` file but server shows `✗ NOT SET`.

## Quick Fixes to Try

### Fix 1: Re-type the Line (Most Common Fix)

1. **Delete the entire line:**
   ```
   GOOGLE_CLOUD_VISION_API_KEY=AIzaSyC8u9QCT1H_ZRk-HnkzI_npzD-Cofoowk4
   ```

2. **Type it fresh:**
   ```
   GOOGLE_CLOUD_VISION_API_KEY=AIzaSyC8u9QCT1H_ZRk-HnkzI_npzD-Cofoowk4
   ```

3. **Save the file** (Ctrl+S)

4. **Restart server**

### Fix 2: Check for Invisible Characters

1. Place cursor at the **end** of the key value
2. Press **Backspace** to remove any trailing spaces
3. Make sure there's **no space** after the `=`
4. Save and restart

### Fix 3: Try Quoting the Value

If the key has special characters, try quoting it:

```bash
GOOGLE_CLOUD_VISION_API_KEY="AIzaSyC8u9QCT1H_ZRk-HnkzI_npzD-Cofoowk4"
```

### Fix 4: Verify File Encoding

1. In VS Code, check bottom-right corner
2. Should show: `UTF-8` (not `UTF-8 with BOM`)
3. If it shows BOM, click it and select "Save with Encoding" → "UTF-8"

### Fix 5: Check Line Endings

1. Make sure the line ends with a **newline** (Enter)
2. Don't have the key on the last line without a newline

## After Restart, Check Logs

The new debug logging will show:

```
✅ .env loaded, parsed X variables
🔍 Environment check:
  All GOOGLE env vars found: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CLOUD_VISION_API_KEY
  GOOGLE_CLOUD_VISION_API_KEY raw: SET (length: 39, starts with: AIzaSyC8u9...)
  GOOGLE_CLOUD_VISION_API_KEY: ✓ SET (AIzaSyC8u9...)
```

If it still shows `NOT SET`, the debug logs will tell us why.

## Most Likely Solution

**Re-type the line** - this fixes invisible character issues 90% of the time.
