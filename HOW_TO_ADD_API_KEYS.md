# How to Add Your API Keys as a User

## Quick Start

To use your own API keys (OpenAI, Gemini, Claude) instead of the global backend key, you need to:

1. **Register or Login** (required for API key management)
2. **Add your API keys** via the settings UI or commands

---

## Step 1: Register or Login

### Option A: Register (New User)
Type in the chat:
```
/register your@email.com
```

This will:
- Create your account
- Generate a UAOL API key for you
- Log you in automatically
- Show you your API key (save it if you need it for programmatic access)

### Option B: Login (Existing User)
Type in the chat:
```
/login your@email.com
```

This will log you in if you already have an account.

---

## Step 2: Add Your API Keys

### Method 1: Using the Settings UI (Recommended)

1. Type `/settings` in the chat (or press `/` and select "settings")
2. The API Key Settings dialog will open
3. For each provider you want to use:
   - Enter your API key in the input field
   - Click "Save" or press Enter
   - Optionally, click "Set as Default" to make it your default provider

### Method 2: Using Commands

**Set a key:**
```
/setkey openai sk-your-openai-key-here
/setkey gemini your-gemini-key-here
/setkey claude sk-ant-your-claude-key-here
```

**List your keys:**
```
/keys
```

**Set default provider:**
```
/default openai
```

---

## Supported Providers

- **OpenAI**: Keys start with `sk-` (e.g., `sk-proj-...`)
- **Google Gemini**: Any valid Gemini API key
- **Anthropic Claude**: Keys start with `sk-ant-` (e.g., `sk-ant-...`)

---

## How It Works

1. **Your keys are encrypted** and stored securely in the database
2. **When you chat**, the system will:
   - First try to use your personal API keys
   - Fall back to the global backend key if you haven't set any
3. **You can set a default provider** that will be used automatically
4. **You can switch providers** per message using the provider buttons or `/provider` command

---

## Troubleshooting

### "Authentication required" Error

If you see this error, you need to register/login first:
```
/register your@email.com
```

### "Failed to save API key" Error

- Make sure you're logged in (not a guest)
- Check that your API key is correct
- Verify the key format matches the provider requirements

### Keys Not Working

- Verify your API keys are valid and active
- Check your API key provider's dashboard for usage/quota
- Make sure there are no extra spaces or quotes in the key

---

## Example Workflow

1. Register:
   ```
   /register user@example.com
   ```

2. Add OpenAI key:
   ```
   /setkey openai sk-proj-abc123...
   ```

3. Add Gemini key:
   ```
   /setkey gemini AIzaSy...
   ```

4. Set OpenAI as default:
   ```
   /default openai
   ```

5. Start chatting! Your messages will use your OpenAI key automatically.

---

## Notes

- **Guest users** cannot manage API keys (they use the global backend key)
- **Registered users** can manage unlimited API keys
- Keys are **encrypted at rest** in the database
- You can **delete keys** anytime from the settings UI
- Setting a **default provider** makes it easier to switch between providers
