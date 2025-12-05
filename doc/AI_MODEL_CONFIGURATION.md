# AI Model Configuration Guide

## Overview

Each AI provider supports different models. You can configure the default model for each provider in your `backend/.env` file.

## Model Configuration

### OpenAI Models

**Environment Variable:** `OPENAI_MODEL`

**Available Models:**
- `gpt-4` - Most capable, slower (default)
- `gpt-4-turbo` - Faster version of GPT-4
- `gpt-4o` - Latest optimized model (recommended)
- `gpt-4o-mini` - Faster, cheaper version
- `gpt-3.5-turbo` - Fastest, most cost-effective

**Example:**
```bash
OPENAI_MODEL=gpt-4o
```

**Note:** `gpt-5.1` is not a valid model. Use one of the models listed above.

### Google Gemini Models

**Environment Variable:** `GEMINI_MODEL`

**Available Models:**
- `gemini-pro` - Standard model (default)
- `gemini-pro-vision` - With vision capabilities
- `gemini-1.5-pro` - Latest Pro model
- `gemini-1.5-flash` - Faster, lighter version

**Example:**
```bash
GEMINI_MODEL=gemini-1.5-pro
```

### Anthropic Claude Models

**Environment Variable:** `ANTHROPIC_MODEL`

**Available Models:**
- `claude-3-opus-20240229` - Most capable (default)
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fastest, most cost-effective
- `claude-3-5-sonnet-20241022` - Latest Sonnet model (recommended)

**Example:**
```bash
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

## Configuration in `.env`

Add these to your `backend/.env` file:

```bash
# OpenAI
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o

# Google Gemini
GEMINI_API_KEY=your-gemini-key-here
GEMINI_MODEL=gemini-1.5-pro

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

## Model Selection Priority

1. **Per-request model** (if specified in API call)
2. **Environment variable** (`OPENAI_MODEL`, `GEMINI_MODEL`, `ANTHROPIC_MODEL`)
3. **Default model** (hardcoded fallback)

## Model Recommendations

### For Best Quality
- **OpenAI:** `gpt-4o`
- **Gemini:** `gemini-1.5-pro`
- **Claude:** `claude-3-5-sonnet-20241022`

### For Best Speed
- **OpenAI:** `gpt-4o-mini` or `gpt-3.5-turbo`
- **Gemini:** `gemini-1.5-flash`
- **Claude:** `claude-3-haiku-20240307`

### For Best Balance
- **OpenAI:** `gpt-4-turbo`
- **Gemini:** `gemini-pro`
- **Claude:** `claude-3-sonnet-20240229`

## Cost Considerations

**Most Expensive:**
- OpenAI: `gpt-4` / `gpt-4o`
- Gemini: `gemini-1.5-pro`
- Claude: `claude-3-opus-20240229`

**Most Cost-Effective:**
- OpenAI: `gpt-3.5-turbo` / `gpt-4o-mini`
- Gemini: `gemini-1.5-flash`
- Claude: `claude-3-haiku-20240307`

## Vision Capabilities

**Models with Vision:**
- **OpenAI:** `gpt-4o`, `gpt-4-turbo` (with vision)
- **Gemini:** `gemini-pro-vision`, `gemini-1.5-pro`
- **Claude:** All Claude 3 models support vision

## After Changing Models

1. **Save `.env` file**
2. **Restart backend server:**
   ```powershell
   # Stop server (Ctrl+C)
   cd backend
   npm run dev
   ```
3. **Test with a message** - new model will be used

## Checking Current Model

The model being used is logged in server logs when making API calls. Look for:
```
[api-gateway] Using model: gpt-4o
```

## Troubleshooting

### "Model not found" Error

- ✅ Check model name spelling (case-sensitive)
- ✅ Verify model is available in your API plan
- ✅ Some models may require specific API access

### Model Not Changing

- ✅ Restart server after changing `.env`
- ✅ Check logs to see which model is actually being used
- ✅ Verify environment variable name is correct

## Quick Reference

| Provider | Env Var | Default | Best Quality | Best Speed |
|----------|---------|---------|--------------|------------|
| OpenAI | `OPENAI_MODEL` | `gpt-4` | `gpt-4o` | `gpt-4o-mini` |
| Gemini | `GEMINI_MODEL` | `gemini-pro` | `gemini-1.5-pro` | `gemini-1.5-flash` |
| Claude | `ANTHROPIC_MODEL` | `claude-3-opus-20240229` | `claude-3-5-sonnet-20241022` | `claude-3-haiku-20240307` |
