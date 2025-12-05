# AI Provider Setup Guide

## How Provider Selection Works

You have **two ways** to configure API keys:

### Option 1: Set Keys in the App (Recommended for Personal Use)

**How it works:**
- Click the **Settings icon (⚙️)** in the top right
- Go to **"API Keys"** section
- Add your API keys for OpenAI, Gemini, or Claude
- Set one as **default** (it will be used automatically)
- Keys are **encrypted and stored per-user** in the database

**Benefits:**
- ✅ Each user can have their own keys
- ✅ Keys are encrypted and secure
- ✅ Can switch providers per message
- ✅ No need to modify `.env` file

**To use a specific provider for one message:**
- Click the provider toggle (Openai/Gemini/Claude) before sending
- Or use `/provider gemini` command

### Option 2: Set Global Keys in `.env` (Recommended for Shared/Admin Use)

**How it works:**
- Add keys to `backend/.env` file
- These are **fallback keys** used when:
  - User doesn't have their own key set
  - Guest users (not logged in)
  - User's key is invalid

**Benefits:**
- ✅ Works for all users automatically
- ✅ No per-user configuration needed
- ✅ Good for shared instances

## Setup Instructions

### Step 1: Get Your API Keys

**OpenAI:**
1. Go to: https://platform.openai.com/api-keys
2. Create new key (starts with `sk-` or `sk-proj-`)
3. Copy the key

**Google Gemini:**
1. Go to: https://makersuite.google.com/app/apikey
2. Create new key
3. Copy the key

**Anthropic Claude:**
1. Go to: https://console.anthropic.com/settings/keys
2. Create new key (starts with `sk-ant-`)
3. Copy the key

### Step 2: Choose Your Setup Method

#### Method A: Set in App (User-Specific)

1. **Start the app** and log in (or register)
2. Click **Settings (⚙️)** icon
3. Go to **"API Keys"** tab
4. Enter your keys:
   - **OpenAI**: Paste your `sk-...` key
   - **Gemini**: Paste your Gemini key
   - **Claude**: Paste your `sk-ant-...` key
5. Click **"Set as Default"** for your preferred provider
6. **Done!** Your keys are saved and encrypted

#### Method B: Set in `.env` (Global Fallback)

1. Open `backend/.env` file
2. Add your keys:
   ```bash
   # OpenAI
   OPENAI_API_KEY=sk-your-key-here
   
   # Google Gemini
   GEMINI_API_KEY=your-gemini-key-here
   
   # Anthropic Claude
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
3. Save the file
4. **Restart the backend server:**
   ```powershell
   # Stop server (Ctrl+C)
   cd backend
   npm run dev
   ```
5. **Done!** Keys are available as fallback

### Step 3: Verify Setup

After restarting, check the server logs. You should see:

```
🔍 Environment check:
  OPENAI_API_KEY: ✓ SET (sk-proj-...)
  GEMINI_API_KEY: ✓ SET (...)
  ANTHROPIC_API_KEY: ✓ SET (sk-ant-...)
  GOOGLE_CLOUD_VISION_API_KEY: ✓ SET (...)
  ENABLE_OCR: ✓ ENABLED
  DATABASE_URL: ✓ SET
```

## How Provider Selection Works

### Priority Order (Highest to Lowest)

1. **User-specified provider** (via toggle or `/provider` command)
2. **User's default provider** (set in app settings)
3. **First available user API key** (if user has keys but no default)
4. **Global fallback key** for requested provider
5. **First available global key** (if no provider specified)

### Example Scenarios

**Scenario 1: User has OpenAI key set in app, selects Gemini toggle**
- ✅ Uses Gemini (user-specified overrides default)

**Scenario 2: User has default set to Claude, no toggle selected**
- ✅ Uses Claude (user's default)

**Scenario 3: Guest user, no keys in app, OpenAI key in `.env`**
- ✅ Uses OpenAI global key (fallback)

**Scenario 4: User has no keys, selects Gemini toggle, Gemini key in `.env`**
- ✅ Uses Gemini global key (fallback for requested provider)

## Using Provider Toggle

The toggle at the bottom of the chat lets you **temporarily** use a different provider:

- **Click "Openai"** → Next message uses OpenAI
- **Click "Gemini"** → Next message uses Gemini  
- **Click "Claude"** → Next message uses Claude
- **Click again** → Clears selection, uses default

**Note:** The toggle only affects the **next message**. After sending, it resets to your default.

## Troubleshooting

### "No API key found" Error

**Check:**
1. ✅ Keys are set in app settings OR `.env` file
2. ✅ Server was restarted after changing `.env`
3. ✅ Key format is correct:
   - OpenAI: starts with `sk-` or `sk-proj-`
   - Gemini: any string (usually long)
   - Claude: starts with `sk-ant-`

### "Invalid API key format" Error

**Check:**
1. ✅ No extra spaces around `=` in `.env`
2. ✅ Key is not empty
3. ✅ Key prefix matches provider requirements

### Provider Not Working

**Check:**
1. ✅ Key is valid and active
2. ✅ Provider API is accessible
3. ✅ Check server logs for detailed errors

## Quick Commands

In the chat, you can use:

- `/setkey openai sk-...` - Set OpenAI key
- `/setkey gemini ...` - Set Gemini key
- `/setkey claude sk-ant-...` - Set Claude key
- `/provider openai` - Use OpenAI for next message
- `/provider gemini` - Use Gemini for next message
- `/provider claude` - Use Claude for next message
- `/settings` - Open settings to manage keys

## Summary

**For Personal Use:**
- ✅ Set keys in app (Settings → API Keys)
- ✅ Set one as default
- ✅ Use toggle to switch temporarily

**For Shared/Admin Use:**
- ✅ Set keys in `backend/.env`
- ✅ Works for all users automatically
- ✅ Users can still override with their own keys

**Both methods work together:**
- User keys take priority
- Global keys are fallback
- Toggle overrides everything for one message
