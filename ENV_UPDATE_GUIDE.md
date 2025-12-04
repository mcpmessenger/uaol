# Environment Variables Update Guide

## What Needs to Be Updated

### Frontend `.env` File (Root Directory)

Add this line to your existing `.env` file:

```env
# Backend API URL - Points to API Gateway
VITE_API_BASE_URL=http://localhost:3000
```

**Why?**
- The frontend API client (`src/lib/api/client.ts`) uses this to connect to the backend
- Defaults to `http://localhost:3000` if not set, but it's better to be explicit
- The API Gateway (port 3000) routes to all backend services

### Backend `.env` File (Already Set Up ✅)

Your backend `.env` already has:
- ✅ `DATABASE_URL` - Connected to Supabase
- ✅ All service ports configured
- ✅ Other backend settings

**No changes needed for backend!**

## Quick Update

If you have a `.env` file in the root directory, just add:

```env
VITE_API_BASE_URL=http://localhost:3000
```

If you don't have a `.env` file in the root, create one with just that line.

## After Updating

1. **Restart your frontend dev server** (if it's running):
   ```powershell
   # Stop with Ctrl+C, then:
   npm run dev
   ```

2. **The frontend will now connect to:**
   - API Gateway: `http://localhost:3000`
   - Which routes to all backend services

## Testing the Connection

Once both frontend and backend are running:

1. **Backend**: `cd backend && npm run dev`
2. **Frontend**: `npm run dev` (in root)
3. The frontend should be able to make API calls to the backend

## Current Status

- ✅ Backend `.env` - Complete (Supabase connected)
- ⚠️ Frontend `.env` - Needs `VITE_API_BASE_URL=http://localhost:3000`

