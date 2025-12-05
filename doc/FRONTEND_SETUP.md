# Frontend Setup Guide

## Environment Variables

The frontend needs to know where to connect to the backend API.

### 1. Create `.env` file in the root directory

```bash
# Copy the example
cp .env.example .env
```

### 2. Update `.env` with your backend URL

```env
# Use API Gateway (recommended - routes to all services)
VITE_API_BASE_URL=http://localhost:3000

# Or connect directly to specific services
# VITE_AUTH_SERVICE_URL=http://localhost:3001
# VITE_JOB_SERVICE_URL=http://localhost:3003
```

### 3. Restart the frontend dev server

After updating `.env`, restart Vite:

```powershell
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## Backend Connection

The frontend is now configured to connect to:
- **API Gateway**: `http://localhost:3000` (default)
- This routes to all backend services automatically

## API Client

The frontend includes an API client (`src/lib/api/client.ts`) that handles:
- Authentication (JWT tokens)
- API requests to backend services
- Error handling

## Current Status

✅ **Backend**: Fully set up and connected to Supabase
✅ **Frontend API Client**: Created and ready to use
⚠️ **Chat Integration**: Currently using mock responses (needs backend chat endpoint)

## Next Steps

1. **Start the backend**:
   ```powershell
   cd backend
   npm run dev
   ```

2. **Start the frontend** (in a new terminal):
   ```powershell
   npm run dev
   ```

3. **Test the connection**:
   - The frontend will connect to `http://localhost:3000` (API Gateway)
   - API Gateway routes requests to the appropriate services

## Implementing Chat Backend

To connect the chat to the backend, you'll need to:
1. Create a chat service endpoint in the backend
2. Update `ChatContainer.tsx` to use `apiClient.sendChatMessage()`
3. The chat service should integrate with job orchestration for workflow execution

