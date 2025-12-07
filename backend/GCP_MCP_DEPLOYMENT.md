# Deploying MCP Servers on Google Cloud Platform (GCP)

This guide shows you how to deploy MCP servers (like Playwright, Google Places, etc.) on GCP so they're always available and scalable.

## Why Deploy on GCP?

- ✅ **Always Available**: Services run 24/7 without your local machine
- ✅ **Scalable**: Handle multiple concurrent requests
- ✅ **Reliable**: GCP manages uptime and restarts
- ✅ **Secure**: API keys stored in Secret Manager
- ✅ **Cost-Effective**: Pay only for what you use

## Deployment Options

### Option 1: Cloud Run (Recommended - Serverless)

**Best for**: Cost-effective, auto-scaling, pay-per-use

#### Step 1: Create Dockerfile

```dockerfile
# Dockerfile for Google Places MCP Service
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY dist ./dist

# Expose port
EXPOSE 8932

# Start service
CMD ["node", "dist/index.js"]
```

#### Step 2: Build and Deploy

```bash
# Set your GCP project
gcloud config set project YOUR_PROJECT_ID

# Build the container
cd backend/services/google-places-mcp-service
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/google-places-mcp

# Deploy to Cloud Run
gcloud run deploy google-places-mcp \
  --image gcr.io/YOUR_PROJECT_ID/google-places-mcp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_PLACES_API_KEY=$(gcloud secrets versions access latest --secret=google-places-api-key)" \
  --port 8932 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

#### Step 3: Store API Key in Secret Manager

```bash
# Create secret
echo -n "YOUR_GOOGLE_PLACES_API_KEY" | gcloud secrets create google-places-api-key --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding google-places-api-key \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Option 2: Compute Engine (VM)

**Best for**: Full control, custom configurations, long-running processes

#### Step 1: Create VM

```bash
# Create VM instance
gcloud compute instances create mcp-server-vm \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server
```

#### Step 2: Install Dependencies

```bash
# SSH into VM
gcloud compute ssh mcp-server-vm --zone=us-central1-a

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install your service
git clone YOUR_REPO
cd backend/services/google-places-mcp-service
npm install
npm run build
```

#### Step 3: Run as Systemd Service

```bash
# Create systemd service file
sudo nano /etc/systemd/system/google-places-mcp.service
```

```ini
[Unit]
Description=Google Places MCP Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/backend/services/google-places-mcp-service
Environment="GOOGLE_PLACES_API_KEY=YOUR_KEY"
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable google-places-mcp
sudo systemctl start google-places-mcp
```

### Option 3: Cloud Functions (For Simple Services)

**Best for**: Event-driven, lightweight services

```bash
# Deploy as Cloud Function
gcloud functions deploy google-places-mcp \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger=http \
  --allow-unauthenticated \
  --set-secrets=GOOGLE_PLACES_API_KEY=google-places-api-key:latest
```

## Registering GCP-Deployed Services in UAOL

Once your service is deployed on GCP, register it in UAOL:

```bash
# Get the Cloud Run URL (or VM external IP)
SERVICE_URL="https://google-places-mcp-xxxxx-uc.a.run.app"

# Register in UAOL
cd backend
./scripts/register-playwright-mcp.sh \
  --url $SERVICE_URL \
  --name "Google Places API" \
  --protocol rest \
  --token YOUR_JWT_TOKEN
```

## Cost Estimates

### Cloud Run
- **Free tier**: 2 million requests/month free
- **After free tier**: ~$0.40 per million requests
- **Memory**: ~$0.0000025 per GB-second
- **Estimated**: $5-20/month for moderate usage

### Compute Engine (e2-small)
- **Instance**: ~$15/month (always running)
- **Storage**: ~$2/month (20GB disk)
- **Estimated**: ~$17/month

### Cloud Functions
- **Free tier**: 2 million invocations/month
- **After free tier**: ~$0.40 per million
- **Estimated**: $5-15/month

## Security Best Practices

1. **Use Secret Manager** for API keys (never hardcode)
2. **Enable VPC** for internal services
3. **Use IAM** to restrict access
4. **Enable Cloud Armor** for DDoS protection
5. **Use HTTPS only** (Cloud Run provides this automatically)

## Monitoring

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Monitor metrics
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

## Example: Deploy Both Services

```bash
# Deploy Google Places service
cd backend/services/google-places-mcp-service
gcloud run deploy google-places-mcp --image gcr.io/PROJECT/google-places-mcp

# Deploy Playwright adapter
cd ../playwright-mcp-adapter
gcloud run deploy playwright-mcp-adapter --image gcr.io/PROJECT/playwright-mcp-adapter
```

## Troubleshooting

**Service not starting?**
- Check logs: `gcloud logging read "resource.type=cloud_run_revision"`
- Verify API keys in Secret Manager
- Check service account permissions

**High costs?**
- Use Cloud Run with min-instances=0 (scales to zero)
- Set up budget alerts
- Monitor usage in Cloud Console

**Connection issues?**
- Verify firewall rules allow traffic
- Check service URLs are correct
- Ensure services are in same region for lower latency
