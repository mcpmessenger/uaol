# Troubleshooting "Failed to Fetch" Error

## 🔍 Quick Diagnosis

The "Failed to fetch" error means the frontend can't connect to the backend. Here's how to fix it:

---

## ✅ Step 1: Check Backend is Running

**Check if backend services are running:**

```bash
# In backend directory
cd backend
npm run dev
```

**You should see:**
```
api-gateway listening on port 3000
auth-service listening on port 3001
...
```

**If not running:**
- Start it: `cd backend && npm run dev`
- Check for errors in the terminal

---

## ✅ Step 2: Check Frontend .env File

**The frontend needs `VITE_API_BASE_URL` set.**

**Create `.env` file in project root:**

```bash
# From project root
echo "VITE_API_BASE_URL=http://localhost:3000" > .env
```

**Or create manually:**
- File: `.env` (in project root, same level as `package.json`)
- Content:
```
VITE_API_BASE_URL=http://localhost:3000
```

**Important:**
- ⚠️ Must restart frontend dev server after creating/updating `.env`
- ⚠️ File must be named `.env` (not `.env.local` or `.env.development`)

---

## ✅ Step 3: Verify CORS is Enabled

**Check `backend/services/api-gateway/src/index.ts`:**

Should have:
```typescript
app.use(cors());
```

**If missing, add it.**

---

## ✅ Step 4: Test Backend Directly

**Test if backend is accessible:**

```bash
# Test health endpoint
curl http://localhost:3000/health

# Should return:
# {"service":"api-gateway","status":"healthy","timestamp":"..."}
```

**If this fails:**
- Backend is not running or wrong port
- Check backend logs for errors

---

## ✅ Step 5: Check Browser Console

**Open browser DevTools → Console:**

Look for:
- CORS errors
- Network errors
- Wrong URL being called

**Common errors:**
- `CORS policy: No 'Access-Control-Allow-Origin'` → CORS issue
- `net::ERR_CONNECTION_REFUSED` → Backend not running
- `net::ERR_FAILED` → Network issue

---

## ✅ Step 6: Verify API URL

**In browser DevTools → Network tab:**

1. Send a chat message
2. Check the request URL
3. Should be: `http://localhost:3000/chat`

**If wrong URL:**
- Check `.env` file
- Restart frontend dev server
- Check `src/lib/api/client.ts` for correct default

---

## 🔧 Quick Fix Checklist

- [ ] Backend running (`cd backend && npm run dev`)
- [ ] Frontend `.env` file exists with `VITE_API_BASE_URL=http://localhost:3000`
- [ ] Frontend dev server restarted after creating `.env`
- [ ] CORS enabled in API Gateway
- [ ] Backend health endpoint works (`curl http://localhost:3000/health`)
- [ ] Browser console shows correct API URL

---

## 🐛 Common Issues

### Issue 1: Backend Not Running

**Symptom:** `ERR_CONNECTION_REFUSED`

**Fix:**
```bash
cd backend
npm run dev
```

---

### Issue 2: Missing .env File

**Symptom:** Frontend tries to connect to wrong URL

**Fix:**
```bash
# Create .env in project root
echo "VITE_API_BASE_URL=http://localhost:3000" > .env

# Restart frontend
npm run dev
```

---

### Issue 3: CORS Error

**Symptom:** `CORS policy: No 'Access-Control-Allow-Origin'`

**Fix:**
- Check `backend/services/api-gateway/src/index.ts` has `app.use(cors())`
- Restart backend

---

### Issue 4: Wrong Port

**Symptom:** Connection refused on different port

**Fix:**
- Check backend is on port 3000
- Check `.env` has correct port
- Check no other service using port 3000

---

## 🧪 Test Connection

**Quick test script:**

```bash
# Test backend
curl http://localhost:3000/health

# Test chat endpoint
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

**Both should return JSON responses.**

---

## 📝 Still Not Working?

1. **Check backend logs** for errors
2. **Check frontend console** for specific error messages
3. **Verify ports** are not in use:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Linux/Mac
   lsof -i :3000
   ```
4. **Try different browser** (incognito mode)
5. **Check firewall** isn't blocking localhost

---

## ✅ Expected Behavior

**When working correctly:**
- Frontend sends request to `http://localhost:3000/chat`
- Backend responds with JSON
- Chat message appears in UI
- No errors in console

