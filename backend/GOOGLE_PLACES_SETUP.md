# Google Places API Integration

## Quick Answer

**You don't need to deploy on GCP** - you can run services locally or anywhere. However, **GCP deployment is recommended for production** for reliability and scalability.

## Option 1: Use Existing Wrapper (Simplest)

UAOL already has a Google Places wrapper! It just needs to be exposed as an HTTP service.

**Status**: The wrapper exists but isn't exposed as an HTTP MCP tool yet.

## Option 2: Use New HTTP Service (Recommended)

I've created a new Google Places MCP HTTP service that you can:

### Run Locally

**PowerShell (Windows):**
```powershell
cd backend/services/google-places-mcp-service
npm install
$env:GOOGLE_PLACES_API_KEY="your_key_here"
npm run dev
```

**Bash (Linux/Mac):**
```bash
cd backend/services/google-places-mcp-service
npm install
export GOOGLE_PLACES_API_KEY=your_key_here
npm run dev
```

### Deploy on GCP (Cloud Run)

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT/google-places-mcp
gcloud run deploy google-places-mcp \
  --image gcr.io/YOUR_PROJECT/google-places-mcp \
  --set-secrets="GOOGLE_PLACES_API_KEY=google-places-api-key:latest"
```

**Cost**: ~$5-10/month (with free tier)

## Option 3: Deploy Multiple Services on GCP

You can deploy **all your MCP servers** on GCP:

1. **Google Places** - For location search
2. **Playwright** - For web scraping  
3. **Any other MCP servers** you create

**Benefits**:
- Always available (24/7)
- Auto-scaling
- Secure (API keys in Secret Manager)
- Cost-effective (pay per use)

## Getting Started

### Local Setup (5 minutes)

**PowerShell (Windows):**
```powershell
# 1. Start Google Places service
cd backend/services/google-places-mcp-service
npm install
$env:GOOGLE_PLACES_API_KEY="your_key"
npm run dev

# 2. Register in UAOL (in another terminal)
cd backend
.\scripts\register-google-places.sh --token YOUR_TOKEN

# 3. Approve the tool
curl -X POST http://localhost:3000/tools/TOOL_ID/approve `
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Bash (Linux/Mac):**
```bash
# 1. Start Google Places service
cd backend/services/google-places-mcp-service
npm install
export GOOGLE_PLACES_API_KEY=your_key
npm run dev

# 2. Register in UAOL (in another terminal)
cd backend
./scripts/register-google-places.sh --token YOUR_TOKEN

# 3. Approve the tool
curl -X POST http://localhost:3000/tools/TOOL_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### GCP Deployment (30 minutes)

See [GCP_MCP_DEPLOYMENT.md](GCP_MCP_DEPLOYMENT.md) for complete instructions.

Quick version:
1. Create GCP project
2. Store API keys in Secret Manager
3. Deploy services to Cloud Run
4. Register URLs in UAOL

## Do You Need GCP?

**No, but it's recommended if:**
- ✅ You want 24/7 availability
- ✅ Multiple users will use the system
- ✅ You want auto-scaling
- ✅ You want production reliability

**Local is fine if:**
- ✅ Just testing/developing
- ✅ Single user
- ✅ Don't need always-on

## Next Steps

1. **Get Google Places API Key**: https://console.cloud.google.com/google/maps-apis
2. **Choose deployment**: Local or GCP
3. **Start service**: Follow setup guide
4. **Register in UAOL**: Use registration script
5. **Use in workflows**: Add MCP Tool nodes

See [MCP_SERVERS_DEPLOYMENT_GUIDE.md](MCP_SERVERS_DEPLOYMENT_GUIDE.md) for complete guide.
