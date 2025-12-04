# Testing Guest Mode - Step by Step Guide

## 🚀 Prerequisites

1. **Run Database Migration** (if not done yet)
2. **Backend services running**
3. **Frontend running**

---

## Step 1: Run Database Migration

First, ensure the guest user columns are added to the database:

```bash
cd backend
npm run migrate
```

Or manually run the migration SQL:

```bash
# Using psql (adjust connection string)
psql $DATABASE_URL -f shared/database/migrations/add-guest-support.sql
```

**Verify migration:**
```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('is_guest', 'session_id', 'expires_at');
```

---

## Step 2: Test Backend Directly

### Test 1: Guest User Creation via API

**Using curl or Postman:**

```bash
# Test chat endpoint without auth token (should create guest)
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: test-guest-123" \
  -d '{"message": "Hello, I am a guest user"}'
```

**Expected Result:**
- ✅ Status 200
- ✅ AI response (if OpenAI key is set)
- ✅ Guest user created in database

**Check Database:**
```sql
SELECT user_id, email, is_guest, session_id, current_credits, expires_at 
FROM users 
WHERE session_id = 'test-guest-123';
```

**Expected:**
- `is_guest = true`
- `email` like `guest_test-guest-123@uaol.guest`
- `current_credits = 1000`
- `expires_at` = 24 hours from now

---

### Test 2: Guest User Reuse

**Same guest ID, different request:**

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: test-guest-123" \
  -d '{"message": "Second message from same guest"}'
```

**Expected Result:**
- ✅ Uses same guest user (not creating new one)
- ✅ Credits deducted from same account

**Check Database:**
```sql
SELECT current_credits FROM users WHERE session_id = 'test-guest-123';
```

**Expected:** Credits should be less than 1000 (if chat costs credits)

---

### Test 3: Guest Expiration

**Test expired guest (manually set expiration):**

```sql
-- Manually expire a guest user
UPDATE users 
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE session_id = 'test-guest-123';
```

**Then make request:**

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: test-guest-123" \
  -d '{"message": "Test expired guest"}'
```

**Expected Result:**
- ✅ New guest user created (old one expired)
- ✅ New user has 1000 credits again

---

### Test 4: Authenticated User (Still Works)

**Test with auth token:**

```bash
# First, register/login to get token
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Use token from response
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"message": "Hello from authenticated user"}'
```

**Expected Result:**
- ✅ Works normally
- ✅ Uses registered user (not guest)
- ✅ `isGuest = false` in backend

---

## Step 3: Test Frontend

### Test 1: Guest Mode in Browser

1. **Open browser in incognito/private mode** (or clear localStorage)
2. **Navigate to chat page**
3. **Open browser DevTools** → Network tab
4. **Send a chat message**

**Check Network Request:**
- ✅ Should see `X-Guest-Id` header in request
- ✅ Should NOT see `Authorization` header
- ✅ Response should be successful

**Check localStorage:**
```javascript
// In browser console
localStorage.getItem('uaol_guest_id')  // Should have a value
localStorage.getItem('uaol_token')     // Should be null
```

**Check Database:**
```sql
-- Find the guest user created
SELECT * FROM users 
WHERE email LIKE 'guest_%@uaol.guest' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Test 2: Guest Session Persistence

1. **Send multiple messages** (without refreshing)
2. **Check that same guest ID is used**

**In browser console:**
```javascript
// Should be same ID across requests
localStorage.getItem('uaol_guest_id')
```

**Check Database:**
```sql
-- Should see credits decreasing
SELECT session_id, current_credits, updated_at 
FROM users 
WHERE is_guest = true 
ORDER BY updated_at DESC;
```

---

### Test 3: Guest to Registered Upgrade

1. **Start as guest** (send a message)
2. **Register/Login** (use registration form)
3. **Send another message**

**Expected:**
- ✅ Guest session cleared
- ✅ Auth token stored
- ✅ Now using registered user
- ✅ No `X-Guest-Id` header (using `Authorization` instead)

**Check localStorage:**
```javascript
localStorage.getItem('uaol_guest_id')  // Should be null (cleared)
localStorage.getItem('uaol_token')      // Should have token
```

---

## Step 4: Test Guest Limits

### Test 1: Credit Limit

**Manually set guest credits to 0:**

```sql
UPDATE users 
SET current_credits = 0 
WHERE session_id = 'test-guest-123';
```

**Make request:**

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: test-guest-123" \
  -d '{"message": "Test with no credits"}'
```

**Expected Result:**
- ⚠️ Error response (if chat costs credits)
- ⚠️ Message about guest credits exhausted

---

### Test 2: Workflow Creation (Guest)

**Create a workflow as guest:**

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: test-guest-123" \
  -d '{
    "workflow_definition": {
      "steps": [
        {"tool": "test-tool", "input": "test"}
      ]
    }
  }'
```

**Expected Result:**
- ✅ Should work (guest limits not fully enforced yet)
- ✅ Credits deducted

---

## Step 5: Integration Testing

### Full Flow Test

1. **Open incognito browser**
2. **Visit chat page** → Should work immediately
3. **Send 5 messages** → All should work
4. **Check credits** → Should decrease
5. **Register account** → Should upgrade from guest
6. **Send message** → Should use registered account

---

## Step 6: Edge Cases

### Test 1: No Guest ID Header

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "No guest ID"}'
```

**Expected:**
- ✅ Backend generates new guest ID
- ✅ Guest user created

---

### Test 2: Invalid Guest ID Format

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: invalid-format-123" \
  -d '{"message": "Invalid guest ID"}'
```

**Expected:**
- ✅ Should still work (backend handles it)

---

### Test 3: Guest with Auth Token

```bash
# Send both guest ID and auth token
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "X-Guest-Id: test-guest-123" \
  -H "Authorization: Bearer VALID_TOKEN" \
  -d '{"message": "Both headers"}'
```

**Expected:**
- ✅ Auth token takes precedence
- ✅ Uses authenticated user (not guest)

---

## 🐛 Debugging

### Check Backend Logs

```bash
# In backend terminal, look for:
# - "Chat request from guest user" logs
# - Guest user creation logs
# - Any errors
```

### Check Database

```sql
-- List all guest users
SELECT 
  user_id, 
  email, 
  session_id, 
  current_credits, 
  expires_at,
  created_at
FROM users 
WHERE is_guest = true 
ORDER BY created_at DESC;

-- Check guest activity
SELECT 
  session_id,
  COUNT(*) as message_count,
  SUM(CASE WHEN current_credits < 1000 THEN 1 ELSE 0 END) as used_credits
FROM users 
WHERE is_guest = true
GROUP BY session_id;
```

### Check Frontend Console

```javascript
// In browser console
// Check guest session
import { getGuestId, isGuest } from './lib/guest-session';
console.log('Guest ID:', getGuestId());
console.log('Is Guest:', isGuest());
```

---

## ✅ Success Criteria

All tests should pass:

- [ ] Guest user created on first request
- [ ] Same guest ID reuses same user
- [ ] Guest users have 1000 credits
- [ ] Guest users expire after 24 hours
- [ ] Frontend sends `X-Guest-Id` header
- [ ] Chat works without login
- [ ] Registered users still work
- [ ] Guest → Registered upgrade works
- [ ] Credits deducted correctly
- [ ] Guest limits enforced (when implemented)

---

## 🚨 Common Issues

### Issue: Guest user not created

**Check:**
- Database migration ran successfully
- `X-Guest-Id` header is being sent
- Backend logs for errors

**Fix:**
```sql
-- Manually check columns exist
\d users  -- In psql
```

### Issue: Credits not deducting

**Check:**
- Credit deduction logic in chat endpoint
- Database updates are happening

**Fix:**
- Check backend logs for credit updates

### Issue: Frontend not sending guest ID

**Check:**
- `src/lib/api/client.ts` updated correctly
- `src/lib/guest-session.ts` exists
- localStorage working

**Fix:**
- Rebuild frontend
- Clear browser cache

---

## 📊 Performance Testing

### Test Multiple Guests

```bash
# Create 10 different guests
for i in {1..10}; do
  curl -X POST http://localhost:3000/chat \
    -H "Content-Type: application/json" \
    -H "X-Guest-Id: guest-$i" \
    -d "{\"message\": \"Test $i\"}" &
done
wait
```

**Check:**
- All guests created successfully
- No database locks
- Performance acceptable

---

## 🎯 Next Steps After Testing

1. **Add UI prompts** for low guest credits
2. **Enforce workflow limits** for guests
3. **Add analytics** for guest usage
4. **Create cleanup cron job** for expired guests

