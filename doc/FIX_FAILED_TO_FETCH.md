# Fix "Failed to Fetch" Error - Step by Step

## 🔍 Problem Identified

Your "Failed to fetch" error is caused by:
1. ❌ **Backend is NOT running** (connection refused on port 3000)
2. ⚠️ **Frontend .env file** may be missing or empty

---

## ✅ Solution

### Step 1: Start Backend Services

**Open a terminal and run:**

```bash
cd backend
npm run dev
```

**You should see:**
```
api-gateway listening on port 3000
auth-service listening on port 3001
...
```

**Keep this terminal running!**

---

### Step 2: Verify Frontend .env File

**Check if `.env` exists in project root and has:**

```
VITE_API_BASE_URL=http://localhost:3000
```

**If missing or empty, create it:**

```powershell
# From project root
"VITE_API_BASE_URL=http://localhost:3000" | Out-File -FilePath .env -Encoding utf8
```

---

### Step 3: Restart Frontend Dev Server

**Important:** Must restart frontend after creating/updating `.env`

```bash
# Stop current frontend (Ctrl+C if running)
# Then restart:
npm run dev
```

---

### Step 4: Test Connection

**In browser:**
1. Open DevTools → Network tab
2. Send a chat message
3. Should see request to `http://localhost:3000/chat`
4. Should get successful response

---

## 🧪 Verify Backend is Running

**Test backend health endpoint:**

```bash
# PowerShell
Invoke-WebRequest -Uri http://localhost:3000/health

# Or curl (if available)
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "service": "api-gateway",
  "status": "healthy",
  "timestamp": "..."
}
```

**If this fails:** Backend is not running → Start it with `cd backend && npm run dev`

---

## 📋 Quick Checklist

- [ ] Backend running: `cd backend && npm run dev`
- [ ] `.env` file exists in project root
- [ ] `.env` contains: `VITE_API_BASE_URL=http://localhost:3000`
- [ ] Frontend dev server restarted after creating `.env`
- [ ] Backend health check works: `curl http://localhost:3000/health`
- [ ] Browser shows successful requests in Network tab

---

## 🐛 Still Not Working?

### Check Backend Logs

Look for errors in the backend terminal:
- Database connection errors
- Port already in use
- Missing environment variables

### Check Browser Console

Open DevTools → Console:
- Look for specific error messages
- Check Network tab for failed requests
- Verify request URL is correct

### Common Issues

1. **Port 3000 already in use:**
   ```bash
   # Windows - find what's using port 3000
   netstat -ano | findstr :3000
   ```

2. **Database not connected:**
   - Check `backend/.env` has `DATABASE_URL`
   - Run migration: `cd backend && npm run migrate`

3. **CORS errors:**
   - Backend should have `app.use(cors())` (already configured)

---

## ✅ Expected Result

**When fixed:**
- ✅ Backend terminal shows services running
- ✅ Frontend sends requests successfully
- ✅ Chat messages work
- ✅ No "Failed to fetch" errors
- ✅ Network tab shows 200 OK responses

---

## 🚀 Quick Start Commands

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
# Make sure .env exists first
npm run dev
```

**Then test in browser!**

