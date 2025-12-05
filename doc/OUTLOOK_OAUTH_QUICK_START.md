# Outlook OAuth - Quick Start Guide

## 🚀 Fast Setup (5 Minutes)

### Step 1: Register App in Azure Portal (2 min)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Search for **"Microsoft Entra ID"** or **"Azure Active Directory"**
3. Click **"App registrations"** → **"+ New registration"**
4. Fill in:
   - **Name**: `UAOL`
   - **Account types**: **"Accounts in any organizational directory and personal Microsoft accounts"**
   - **Redirect URI**: `http://localhost:3000/auth/outlook/callback` (Platform: Web)
5. Click **"Register"**
6. Copy the **Application (client) ID** - this is your `OUTLOOK_CLIENT_ID`

### Step 2: Create Client Secret (1 min)

1. In your app, go to **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. Add description, choose expiration, click **"Add"**
4. **Copy the Value immediately** - this is your `OUTLOOK_CLIENT_SECRET`

### Step 3: Add API Permissions (1 min)

1. Go to **"API permissions"**
2. Click **"+ Add a permission"** → **"Microsoft Graph"** → **"Delegated permissions"**
3. Add these:
   - `Mail.Read`
   - `Mail.Send`
   - `Calendars.Read`
   - `Calendars.ReadWrite`
   - `Files.Read`

### Step 4: Add to .env (1 min)

Add to `backend/.env`:

```env
OUTLOOK_CLIENT_ID=paste-your-client-id-here
OUTLOOK_CLIENT_SECRET=paste-your-client-secret-here
OUTLOOK_REDIRECT_URI=http://localhost:3000/auth/outlook/callback
OUTLOOK_TENANT=common
```

### Step 5: Restart & Test

1. Restart your backend: `cd backend && npm run dev`
2. Go to login page
3. Click "Sign in with Microsoft" or "Sign in with Outlook"
4. Sign in and authorize
5. Done! ✅

## 📋 Required Values

- **OUTLOOK_CLIENT_ID**: From Azure Portal → App registration → Overview → Application (client) ID
- **OUTLOOK_CLIENT_SECRET**: From Azure Portal → App registration → Certificates & secrets → Value
- **OUTLOOK_REDIRECT_URI**: `http://localhost:3000/auth/outlook/callback` (must match Azure Portal)
- **OUTLOOK_TENANT**: `common` (allows both personal and work accounts)

## 🐛 Common Issues

### Redirect URI Mismatch
- **Error**: "AADSTS50011: The redirect URI specified in the request does not match"
- **Fix**: Make sure redirect URI in Azure Portal matches exactly (check http/https, port, path)

### Invalid Client Secret
- **Error**: "AADSTS7000215: Invalid client secret"
- **Fix**: Create a new client secret and update `OUTLOOK_CLIENT_SECRET` in `.env`

### Missing Permissions
- **Error**: Consent screen shows errors
- **Fix**: Make sure you added all required API permissions in Azure Portal

## 📚 Full Documentation

For detailed setup instructions, troubleshooting, and production deployment, see:
- **[OUTLOOK_OAUTH_SETUP.md](OUTLOOK_OAUTH_SETUP.md)** - Complete setup guide
- **[OAUTH_SETUP_GUIDE.md](OAUTH_SETUP_GUIDE.md)** - General OAuth guide

## ✅ Checklist

- [ ] App registered in Azure Portal
- [ ] Client ID copied
- [ ] Client secret created and copied
- [ ] API permissions added
- [ ] Redirect URI configured
- [ ] Environment variables added to `.env`
- [ ] Backend restarted
- [ ] Tested login flow

Ready to go! 🎉
