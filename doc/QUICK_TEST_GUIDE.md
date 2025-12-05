# Quick Test Guide - Guest Mode

## 🚀 Fastest Way to Test

### Option 1: PowerShell Script (Windows)

```powershell
# From project root
.\test-guest-mode.ps1
```

### Option 2: Manual API Test

```bash
# Test 1: Create guest user
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: my-test-guest-123" \
  -d '{"message": "Hello from guest!"}'
```

### Option 3: Browser Test (Easiest)

1. **Open incognito/private browser**
2. **Go to**: `http://localhost:5173` (or your frontend URL)
3. **Open DevTools** → Network tab
4. **Send a chat message**
5. **Check**:
   - ✅ Request has `X-Guest-Id` header
   - ✅ Response is successful
   - ✅ No login required

---

## ✅ Quick Verification Checklist

- [ ] **Backend running**: `cd backend && npm run dev`
- [ ] **Frontend running**: `npm run dev` (from root)
- [ ] **Database migration**: `cd backend && npm run migrate`
- [ ] **Test in browser**: Open incognito → Chat → Send message
- [ ] **Check database**: Guest user created with 1000 credits

---

## 🔍 What to Look For

### In Browser DevTools (Network Tab):
- ✅ Request header: `X-Guest-Id: guest_...`
- ✅ No `Authorization` header
- ✅ Response: 200 OK

### In Database:
```sql
SELECT * FROM users WHERE is_guest = true ORDER BY created_at DESC LIMIT 1;
```
- ✅ `is_guest = true`
- ✅ `current_credits = 1000`
- ✅ `email` like `guest_...@uaol.guest`

### In Browser Console:
```javascript
localStorage.getItem('uaol_guest_id')  // Should have value
localStorage.getItem('uaol_token')      // Should be null
```

---

## 🐛 If Something Doesn't Work

1. **Check backend logs** for errors
2. **Verify migration ran**: Check database columns exist
3. **Clear browser cache** and try again
4. **Check network tab** for request headers

---

## 📝 Full Testing Guide

See `TESTING_GUEST_MODE.md` for comprehensive testing instructions.

