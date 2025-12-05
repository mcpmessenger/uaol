# Fix: Google Cloud Vision API Key Not Detected

## Problem

Server logs show:
```
[api-gateway]   GOOGLE_CLOUD_VISION_API_KEY: ✗ NOT SET
```

But you said the key is set. This usually means:

## Common Issues

### 1. Variable Name Typo

**❌ Wrong:**
```bash
GOOGLE_VISION_API_KEY=your-key
GOOGLE_CLOUD_API_KEY=your-key
GOOGLE_CLOUD_VISION_KEY=your-key
```

**✅ Correct:**
```bash
GOOGLE_CLOUD_VISION_API_KEY=your-key
```

**Must be exactly:** `GOOGLE_CLOUD_VISION_API_KEY` (all caps, underscores)

### 2. Empty Value

**❌ Wrong:**
```bash
GOOGLE_CLOUD_VISION_API_KEY=
GOOGLE_CLOUD_VISION_API_KEY= 
```

**✅ Correct:**
```bash
GOOGLE_CLOUD_VISION_API_KEY=AIzaSy...your-actual-key-here
```

### 3. Commented Out

**❌ Wrong:**
```bash
# GOOGLE_CLOUD_VISION_API_KEY=your-key
```

**✅ Correct:**
```bash
GOOGLE_CLOUD_VISION_API_KEY=your-key
```

### 4. Extra Spaces

**❌ Wrong:**
```bash
GOOGLE_CLOUD_VISION_API_KEY = your-key
GOOGLE_CLOUD_VISION_API_KEY= your-key
```

**✅ Correct:**
```bash
GOOGLE_CLOUD_VISION_API_KEY=your-key
```

### 5. Wrong File Location

- Must be in: `backend/.env` (not root `.env`)
- Server reads from `backend/.env`

## Quick Fix Steps

### Step 1: Open `backend/.env`

### Step 2: Find or Add This Line

```bash
GOOGLE_CLOUD_VISION_API_KEY=AIzaSy...your-actual-key-here
```

### Step 3: Verify Format

- ✅ No spaces around `=`
- ✅ No `#` at the start
- ✅ Actual key value (not empty)
- ✅ Exact variable name: `GOOGLE_CLOUD_VISION_API_KEY`

### Step 4: Save File

### Step 5: Restart Server

```powershell
# Stop server (Ctrl+C)
cd backend
npm run dev
```

### Step 6: Check Logs

Should now show:
```
[api-gateway]   GOOGLE_CLOUD_VISION_API_KEY: ✓ SET (AIzaSy...)
```

## Get Your Google Cloud Vision API Key

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "API Key"
3. Copy the key (starts with `AIzaSy...`)
4. **Important:** Enable "Cloud Vision API" for this key:
   - Go to: https://console.cloud.google.com/apis/library/vision.googleapis.com
   - Click "Enable"
5. Paste key in `.env` file

## Verify It's Set

After restarting, check the startup logs. You should see:

```
🔍 Environment check:
  .env path: ...
  .env exists: true
  OPENAI_API_KEY: ✓ SET (sk-proj-...)
  GOOGLE_CLOUD_VISION_API_KEY: ✓ SET (AIzaSy...)  ← Should show this
  ENABLE_OCR: ✓ ENABLED
  DATABASE_URL: ✓ SET
```

If it still shows `✗ NOT SET`, double-check:
1. Variable name is exactly `GOOGLE_CLOUD_VISION_API_KEY`
2. No spaces around `=`
3. Key has a value (not empty)
4. File is saved
5. Server was restarted
