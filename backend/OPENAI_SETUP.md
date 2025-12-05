# OpenAI API Setup

## Adding OpenAI to Your Chat

To enable AI-powered responses in the chat, you need to add your OpenAI API key to the backend `.env` file.

## Steps

1. **Get your OpenAI API key:**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key (or use an existing one)

2. **Add to backend `.env` file:**
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   OPENAI_MODEL=gpt-4
   ```

3. **Restart your backend:**
   ```powershell
   # Stop current backend (Ctrl+C)
   cd backend
   npm run dev
   ```

## Model Options

You can change the model by setting `OPENAI_MODEL`:
- `gpt-4` - Most capable (default)
- `gpt-4-turbo` - Faster, still very capable
- `gpt-3.5-turbo` - Faster and cheaper

## Testing

After setting the API key and restarting:
1. Send a message in the chat
2. You should receive an AI-generated response instead of the placeholder message

## Troubleshooting

### "Incorrect API key provided" Error

If you see this error, check:

1. **Key Format**: Make sure there are NO quotes or spaces:
   ```env
   # ✅ Correct
   OPENAI_API_KEY=sk-proj-abc123...
   
   # ❌ Wrong (quotes)
   OPENAI_API_KEY="sk-proj-abc123..."
   
   # ❌ Wrong (spaces)
   OPENAI_API_KEY = sk-proj-abc123...
   ```

2. **Key Validity**: 
   - Go to https://platform.openai.com/api-keys
   - Verify your key is active (not revoked)
   - Create a new key if needed

3. **Backend Restart**: After updating `.env`, you MUST restart the backend:
   ```powershell
   # Stop backend (Ctrl+C in the terminal running it)
   # Then restart:
   cd backend
   npm run dev
   ```

4. **Check the Key**: Verify it's in `backend/.env` (not root `.env`):
   ```powershell
   cd backend
   Get-Content .env | Select-String "OPENAI_API_KEY"
   ```

## Cost Note

OpenAI API usage is charged per token. Monitor your usage at https://platform.openai.com/usage

