# Guest Mode Implementation Plan

## 🎯 Goal
Allow users to use UAOL without registration, with generous free tier limits.

## 📊 Free Tier Limits

### Guest Users (No Registration)
- **Credits**: 1,000 per session
- **Chat Messages**: Unlimited (rate limited: 20/min)
- **Workflows**: 10 per session
- **Tool Calls**: 100 per session
- **Storage**: Session only (cleared on browser close)
- **API Access**: None
- **Job History**: None (session only)

### Free Tier (Registered)
- **Credits**: 10,000 per month (resets monthly)
- **Chat Messages**: Unlimited
- **Workflows**: Unlimited
- **Tool Calls**: 1,000 per month
- **Storage**: 1 GB
- **API Access**: Yes (with API key)
- **Job History**: Last 100 jobs

---

## 🏗️ Implementation Steps

### Step 1: Create Optional Authentication Middleware

**File**: `backend/shared/auth/optional-authenticate.ts`

```typescript
// Creates guest user if no token provided
// Attaches user (real or guest) to req.user
```

**Behavior**:
- If token provided → authenticate normally
- If no token → create/get guest user
- Guest users have `is_guest: true` flag
- Guest users get temporary ID (UUID)

### Step 2: Update Database Schema

**Add to `users` table**:
- `is_guest BOOLEAN DEFAULT false`
- `session_id TEXT` (for guest users)
- `expires_at TIMESTAMP` (for guest cleanup)

**Migration**: `backend/shared/database/migrations/add-guest-support.sql`

### Step 3: Update Services to Use Optional Auth

**Services to Update**:
1. **API Gateway** (`/chat` endpoint)
   - Already works without auth ✅
   - Add guest user creation
   - Track guest usage

2. **Job Orchestration Service**
   - Make auth optional
   - Create guest user if needed
   - Apply guest limits

3. **Tool Registry Service**
   - Public tools: no auth needed
   - Private tools: auth required

4. **Tool Proxy Service**
   - Optional auth for public tools
   - Required auth for private tools

### Step 4: Guest User Model

**File**: `backend/shared/database/models/guest-user.ts`

**Features**:
- Auto-create guest on first request
- Store in database (for credit tracking)
- Cleanup expired guests (cron job)
- Session-based (tied to browser session)

### Step 5: Rate Limiting for Guests

**File**: `backend/shared/middleware/guest-rate-limiter.ts`

**Limits**:
- Chat: 20 messages/minute
- Workflows: 10 per session
- Tool calls: 100 per session
- API calls: 100/minute

### Step 6: Frontend Guest Mode

**Features**:
- Detect guest vs authenticated
- Show "Sign up to save" prompts
- Store guest session ID
- Upgrade flow (guest → registered)

---

## 🔧 Technical Implementation

### Backend Changes

#### 1. Optional Authentication Middleware

```typescript
// backend/shared/auth/optional-authenticate.ts
export async function optionalAuthenticate(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      // Normal authentication
      const payload = verifyToken(token);
      const user = await userModel.findById(payload.userId);
      (req as any).user = user;
      return next();
    }
    
    // No token - create/get guest user
    const guestId = req.headers['x-guest-id'] || generateGuestId();
    let guest = await userModel.findGuestById(guestId);
    
    if (!guest) {
      guest = await userModel.createGuest(guestId);
    }
    
    (req as any).user = guest;
    (req as any).isGuest = true;
    next();
  } catch (error) {
    next(error);
  }
}
```

#### 2. Guest User Creation

```typescript
// In UserModel
async createGuest(sessionId: string) {
  const guestId = uuidv4();
  const apiKey = `guest_${guestId}`;
  
  await this.pool.query(`
    INSERT INTO users (user_id, email, api_key, is_guest, session_id, current_credits)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    guestId,
    `guest_${sessionId}@uaol.guest`,
    apiKey,
    true,
    sessionId,
    1000 // Free credits
  ]);
  
  return this.findById(guestId);
}
```

#### 3. Update Routes

```typescript
// Before: jobRoutes.use(authenticate);
// After: jobRoutes.use(optionalAuthenticate);

// Then in controllers, check:
if ((req as any).isGuest) {
  // Apply guest limits
  if (guestWorkflowCount >= 10) {
    throw new Error('Guest limit: 10 workflows per session');
  }
}
```

### Frontend Changes

#### 1. Guest Session Management

```typescript
// src/lib/guest-session.ts
export function getGuestId(): string {
  let guestId = localStorage.getItem('uaol_guest_id');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('uaol_guest_id', guestId);
  }
  return guestId;
}

export function isGuest(): boolean {
  return !localStorage.getItem('uaol_auth_token');
}
```

#### 2. API Client Update

```typescript
// src/lib/api/client.ts
private getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = this.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Guest mode
    headers['X-Guest-Id'] = getGuestId();
  }
  
  return headers;
}
```

#### 3. UI Prompts

```typescript
// Show "Sign up to save" banner for guests
{isGuest() && (
  <Banner>
    You're using guest mode. 
    <Link to="/register">Sign up</Link> to save your work and get more credits!
  </Banner>
)}
```

---

## 📋 Implementation Checklist

### Backend
- [ ] Create `optional-authenticate.ts` middleware
- [ ] Add `is_guest` column to users table
- [ ] Create guest user model methods
- [ ] Update API Gateway to use optional auth
- [ ] Update Job Orchestration to use optional auth
- [ ] Add guest rate limiting
- [ ] Add guest cleanup cron job
- [ ] Update credit checking for guests

### Frontend
- [ ] Create guest session management
- [ ] Update API client for guest mode
- [ ] Add "Sign up" prompts
- [ ] Show guest status in UI
- [ ] Handle guest → registered upgrade

### Testing
- [ ] Test guest chat functionality
- [ ] Test guest workflow creation
- [ ] Test guest limits enforcement
- [ ] Test guest → registered upgrade
- [ ] Test rate limiting

---

## 🚀 Deployment Order

1. **Week 1**: Backend guest mode
   - Optional auth middleware
   - Guest user creation
   - Database migration

2. **Week 2**: Service updates
   - Update all services to use optional auth
   - Add guest limits
   - Rate limiting

3. **Week 3**: Frontend integration
   - Guest session management
   - UI updates
   - Upgrade flow

4. **Week 4**: Testing & polish
   - End-to-end testing
   - Performance optimization
   - Documentation

---

## 💡 Benefits

1. **Lower Barrier to Entry**: Users can try without signing up
2. **Faster MVP**: No OAuth complexity
3. **Better UX**: Immediate access
4. **Conversion**: "Sign up to save" prompts drive registration
5. **Testing**: Easy to test without auth setup

---

## ⚠️ Considerations

1. **Guest Cleanup**: Need cron job to delete old guest users
2. **Credit Abuse**: Rate limiting prevents abuse
3. **Session Management**: Guest IDs stored in localStorage
4. **Upgrade Flow**: Smooth transition from guest to registered

---

## 🎯 Success Metrics

- Guest signup conversion rate
- Guest session duration
- Guest → registered upgrade rate
- Guest feature usage
- Rate limit hit frequency

