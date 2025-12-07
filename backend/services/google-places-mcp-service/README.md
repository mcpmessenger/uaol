# Google Places MCP Service

HTTP MCP service for Google Places API. Can be deployed locally, on GCP, or anywhere.

## Local Development

**Easiest: Use .env file (all platforms):**
```bash
# 1. Create .env file in this directory
echo "GOOGLE_PLACES_API_KEY=your_api_key_here" > .env

# 2. Install and run
npm install
npm run dev
```

**PowerShell (Windows) - Alternative:**
```powershell
# Set API key for current session
$env:GOOGLE_PLACES_API_KEY="your_api_key_here"

# Run
npm run dev
```

**Bash (Linux/Mac) - Alternative:**
```bash
# Set API key for current session
export GOOGLE_PLACES_API_KEY=your_api_key_here

# Run
npm run dev
```

**Note**: The service automatically loads `.env` file if it exists. See [POWERSHELL_SETUP.md](POWERSHELL_SETUP.md) for Windows-specific instructions.

Service runs on `http://localhost:8932`

## Available Methods

- `text_search` - Search places by text query
- `nearby_search` - Find places near a location
- `place_details` - Get detailed place information
- `geocode` - Convert address to coordinates
- `reverse_geocode` - Convert coordinates to address

## Registering in UAOL

**PowerShell (Windows):**
```powershell
cd backend
.\scripts\register-google-places.sh --url http://localhost:8932 --token YOUR_JWT_TOKEN
```

**Bash (Linux/Mac):**
```bash
cd backend
./scripts/register-google-places.sh --url http://localhost:8932 --token YOUR_JWT_TOKEN
```

## Deploying to GCP

See [../../GCP_MCP_DEPLOYMENT.md](../../GCP_MCP_DEPLOYMENT.md) for detailed GCP deployment instructions.

Quick deploy:
```bash
# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/YOUR_PROJECT/google-places-mcp
gcloud run deploy google-places-mcp --image gcr.io/YOUR_PROJECT/google-places-mcp
```

## Environment Variables

- `GOOGLE_PLACES_API_KEY` - Required. Your Google Places API key
- `PORT` - Optional. Defaults to 8932

## API Endpoints

- `GET /health` - Health check
- `GET /mcp/manifest` - List available tools
- `POST /mcp/invoke` - Execute a tool method

## Example Usage

```bash
# Text search
curl -X POST http://localhost:8932/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "method": "text_search",
    "params": {
      "query": "restaurants in New York",
      "radius": 5000
    }
  }'
```
