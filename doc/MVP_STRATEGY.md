# MVP Strategy: Guest Mode + Free Tier

## 🎯 Core Question: Do We Need OAuth for MVP?

**Answer: NO** - OAuth is NOT required for a functional MVP.

## ✅ What We Need for MVP

### 1. Guest Mode (No Authentication Required)
**Purpose**: Allow users to try the platform without signing up

**Features Available to Guests**:
- ✅ Chat with AI (OpenAI integration)
- ✅ Create and execute simple workflows
- ✅ Use public/approved tools
- ⚠️ Limited credits (generous free tier)
- ⚠️ No persistent storage (sessions only)
- ⚠️ No API key access

**Implementation**:
- Create temporary guest user on first request
- Store in session/localStorage
- Auto-generate guest ID
- Generous free credit allocation (e.g., 1000 credits)

### 2. Free Tier (After Registration)
**Purpose**: Registered users get more features

**Features**:
- ✅ All guest features
- ✅ Persistent account
- ✅ API key for programmatic access
- ✅ Job history
- ✅ More credits (e.g., 10,000 credits)
- ✅ Save workflows
- ✅ Connect OAuth accounts (later)

### 3. Core Functionality (Works Without OAuth)
**What Works Now**:
- ✅ Chat with AI (OpenAI)
- ✅ Create workflows
- ✅ Execute workflows
- ✅ Register/use MCP tools
- ✅ Job orchestration

**What Requires OAuth (Deferred)**:
- ⏸️ Access user's Google Drive files
- ⏸️ Read user's Outlook calendar
- ⏸️ Access user's iCloud data

**Conclusion**: OAuth is for **enhanced features**, not core functionality.

---

## 🏗️ MVP Architecture

### Guest User Flow
```
User visits site → No auth required
  ↓
Guest session created (temporary ID)
  ↓
1000 free credits allocated
  ↓
Can use chat, workflows, tools
  ↓
Prompted to register for persistence
```

### Registered User Flow
```
User registers → Email + API key
  ↓
10,000 free credits
  ↓
All guest features + persistence
  ↓
Can connect OAuth later (optional)
```

---

## 📋 MVP Feature Set

### Phase 1: Guest Mode (Week 1)
- [ ] Guest session management
- [ ] Temporary user creation
- [ ] Free credit allocation for guests
- [ ] Rate limiting for guests
- [ ] "Sign up to save" prompts

### Phase 2: Core Features (Week 2-3)
- [ ] Chat with AI ✅ (Already working)
- [ ] Workflow creation UI
- [ ] Tool registry UI
- [ ] Job execution and monitoring
- [ ] Basic dashboard

### Phase 3: Registration (Week 3)
- [ ] Email registration
- [ ] Account persistence
- [ ] API key generation
- [ ] Enhanced free tier

### Phase 4: OAuth (Later - Not for MVP)
- [ ] OAuth authentication
- [ ] OAuth data access
- [ ] Drive/Calendar integration

---

## 🎁 Free Tier Limits

### Guest Users
- **Credits**: 1,000 per session
- **Chat Messages**: Unlimited (with rate limiting)
- **Workflows**: 10 per session
- **Tool Calls**: 100 per session
- **Storage**: Session only (cleared on close)
- **API Access**: None

### Free Tier (Registered)
- **Credits**: 10,000 per month
- **Chat Messages**: Unlimited
- **Workflows**: Unlimited
- **Tool Calls**: 1,000 per month
- **Storage**: 1 GB
- **API Access**: Yes (with API key)
- **Job History**: Last 100 jobs

---

## 🔧 Implementation Plan

### Step 1: Guest Mode Backend (2-3 hours)
1. Create guest user model (temporary, no email)
2. Auto-create guest on first request
3. Store guest ID in session/cookie
4. Allocate free credits
5. Make authentication optional for chat/workflows

### Step 2: Update Services (3-4 hours)
1. Make `authenticate` middleware optional
2. Create guest user if no auth token
3. Apply rate limits to guests
4. Track guest usage

### Step 3: Frontend Guest Mode (2-3 hours)
1. Detect guest vs authenticated
2. Show "Sign up" prompts
3. Handle guest session
4. Upgrade flow (guest → registered)

---

## 🚀 MVP Launch Checklist

### Must Have (MVP)
- [x] Chat with AI
- [ ] Guest mode
- [ ] Workflow creation
- [ ] Tool registry
- [ ] Job execution
- [ ] Basic dashboard

### Nice to Have (Post-MVP)
- [ ] OAuth authentication
- [ ] OAuth data access
- [ ] Advanced analytics
- [ ] Team collaboration

### Deferred
- [ ] OAuth for data access (Drive, Calendar, etc.)
- [ ] Enterprise features
- [ ] Advanced billing

---

## 💡 Recommendation

**For MVP**: 
1. ✅ Implement guest mode (no OAuth needed)
2. ✅ Email registration (simple, works now)
3. ✅ Core features (chat, workflows, tools)
4. ⏸️ Defer OAuth entirely

**OAuth Can Wait Because**:
- Users can still use all core features
- OAuth is for accessing THEIR data (enhancement)
- Can add OAuth later without breaking changes
- Simpler MVP = faster to market

---

## 🎯 Next Steps

1. **Implement guest mode** (highest priority)
2. **Make auth optional** for core endpoints
3. **Add free tier limits**
4. **Build core features** (workflows, tools)
5. **Add OAuth later** (when users request it)

**OAuth is NOT blocking MVP launch!**

