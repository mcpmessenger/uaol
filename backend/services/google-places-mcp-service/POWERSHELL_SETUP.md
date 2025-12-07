# PowerShell Setup Guide (Windows)

Quick guide for setting up Google Places MCP service on Windows PowerShell.

## Option 1: Use .env File (Recommended)

1. Create a `.env` file in `backend/services/google-places-mcp-service/`:

```powershell
# Create .env file
cd backend/services/google-places-mcp-service
@"
GOOGLE_PLACES_API_KEY=your_actual_api_key_here
PORT=8932
"@ | Out-File -FilePath .env -Encoding utf8
```

2. Start the service:

```powershell
npm run dev
```

The service will automatically load the `.env` file!

## Option 2: Set Environment Variable in PowerShell

```powershell
# Set for current session
$env:GOOGLE_PLACES_API_KEY="your_actual_api_key_here"

# Start service
npm run dev
```

**Note**: This only works for the current PowerShell session. If you close the terminal, you'll need to set it again.

## Option 3: Set Environment Variable Permanently

```powershell
# Set permanently for current user
[System.Environment]::SetEnvironmentVariable("GOOGLE_PLACES_API_KEY", "your_actual_api_key_here", "User")

# Restart PowerShell or reload environment
$env:GOOGLE_PLACES_API_KEY=[System.Environment]::GetEnvironmentVariable("GOOGLE_PLACES_API_KEY", "User")
```

## Verify API Key is Set

After starting the service, check the logs. You should see:

```
✅ Google Places MCP Service running on http://localhost:8932
```

If you see a warning about `GOOGLE_PLACES_API_KEY not set`, the key wasn't loaded properly.

## Get Your Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Places API
3. Create credentials (API Key)
4. Copy the key and use it in one of the methods above

## Troubleshooting

**Service says API key not set?**
- Check `.env` file exists in `backend/services/google-places-mcp-service/`
- Verify the file has `GOOGLE_PLACES_API_KEY=your_key` (no spaces around `=`)
- Make sure you're in the correct directory when running `npm run dev`

**PowerShell syntax errors?**
- Use double quotes: `$env:VARIABLE="value"`
- Don't use `export` (that's for bash/Linux)
