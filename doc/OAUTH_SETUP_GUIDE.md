# OAuth Setup Guide

This guide explains how to set up OAuth authentication for Google, Outlook, and iCloud.

## Overview

The login screen now supports:
- **Google OAuth**: Access to Gmail, Calendar, Drive
- **Microsoft Outlook OAuth**: Access to Outlook email, Calendar, OneDrive
- **iCloud OAuth**: Access to iCloud Mail, Calendar, Drive
- **Email Login**: Simple email-based login (no password required for MVP)

## Backend Configuration

Add these environment variables to your `backend/.env` file:

### Google OAuth

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**Setup Steps (IN ORDER):**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. **Enable the required APIs** (do this FIRST - scopes won't work without it!):
   - Go to **"APIs & Services"** → **"Library"**
   - Search for and enable each of these APIs:
     - **Gmail API** (for email access)
     - **Google Calendar API** (for calendar access)
     - **Google Drive API** (for Drive file access)
   - Wait a few minutes for APIs to fully enable before proceeding

4. **Configure OAuth Consent Screen** (do this BEFORE creating credentials):
   - Go to **"APIs & Services"** → **"OAuth consent screen"**
   - See detailed instructions in the "Configuring Scopes" section below

5. **Create OAuth Credentials**:
   - Go to **"Credentials"** → **"Create Credentials"** → **"OAuth 2.0 Client ID"**
   - Application type: Web application
   - **Authorized JavaScript origins** (for browser requests):
     - Add: `http://localhost:3000` (base URL only, no path!)
     - Add: `http://localhost:8080` (if your frontend runs on 8080)
   - **Authorized redirect URIs** (for server callbacks):
     - Add: `http://localhost:3000/auth/google/callback`
   - Copy Client ID and Client Secret to your `.env` file

**Important:** 
- **Authorized JavaScript origins** must be the base URL only (e.g., `http://localhost:3000`) - no paths allowed!
- **Authorized redirect URIs** can include the full path (e.g., `http://localhost:3000/auth/google/callback`)

**Scopes Requested:**
- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/drive.readonly`

**Configuring Scopes in OAuth Consent Screen:**

⚠️ **CRITICAL:** You MUST enable the APIs (step 3) BEFORE configuring scopes! The scopes won't appear in the picker until the APIs are enabled.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Your Project
2. Navigate to **"APIs & Services"** → **"OAuth consent screen"**
3. Fill in the required app information:
   - User Type: Choose "External" (for testing) or "Internal" (for Google Workspace)
   - App name: "UAOL" (or your app name)
   - User support email: Your email
   - Developer contact: Your email
4. Click **"Save and Continue"** through the scopes section (you'll add scopes next)
5. On the **"Scopes"** page, click **"ADD OR REMOVE SCOPES"**
6. **DO NOT use the "Manually add scopes" text box** - use the scope picker instead!
7. In the filter/search box at the top, search for each scope and check the boxes:
   - Search for `userinfo.email` → Select `.../auth/userinfo.email` (this covers `email` and `openid`)
   - Search for `userinfo.profile` → Select `.../auth/userinfo.profile` (this covers `profile`)
   - Search for `gmail.readonly` → Select `.../auth/gmail.readonly` (appears after Gmail API is enabled)
   - Search for `gmail.send` → Select `.../auth/gmail.send` (appears after Gmail API is enabled)
   - Search for `calendar.readonly` → Select `.../auth/calendar.readonly` (appears after Calendar API is enabled)
   - Search for `calendar.events` → Select `.../auth/calendar.events` (appears after Calendar API is enabled)
   - Search for `drive.readonly` → Select `.../auth/drive.readonly` (appears after Drive API is enabled)
8. Click **"UPDATE"** to save the scopes
9. On the **"Test users"** page (step 3):
   - Click **"+ ADD USERS"**
   - Add your Google email address (e.g., `your-email@gmail.com`)
   - You can add multiple test users if needed
   - Click **"ADD"** to save
   - **Important:** Only users listed here can sign in while your app is in testing mode
10. Continue through the remaining steps (Summary) and click **"BACK TO DASHBOARD"**

**Troubleshooting Scope Issues:**
- ❌ **If scopes show as "invalid"**: You haven't enabled the required APIs yet. Go back to step 3 and enable Gmail API, Calendar API, and Drive API first.
- ❌ **If you see "Manually add scopes" errors**: Don't use that text box! Use the scope picker table above it instead.
- ❌ **If scopes don't appear in the picker**: Make sure the APIs are enabled and wait a few minutes for them to propagate.

**Important Notes:** 
- These scopes are **already configured in your code** at `backend/shared/config/index.ts` (lines 59-68)
- The OAuth consent screen configuration is what **Google displays** to users when they authorize your app
- **While your app is in testing mode**, ONLY users you add in the "Test users" section can sign in
- If you see "Access blocked: UAOL has not completed the Google verification process", you need to add your email as a test user (see step 9 above)
- The scope picker uses different names (e.g., `userinfo.email` instead of just `email`) - that's normal and correct

**Common Error: "Access blocked: UAOL has not completed the Google verification process"**
- **Cause:** Your app is in testing mode and you (or the user trying to sign in) is not listed as a test user
- **Fix:** Go to Google Cloud Console → APIs & Services → OAuth consent screen → Test users → Add your email address

## Database Setup

**⚠️ IMPORTANT: Before using OAuth, you must create the database table!**

The OAuth tokens are stored in the `user_oauth_tokens` table. This table is created by running the database migration:

```powershell
cd backend
npm run migrate
```

This will create the `user_oauth_tokens` table along with all other required tables.

**Common Error: `relation "user_oauth_tokens" does not exist`**
- **Cause:** The database migration hasn't been run yet
- **Fix:** Run `cd backend && npm run migrate` to create all required database tables

### Microsoft Outlook OAuth

```env
OUTLOOK_CLIENT_ID=your-outlook-client-id
OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
OUTLOOK_REDIRECT_URI=http://localhost:3000/auth/outlook/callback
OUTLOOK_TENANT=common
```

**📖 For detailed setup instructions, see [OUTLOOK_OAUTH_SETUP.md](OUTLOOK_OAUTH_SETUP.md)**

**Quick Setup Steps:**

1. **Create App Registration in Azure Portal:**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Navigate to **"Microsoft Entra ID"** (or "Azure Active Directory") → **"App registrations"**
   - Click **"+ New registration"**
   - Name: "UAOL"
   - Supported account types: **"Accounts in any organizational directory and personal Microsoft accounts"**
   - Redirect URI: `http://localhost:3000/auth/outlook/callback` (Web platform)
   - Click **"Register"**

2. **Create Client Secret:**
   - In your app registration, go to **"Certificates & secrets"**
   - Click **"+ New client secret"**
   - Add description and expiration
   - **IMPORTANT**: Copy the **Value** immediately - you won't see it again!
   - This is your `OUTLOOK_CLIENT_SECRET`

3. **Configure API Permissions:**
   - Go to **"API permissions"**
   - Click **"+ Add a permission"** → **"Microsoft Graph"** → **"Delegated permissions"**
   - Add these permissions:
     - ✅ `Mail.Read` - Read user's mail
     - ✅ `Mail.Send` - Send mail as the user
     - ✅ `Calendars.Read` - Read user's calendars
     - ✅ `Calendars.ReadWrite` - Have full access to user's calendars
     - ✅ `Files.Read` - Read user's OneDrive files
     - ✅ `User.Read` - Read user's profile (usually already included)
   - Basic permissions (`openid`, `email`, `profile`, `offline_access`) are automatically included

4. **Get Your Credentials:**
   - **Client ID**: App registration → Overview → Application (client) ID
   - **Client Secret**: The value you copied from Certificates & secrets
   - **Tenant**: Use `common` for both personal and work accounts

5. **Add to `.env`:**
   ```env
   OUTLOOK_CLIENT_ID=your-client-id-here
   OUTLOOK_CLIENT_SECRET=your-client-secret-here
   OUTLOOK_REDIRECT_URI=http://localhost:3000/auth/outlook/callback
   OUTLOOK_TENANT=common
   ```

**Scopes Requested (configured in code):**
- `openid`, `email`, `profile`, `offline_access`
- `https://graph.microsoft.com/Mail.Read`
- `https://graph.microsoft.com/Mail.Send`
- `https://graph.microsoft.com/Calendars.Read`
- `https://graph.microsoft.com/Calendars.ReadWrite`
- `https://graph.microsoft.com/Files.Read`

**Common Issues:**
- ❌ **Redirect URI mismatch**: Make sure redirect URI in Azure Portal matches exactly (including http/https, port, path)
- ❌ **Invalid client secret**: Client secret may have expired - create a new one
- ❌ **Consent required**: User needs to grant permissions on first login

### iCloud OAuth (Sign in with Apple)

⚠️ **IMPORTANT**: Sign in with Apple is for **authentication only**. It does NOT provide access to iCloud services (mail, calendar, drive).

**📖 For detailed setup instructions, see [ICLOUD_OAUTH_SETUP.md](ICLOUD_OAUTH_SETUP.md)**

```env
ICLOUD_CLIENT_ID=your-apple-service-id
ICLOUD_CLIENT_SECRET=your-generated-jwt-token
ICLOUD_REDIRECT_URI=http://localhost:3000/auth/icloud/callback
ICLOUD_TEAM_ID=your-apple-team-id
ICLOUD_KEY_ID=your-apple-key-id
```

**Quick Setup Steps:**

1. **Create App ID** in Apple Developer Portal:
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - Navigate to "Certificates, Identifiers & Profiles" → "Identifiers"
   - Create new App ID (e.g., `com.uaol.app`)
   - Enable "Sign in with Apple"

2. **Create Service ID**:
   - Create new Services ID (e.g., `com.uaol.service`)
   - Configure "Sign in with Apple"
   - Add redirect URL: `http://localhost:3000/auth/icloud/callback`
   - This Service ID is your `ICLOUD_CLIENT_ID`

3. **Create Key**:
   - Create a Key for "Sign in with Apple"
   - Download the `.p8` file (you can only download once!)
   - Copy the Key ID - this is your `ICLOUD_KEY_ID`

4. **Get Team ID**:
   - Go to "Membership" in Apple Developer Portal
   - Copy your Team ID - this is your `ICLOUD_TEAM_ID`

5. **Generate JWT Client Secret**:
   - You need to generate a JWT token as the client secret
   - See `ICLOUD_OAUTH_SETUP.md` for JWT generation script
   - JWT expires after 6 months - you'll need to regenerate it

6. **Add to `.env`**:
   ```env
   ICLOUD_CLIENT_ID=com.uaol.service
   ICLOUD_CLIENT_SECRET=your-generated-jwt-token
   ICLOUD_REDIRECT_URI=http://localhost:3000/auth/icloud/callback
   ICLOUD_TEAM_ID=your-team-id
   ICLOUD_KEY_ID=your-key-id
   ```

**Scopes Supported (configured in code):**
- `openid` - Sign in
- `email` - Email address (only provided on first authorization)
- `name` - User name (only provided on first authorization)

⚠️ **Note**: The scopes like `https://www.icloud.com/mail` do NOT work with Sign in with Apple. Sign in with Apple only provides authentication, not access to iCloud services.

**Common Issues:**
- ❌ **Apple Developer Account Required**: $99/year subscription needed
- ❌ **JWT Expires**: Client secret (JWT) expires after 6 months - regenerate before expiration
- ❌ **Email Missing**: Apple only provides email on first authorization - store it for subsequent logins
- ❌ **No iCloud Service Access**: Sign in with Apple doesn't provide access to mail, calendar, or drive

See `ICLOUD_OAUTH_SETUP.md` for detailed troubleshooting and setup.

## Frontend Configuration

Add to your frontend `.env` or `vite.config.ts`:

```env
VITE_API_URL=http://localhost:3000
```

## How It Works

1. **User clicks OAuth button** → Redirects to provider's OAuth page
2. **User authorizes** → Provider redirects back with authorization code
3. **Backend exchanges code for tokens** → Gets access token, refresh token, user info
4. **Backend stores tokens** → Encrypted in database with user association
5. **Backend creates/updates user** → Creates user account if needed
6. **Backend generates JWT** → Returns JWT token to frontend
7. **Frontend stores JWT** → User is logged in and redirected to app

## Testing

1. **First, run database migrations:**
   ```powershell
   cd backend
   npm run migrate
   ```

2. Start the backend: `cd backend && npm run dev`
3. Start the frontend: `npm run dev`
4. Navigate to `http://localhost:8080/login`
5. Click an OAuth provider button
6. Complete the OAuth flow
7. You should be redirected back and logged in

## Troubleshooting

### "Invalid redirect URI"
- Make sure the redirect URI in your OAuth app settings matches exactly
- Check for trailing slashes, http vs https, localhost vs 127.0.0.1

### "Invalid client secret"
- For Apple: Make sure your JWT client secret is valid and not expired
- For Google/Outlook: Double-check the client secret in your .env

### "Scope not granted"
- Make sure you've requested the scopes in your OAuth app settings
- Some providers require admin approval for certain scopes

### `relation "user_oauth_tokens" does not exist`
- **Cause:** The database migration hasn't been run yet
- **Fix:** Run `cd backend && npm run migrate` to create all required database tables

### Tokens not stored
- Check database connection
- Verify `user_oauth_tokens` table exists (run migrations)
- Check backend logs for errors

### "Access blocked: UAOL has not completed the Google verification process"
- **Cause:** Your app is in testing mode and the user is not listed as a test user
- **Fix:** Go to Google Cloud Console → APIs & Services → OAuth consent screen → Test users → Add the user's email address

## Security Notes

- OAuth tokens are stored encrypted in the database
- Refresh tokens are used to get new access tokens when they expire
- JWT tokens are used for session management
- All OAuth flows use HTTPS in production (required by providers)

## Production Deployment

For production:
1. Update redirect URIs to your production domain
2. Use HTTPS for all OAuth callbacks
3. Store OAuth credentials securely (use environment variables or secrets manager)
4. Enable token refresh logic
5. Implement token revocation on logout
