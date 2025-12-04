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

## Cost Note

OpenAI API usage is charged per token. Monitor your usage at https://platform.openai.com/usage

