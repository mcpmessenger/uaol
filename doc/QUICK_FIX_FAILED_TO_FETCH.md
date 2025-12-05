# Quick Fix: "Failed to Fetch" Error

## 🚨 Most Common Cause: Missing Frontend .env File

The frontend needs to know where the backend is. Create this file:

**File:** `.env` (in project root, same folder as `package.json`)

**Content:**
```
VITE_API_BASE_URL=http://localhost:3000
```

---

## ✅ Quick Fix Steps

### 1. Create .env File

**Option A: PowerShell (from project root)**
```powershell
"VITE_API_BASE_URL=http://localhost:3000" | Out-File -FilePath .env -Encoding utf8
```

**Option B: Manual**
- Create file named `.env` in project root
- Add: `VITE_API_BASE_URL=http://localhost:3000`

### 2. Restart Frontend Dev Server

**Important:** Must restart after creating/updating `.env`

```bash
# Stop current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### 3. Verify Backend is Running

```bash
# In separate terminal:
cd backend
npm run dev
```

**Should see:**
```
api-gateway listening on port 3000
```

### 4. Test Connection

**In browser:**
- Open DevTools → Network tab
- Send a chat message
- Check request goes to `http://localhost:3000/chat`

---

## 🔍 Verify It's Fixed

**Check browser console:**
- No "Failed to fetch" errors
- Network tab shows successful requests
- Chat messages work

**If still failing:**
1. Check backend is running: `curl http://localhost:3000/health`
2. Check `.env` file exists and has correct content
3. Check frontend was restarted after creating `.env`

