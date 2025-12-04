# Authentication Implementation Plan

## 🎯 Strategy: Email/API Key First, OAuth Later

### Phase 1: Simple Email Authentication (Current)
**Status**: ✅ Backend Ready, ⚠️ Frontend Needed

**Implementation**:
- **Registration**: Email-only (passwordless for MVP)
  - User provides email
  - System auto-generates API key
  - Returns token + API key immediately
- **Login**: Email or API key
  - User can login with email (no password needed for MVP)
  - Or use API key directly
  - Returns JWT token

**Benefits**:
- Simple to implement
- No password management complexity
- API key for programmatic access
- Can add password later if needed

**Backend Endpoints**:
- ✅ `POST /auth/register` - Register with email
- ✅ `POST /auth/login` - Login with email or API key
- ✅ `GET /auth/me` - Get current user
- ✅ `GET /auth/api-key` - Get user's API key
- ✅ `POST /auth/api-key/regenerate` - Regenerate API key

---

### Phase 2: OAuth Integration (Future)
**Status**: ⏸️ Deferred

**Two OAuth Use Cases**:

#### 2A: OAuth for Authentication
**Purpose**: Login with Google/Outlook/iCloud accounts
- Simple authentication flow
- Users can sign in with their existing accounts
- Links OAuth account to UAOL user

#### 2B: OAuth for Data Access ⭐ **IMPORTANT**
**Purpose**: Access user's data from OAuth providers
- **Google**: Drive, Calendar, Gmail, Docs, Sheets
- **Outlook/Microsoft**: OneDrive, Calendar, Email, Teams
- **iCloud**: iCloud Drive, Calendar, Mail, Notes

**Why This Matters**:
- Users can connect their personal/work accounts
- Tools can access user's files, calendars, emails
- Enables powerful integrations:
  - "Analyze my Google Drive documents"
  - "Check my Outlook calendar"
  - "Read my iCloud notes"
  - "Create calendar events from chat"

**Implementation Requirements**:
- Store OAuth tokens per user per provider
- Refresh tokens for long-term access
- Scope management (what permissions to request)
- Token encryption/security
- Revoke access functionality

**Planned Providers**:
- Google OAuth (Drive, Calendar, Gmail, Docs)
- Microsoft/Outlook OAuth (OneDrive, Calendar, Email, Teams)
- Apple/iCloud OAuth (iCloud Drive, Calendar, Mail)

**Backend Routes** (already scaffolded):
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Handle Google callback
- `GET /auth/outlook` - Initiate Outlook OAuth (to be added)
- `GET /auth/outlook/callback` - Handle Outlook callback (to be added)
- `GET /auth/icloud` - Initiate iCloud OAuth (to be added)
- `GET /auth/icloud/callback` - Handle iCloud callback (to be added)

**Data Storage Needed**:
- `user_oauth_tokens` table to store:
  - Provider (google, outlook, icloud)
  - Access token
  - Refresh token
  - Token expiry
  - Scopes granted
  - User ID (foreign key)

---

## 📋 Frontend Implementation Checklist

### Immediate (Phase 1)
- [ ] Create `AuthContext` for global auth state
- [ ] Create `Login.tsx` page
  - Email input
  - Optional API key input
  - "Don't have an account? Register" link
- [ ] Create `Register.tsx` page
  - Email input
  - Show generated API key after registration
  - "Already have an account? Login" link
- [ ] Create `ProtectedRoute` component
- [ ] Update `App.tsx` with routes
- [ ] Add login/logout to Header
- [ ] Store token in localStorage (already in API client)

### Future (Phase 2 - OAuth)
- [ ] Add "Sign in with Google" button
- [ ] Add "Sign in with Microsoft" button
- [ ] Add "Sign in with Apple" button
- [ ] Handle OAuth callbacks
- [ ] Link OAuth accounts to existing accounts

---

## 🔐 Security Considerations

### Current (Email/API Key)
- ✅ JWT tokens for session management
- ✅ API keys for programmatic access
- ⚠️ No password (acceptable for MVP)
- ⚠️ Email verification (optional for MVP)

### Future Enhancements
- Add password support if needed
- Email verification flow
- Two-factor authentication
- Rate limiting on auth endpoints
- API key rotation reminders

---

## 📝 User Flow

### Registration Flow
1. User visits `/register`
2. Enters email
3. Clicks "Register"
4. Backend creates user + generates API key
5. Returns token + API key
6. Frontend stores token, shows API key
7. User redirected to dashboard

### Login Flow
1. User visits `/login`
2. Enters email (or API key)
3. Clicks "Login"
4. Backend validates and returns token
5. Frontend stores token
6. User redirected to dashboard

### OAuth Flow (Future)
1. User clicks "Sign in with Google"
2. Redirected to Google
3. User authorizes
4. Google redirects back with code
5. Backend exchanges code for user info
6. Creates/updates user account
7. Returns token
8. User redirected to dashboard

---

## 🚀 Quick Start

See `QUICK_START_NEXT_STEPS.md` for step-by-step implementation guide.

