# Backend Environment Configuration

## Required for OCR (Google Cloud Vision API)

Add these to `backend/.env`:

```env
# OCR Configuration (Google Cloud Vision API)
# Get your API key from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLOUD_VISION_API_KEY=your-api-key-here
# Enable OCR for scanned documents and images (default: true)
ENABLE_OCR=true
```

## Current Environment Variables

### AI Model Configuration
```env
OPENAI_API_KEY=your-openai-key-here
OPENAI_MODEL=gpt-4
```

### OCR Configuration (NEW - for scanned PDFs/images)
```env
GOOGLE_CLOUD_VISION_API_KEY=your-google-cloud-vision-key-here
ENABLE_OCR=true
```

### PDF Image Extraction
```env
ENABLE_PDF_IMAGE_EXTRACTION=true
MAX_PDF_IMAGES=20
MIN_PDF_IMAGE_SIZE=5000
```

### Database Configuration
```env
DATABASE_URL=postgresql://user:password@localhost:5432/uaol
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10000
```

### Redis Configuration
```env
REDIS_URL=redis://localhost:6379
REDIS_CLUSTER_MODE=false
```

### API Gateway
```env
API_GATEWAY_PORT=3000
RATE_LIMIT_PER_MINUTE=100
```

### JWT Configuration
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

## Quick Setup for OCR

1. **Get Google Cloud Vision API Key:**
   - Go to: https://console.cloud.google.com/
   - Enable "Cloud Vision API"
   - Create API key
   - Copy key

2. **Add to `backend/.env`:**
   ```env
   GOOGLE_CLOUD_VISION_API_KEY=AIzaSy...your-key-here
   ENABLE_OCR=true
   ```

3. **Restart server:**
   ```bash
   cd backend
   npm run dev
   ```

## File Location

- **Example file:** `backend/env.example` (template)
- **Your config:** `backend/.env` (actual values - not in git)

## Important Notes

- ✅ `backend/.env` is in `.gitignore` (not committed)
- ✅ Copy from `env.example` if `.env` doesn't exist
- ✅ Restart server after changing `.env`
- ✅ No quotes needed around values in `.env`

## What Each OCR Variable Does

- **`GOOGLE_CLOUD_VISION_API_KEY`** - Required for OCR functionality
- **`ENABLE_OCR`** - Enable/disable OCR (default: true if not set)

## Testing

After adding the key, test with:
1. Upload a scanned PDF
2. Check logs for: `OCR extracted text successfully`
3. Verify text extraction works
