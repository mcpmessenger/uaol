# Guest Mode Setup Instructions

## ✅ Implementation Complete

Guest mode has been implemented! Users can now use UAOL without registration.

## 🚀 Setup Steps

### 1. Run Database Migration

The guest mode migration adds support for guest users:

```bash
cd backend
npm run migrate
```

Or manually run the migration:

```bash
# Connect to your database and run:
psql $DATABASE_URL -f shared/database/migrations/add-guest-support.sql
```

This adds:
- `is_guest` column to `users` table
- `session_id` column for guest session tracking
- `expires_at` column for guest expiration (24 hours)
- Indexes for performance

### 2. Rebuild Shared Package

```bash
cd backend
npm run build --workspace=@uaol/shared
```

### 3. Restart Services

```bash
cd backend
npm run dev
```

## 🎯 How It Works

### Guest User Flow

1. **User visits site** → No authentication required
2. **Frontend generates guest ID** → Stored in `localStorage` as `uaol_guest_id`
3. **First API request** → Backend creates guest user with 1,000 credits
4. **Guest user expires** → After 24 hours, new guest user created

### Guest Limits

- **Credits**: 1,000 per session
- **Chat Messages**: Unlimited (rate limited: 20/min)
- **Workflows**: 10 per session (enforcement coming)
- **Tool Calls**: 100 per session (enforcement coming)
- **Storage**: Session only (cleared on browser close)

### Registered User Benefits

- **Credits**: 10,000 per month
- **Persistent account**: Data saved
- **API key**: Programmatic access
- **Job history**: Last 100 jobs
- **No expiration**: Account never expires

## 📋 What's Implemented

### Backend ✅

- [x] Optional authentication middleware
- [x] Guest user creation in database
- [x] Guest user lookup by session ID
- [x] Guest expiration (24 hours)
- [x] API Gateway `/chat` endpoint supports guests
- [x] Job Orchestration supports guests
- [x] Guest limits checking

### Frontend ✅

- [x] Guest session management (`src/lib/guest-session.ts`)
- [x] API client sends guest ID header
- [x] Automatic guest ID generation

### Database ✅

- [x] Migration script created
- [x] Guest user columns added
- [x] Indexes for performance

## 🧪 Testing

### Test Guest Mode

1. **Clear localStorage** (or use incognito)
2. **Visit chat page**
3. **Send a message** → Should work without login
4. **Check network tab** → Should see `X-Guest-Id` header
5. **Check database** → Should see guest user created

### Test Guest Limits

1. **Use up credits** → Should get "Guest credits exhausted" message
2. **Try to create workflow** → Should work (limits enforced in backend)

## 🔧 Configuration

### Guest Limits (Backend)

Edit `backend/shared/middleware/guest-limits.ts`:

```typescript
const GUEST_LIMITS = {
  MAX_WORKFLOWS: 10,
  MAX_TOOL_CALLS: 100,
  INITIAL_CREDITS: 1000,
};
```

### Guest Expiration

Edit `backend/shared/database/models/user.ts`:

```typescript
// In createGuest method, change:
expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours
```

## 🧹 Cleanup

### Clean Expired Guests

Create a cron job to clean up expired guests:

```typescript
// backend/shared/database/models/user.ts
await userModel.cleanupExpiredGuests();
```

Run this daily to remove old guest users.

## 📝 Next Steps

1. **Add "Sign up" prompts** in UI when guest credits low
2. **Add guest workflow limit enforcement** (currently only credits checked)
3. **Add guest tool call limit enforcement**
4. **Create guest cleanup cron job**
5. **Add analytics** for guest → registered conversion

## 🐛 Troubleshooting

### Guest user not created?

- Check database migration ran successfully
- Check `X-Guest-Id` header is being sent from frontend
- Check backend logs for errors

### Guest credits not working?

- Check `current_credits` in database
- Check guest user has `is_guest = true`
- Check credit deduction logic

### Guest expiration issues?

- Check `expires_at` column in database
- Check timezone settings
- Check guest lookup logic

## ✅ Status

**Guest mode is ready to use!** Users can now try UAOL without registration.

