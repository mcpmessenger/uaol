# Environment Variables Guide

## Required vs Optional Variables

### ✅ **REQUIRED** (Must be set for basic functionality)

#### 1. DATABASE_URL
**Status**: You've set this! ✓

**What it does**: Connects your backend to CockroachDB (or Supabase/PostgreSQL)

**Example**:
```env
DATABASE_URL=postgresql://[username]:[password]@[host]:26257/[database]?sslmode=require&sslrootcert=%APPDATA%\postgresql\root.crt
```

#### 2. JWT_SECRET
**Status**: ⚠️ **IMPORTANT - Change this!**

**What it does**: Used to sign and verify JWT authentication tokens

**Current default**: `your-super-secret-jwt-key-change-in-production` (NOT SECURE!)

**How to set**:
```env
JWT_SECRET=your-actual-secure-random-string-here-minimum-32-characters
```

**Generate a secure one**:
```powershell
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Or use an online generator: https://www.random.org/strings/

---

### ⚠️ **OPTIONAL** (Only needed for specific features)

#### 3. OPENAI_API_KEY
**Status**: Only needed if you want AI chat functionality

**What it does**: Enables the AI chat features in your application

**How to get**:
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `.env`:
   ```env
   OPENAI_API_KEY=sk-...
   ```

**Note**: Without this, AI chat features won't work, but the rest of the app will.

---

#### 4. OAuth Variables (Google OAuth)
**Status**: Only needed if you want Google login

**What they do**: Enable "Sign in with Google" functionality

**Variables needed**:
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**How to get**:
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
4. Copy Client ID and Client Secret

**Important**: OAuth is **NOT** with Supabase - it's direct Google OAuth. Supabase is only mentioned as a database option, not for authentication.

---

#### 5. Stripe Variables (Billing)
**Status**: Only needed for payment processing

**Variables**:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

#### 6. AWS Variables (File Storage)
**Status**: Only needed if using S3 for file storage

**Variables**:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=uaol-storage
```

---

#### 7. Redis Variables
**Status**: Optional - defaults to localhost

**Default**:
```env
REDIS_URL=redis://localhost:6379
```

Only change if using a remote Redis instance.

---

## Quick Setup Checklist

### Minimum Setup (Just Database)
```env
DATABASE_URL=postgresql://[your-cockroachdb-connection-string]
JWT_SECRET=[generate-a-secure-random-string]
```

### With AI Chat
```env
DATABASE_URL=postgresql://[your-cockroachdb-connection-string]
JWT_SECRET=[generate-a-secure-random-string]
OPENAI_API_KEY=sk-...
```

### With Google OAuth
```env
DATABASE_URL=postgresql://[your-cockroachdb-connection-string]
JWT_SECRET=[generate-a-secure-random-string]
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

---

## OAuth Clarification

### ❌ OAuth is NOT with Supabase

**Important**: OAuth (Google login) is **NOT** using Supabase Auth. It's direct Google OAuth integration.

**What Supabase is used for**:
- ✅ Database (PostgreSQL) - alternative to CockroachDB
- ❌ NOT for authentication/OAuth

**What OAuth uses**:
- ✅ Direct Google OAuth 2.0
- ✅ Your own Google Cloud Console credentials
- ✅ Stored in your `backend/.env` file

**Why the confusion?**:
- Supabase is mentioned as a database option
- But OAuth is completely separate - it's direct Google OAuth
- No Supabase Auth involved

---

## Checking What's Set

You can check which variables are set by looking at your `backend/.env` file:

```powershell
cd backend
Get-Content .env | Select-String -Pattern "=" | Where-Object { $_.Line -notmatch "^#" -and $_.Line -notmatch "^$" }
```

Or manually check:
- ✅ `DATABASE_URL` - Should be set to your CockroachDB connection string
- ⚠️ `JWT_SECRET` - Should be changed from default
- ⚠️ `OPENAI_API_KEY` - Optional, only if you want AI chat
- ⚠️ `GOOGLE_CLIENT_ID` - Optional, only if you want Google login
- ⚠️ `GOOGLE_CLIENT_SECRET` - Optional, only if you want Google login

---

## Most Likely Missing Variable

Based on your question, you're probably missing:

1. **JWT_SECRET** - Should be changed from the default
2. **OPENAI_API_KEY** - If you want AI chat features

---

## Next Steps

1. **Generate a secure JWT_SECRET**:
   ```powershell
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
   ```
   Copy the output and add to `backend/.env`:
   ```env
   JWT_SECRET=<paste-generated-string>
   ```

2. **If you want AI chat**, get an OpenAI API key and add it

3. **If you want Google login**, set up Google OAuth credentials

4. **Everything else is optional** and can be added later as needed
