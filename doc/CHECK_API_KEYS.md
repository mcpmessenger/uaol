# Quick API Key Check

Based on your screenshot, the error "Incorrect or invalid openai API key" means:

## What's Happening

1. **OCR (Google Vision)** tries first → likely failing (no key or invalid)
2. **OpenAI Vision API** tries as fallback → **This is failing** (the error you see)

## Quick Fix Steps

### Step 1: Check Your `.env` File

Open `backend/.env` (or `backend/env.example` if `.env` doesn't exist) and verify:

```bash
# Required for OCR (primary)
GOOGLE_CLOUD_VISION_API_KEY=your-google-key-here

# Required for Vision API (fallback)
OPENAI_API_KEY=your-openai-key-here

# Should be enabled
ENABLE_OCR=true
```

### Step 2: Get Your API Keys

**Google Cloud Vision API Key:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create API Key (or use existing)
3. Enable "Cloud Vision API" for your project
4. Copy key to `.env`

**OpenAI API Key:**
1. Go to: https://platform.openai.com/api-keys
2. Create new key (or use existing)
3. Copy key to `.env`

### Step 3: Restart Server

After updating `.env`:

```powershell
# Stop current server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

### Step 4: Test Again

Upload your image again - should work now!

## Quick Diagnostic

Run this in PowerShell to check if keys are set:

```powershell
cd backend
# Check if .env exists
if (Test-Path .env) {
    Write-Host "✅ .env file exists"
    # Check for keys (won't show values, just if they exist)
    $content = Get-Content .env
    if ($content -match "GOOGLE_CLOUD_VISION_API_KEY=") {
        Write-Host "✅ GOOGLE_CLOUD_VISION_API_KEY is set"
    } else {
        Write-Host "❌ GOOGLE_CLOUD_VISION_API_KEY is NOT set"
    }
    if ($content -match "OPENAI_API_KEY=") {
        Write-Host "✅ OPENAI_API_KEY is set"
    } else {
        Write-Host "❌ OPENAI_API_KEY is NOT set"
    }
} else {
    Write-Host "❌ .env file does NOT exist - copy from env.example"
}
```

## Common Issues

### Issue 1: Keys have extra spaces
```bash
# ❌ Wrong
OPENAI_API_KEY= sk-1234...

# ✅ Correct
OPENAI_API_KEY=sk-1234...
```

### Issue 2: Keys are in wrong file
- Keys must be in `backend/.env` (not root `.env`)
- Server reads from `backend/.env`

### Issue 3: Server not restarted
- **Always restart server** after changing `.env`
- Environment variables load at startup

### Issue 4: Invalid keys
- Google key must have "Cloud Vision API" enabled
- OpenAI key must be active and have credits

## Expected Behavior After Fix

1. **Image upload** → OCR extracts text (Google Vision)
2. **Vision API** → Analyzes image content (OpenAI)
3. **Combined result** → Text + analysis shown in chat

## Still Not Working?

Check server logs for detailed errors:

```powershell
# Look for these log messages:
# - "OCR failed for image, falling back to Vision API"
# - "Both OCR and Vision API failed for image"
# - "hasGoogleKey: true/false"
# - "hasOpenAIKey: true/false"
```

These will tell you exactly which key is missing or invalid.
