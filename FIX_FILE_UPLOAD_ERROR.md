# Fix "Failed to Fetch" File Upload Error

## 🔍 Problem

**Error:** `net::ERR_CONNECTION_REFUSED` for `/chat/upload` and `/chat`

**Cause:** Backend is not running or crashed

---

## ✅ Solution

### Step 1: Check Backend Status

```bash
# Check if backend is running
netstat -ano | findstr :3000
```

**If nothing shows:**
- Backend is not running
- Start it: `cd backend && npm run dev`

### Step 2: Check Backend Logs

Look for errors in the backend terminal:
- Import errors
- Missing dependencies
- Syntax errors

### Step 3: Verify Endpoint

**Test upload endpoint directly:**

```bash
# Test if backend is accessible
curl http://localhost:3000/health

# Should return:
# {"service":"api-gateway","status":"healthy",...}
```

---

## 🐛 Common Issues

### Issue 1: Backend Not Running

**Fix:**
```bash
cd backend
npm run dev
```

**Should see:**
```
api-gateway listening on port 3000
```

### Issue 2: Backend Crashed

**Check for errors:**
- Missing `form-data` package
- Import errors in `file-processor.ts`
- Syntax errors

**Fix:**
```bash
cd backend/services/api-gateway
npm install form-data
cd ../..
npm run dev
```

### Issue 3: Port Already in Use

**Check:**
```bash
netstat -ano | findstr :3000
```

**Kill process if needed:**
```bash
taskkill /PID <process-id> /F
```

---

## 🧪 Test File Upload

### After Backend is Running:

1. **Select file** in chat
2. **Send message**
3. **Check backend logs** for:
   - "File upload request"
   - File processing
   - Success response

### Expected Backend Logs:

```
File upload request { userId: '...', fileCount: 1, files: [...] }
File stored { userId: '...', fileId: '...', filename: '...' }
```

---

## ✅ Quick Fix Checklist

- [ ] Backend running (`cd backend && npm run dev`)
- [ ] Port 3000 accessible (`curl http://localhost:3000/health`)
- [ ] `form-data` package installed
- [ ] No errors in backend terminal
- [ ] Frontend `.env` has `VITE_API_BASE_URL=http://localhost:3000`

---

## 🚀 Restart Backend

**If backend crashed or needs restart:**

```bash
# Stop current backend (Ctrl+C)
cd backend
npm run dev
```

**Wait for:**
```
api-gateway listening on port 3000
```

**Then test file upload again!**

