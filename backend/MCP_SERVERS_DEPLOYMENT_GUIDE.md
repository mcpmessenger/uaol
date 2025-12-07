# MCP Servers Deployment Guide

Complete guide for deploying MCP servers (Playwright, Google Places, etc.) for UAOL.

## Overview

You have **three deployment options**:

1. **Local Development** - Run on your machine (easiest for testing)
2. **GCP Cloud Run** - Serverless, auto-scaling, cost-effective (recommended for production)
3. **GCP Compute Engine** - Full control, always-on VMs

## Quick Decision Guide

**Use Local if:**
- Just testing/developing
- Don't need 24/7 availability
- Want zero infrastructure setup

**Use Cloud Run if:**
- Need production reliability
- Want auto-scaling
- Prefer pay-per-use pricing
- Want minimal operational overhead

**Use Compute Engine if:**
- Need persistent connections (WebSockets)
- Require custom configurations
- Need guaranteed resources
- Have long-running processes

## Available MCP Services

### 1. Google Places API Service

**Location**: `backend/services/google-places-mcp-service`

**Features**:
- Text search
- Nearby search
- Place details
- Geocoding
- Reverse geocoding

**Deploy**:

**PowerShell (Windows):**
```powershell
cd backend/services/google-places-mcp-service
npm install
$env:GOOGLE_PLACES_API_KEY="your_key"
npm run dev
```

**Bash (Linux/Mac):**
```bash
cd backend/services/google-places-mcp-service
npm install
export GOOGLE_PLACES_API_KEY=your_key
npm run dev
```

**Register**:
```bash
./scripts/register-google-places.sh --token YOUR_TOKEN
```

### 2. Playwright MCP Adapter

**Location**: `backend/services/playwright-mcp-adapter`

**Features**:
- Web scraping
- Browser automation
- Screenshot capture
- Form filling

**Deploy**:
```bash
cd backend/services/playwright-mcp-adapter
npm install
npm run dev
```

**Register**:
```bash
./scripts/register-playwright-mcp.sh --token YOUR_TOKEN
```

## GCP Deployment (Cloud Run)

### Prerequisites

1. **GCP Account**: Sign up at [cloud.google.com](https://cloud.google.com)
2. **GCP CLI**: Install [gcloud CLI](https://cloud.google.com/sdk/docs/install)
3. **Billing**: Enable billing (free tier available)

### Step 1: Set Up GCP Project

```bash
# Login to GCP
gcloud auth login

# Create project (or use existing)
gcloud projects create uaol-mcp-services --name="UAOL MCP Services"

# Set as active project
gcloud config set project uaol-mcp-services

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### Step 2: Store API Keys in Secret Manager

```bash
# Store Google Places API key
echo -n "YOUR_GOOGLE_PLACES_API_KEY" | \
  gcloud secrets create google-places-api-key --data-file=-

# Store any other API keys
echo -n "YOUR_OTHER_API_KEY" | \
  gcloud secrets create other-api-key --data-file=-
```

### Step 3: Deploy Google Places Service

```bash
cd backend/services/google-places-mcp-service

# Build the service
npm run build

# Build Docker image
gcloud builds submit --tag gcr.io/uaol-mcp-services/google-places-mcp

# Deploy to Cloud Run
gcloud run deploy google-places-mcp \
  --image gcr.io/uaol-mcp-services/google-places-mcp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GOOGLE_PLACES_API_KEY=google-places-api-key:latest" \
  --port 8932 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### Step 4: Deploy Playwright Adapter

```bash
cd backend/services/playwright-mcp-adapter

# Build and deploy
npm run build
gcloud builds submit --tag gcr.io/uaol-mcp-services/playwright-mcp-adapter

gcloud run deploy playwright-mcp-adapter \
  --image gcr.io/uaol-mcp-services/playwright-mcp-adapter \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8931 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 5
```

### Step 5: Register Services in UAOL

After deployment, you'll get URLs like:
- `https://google-places-mcp-xxxxx-uc.a.run.app`
- `https://playwright-mcp-adapter-xxxxx-uc.a.run.app`

Register them:

```bash
# Register Google Places
./scripts/register-google-places.sh \
  --url https://google-places-mcp-xxxxx-uc.a.run.app \
  --token YOUR_TOKEN

# Register Playwright
./scripts/register-playwright-mcp.sh \
  --url https://playwright-mcp-adapter-xxxxx-uc.a.run.app \
  --token YOUR_TOKEN
```

## Cost Estimates

### Cloud Run Pricing (per service)

- **Free tier**: 2 million requests/month
- **Requests**: $0.40 per million (after free tier)
- **Memory**: $0.0000025 per GB-second
- **CPU**: $0.00002400 per vCPU-second

**Example monthly cost** (moderate usage):
- Google Places: ~$5-10/month
- Playwright: ~$10-20/month (higher memory/CPU)
- **Total**: ~$15-30/month for both services

### Compute Engine Pricing

- **e2-small VM**: ~$15/month (always running)
- **Storage**: ~$2/month (20GB)
- **Total**: ~$17/month per VM

## Monitoring & Logs

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Monitor specific service
gcloud logging read "resource.labels.service_name=google-places-mcp" --limit 50

# Set up alerts
gcloud alpha monitoring policies create --policy-from-file=alert-policy.yaml
```

## Security Best Practices

1. **Use Secret Manager** for all API keys
2. **Enable VPC** for internal-only services
3. **Use IAM** to restrict access
4. **Enable Cloud Armor** for DDoS protection
5. **Use HTTPS only** (Cloud Run provides automatically)
6. **Set up budget alerts** to avoid surprise costs

## Troubleshooting

**Service not responding?**
- Check logs: `gcloud logging read`
- Verify API keys in Secret Manager
- Check service account permissions
- Verify firewall rules

**High costs?**
- Set min-instances=0 (scales to zero)
- Set up budget alerts
- Monitor usage in Cloud Console
- Use smaller memory/CPU allocations

**Deployment fails?**
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Check build logs: `gcloud builds list`
- Ensure Secret Manager secrets exist

## Next Steps

1. Deploy services to GCP
2. Register them in UAOL
3. Test in workflow builder
4. Set up monitoring and alerts
5. Configure auto-scaling if needed

For detailed GCP setup, see [GCP_MCP_DEPLOYMENT.md](GCP_MCP_DEPLOYMENT.md)
