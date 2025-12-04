# Quick Fix: File Upload "Failed to Fetch"

## 🚨 Problem

**Error:** `ERR_CONNECTION_REFUSED` for `/chat/upload`

**Cause:** Backend is not running or crashed

---

## ✅ Quick Fix

### Step 1: Restart Backend

```bash
# Stop current backend (Ctrl+C if running)
cd backend
npm run dev
```

**Wait for:**
```
api-gateway listening on port 3000
```

### Step 2: Verify Backend is Running

**Test health endpoint:**
```bash
curl http://localhost:3000/health
```

**Should return:**
```json
{"service":"api-gateway","status":"healthy",...}
```

### Step 3: Test File Upload Again

1. Select file in chat
2. Send message
3. Should work now!

---

## 🐛 If Backend Won't Start

### Check for Errors:

1. **Missing dependencies:**
   ```bash
   cd backend/services/api-gateway
   npm install form-data
   ```

2. **Import errors:**
   - Check backend terminal for error messages
   - Look for "Cannot find module" errors

3. **Port conflict:**
   ```bash
   # Check what's using port 3000
   netstat -ano | findstr :3000
   ```

---

## ✅ Expected Behavior

**When working:**
- Backend logs: "File upload request"
- Files stored in `backend/uploads/{userId}/`
- CSV text extracted and included in AI context
- AI can analyze the file content

---

## 📋 File Upload Flow

1. **Frontend** → Sends files to `/chat/upload`
2. **Backend** → Stores files, extracts text
3. **Backend** → Returns file metadata
4. **Frontend** → Includes file content in chat message
5. **AI** → Receives message + file content → Analyzes

---

**The backend endpoint is ready - just needs to be running!**

