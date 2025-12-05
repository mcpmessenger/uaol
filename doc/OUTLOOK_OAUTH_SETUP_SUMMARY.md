# Outlook OAuth Setup - Complete ✅

## What We've Done

✅ **Updated Backend Code**:
- Added `getOutlookOAuthConfig()` helper function (similar to Google)
- Fixed Outlook OAuth to use direct `process.env` access
- Hardcoded Outlook OAuth scopes to prevent undefined errors
- Enhanced error handling and logging
- Updated OAuth handlers to prioritize environment variables

✅ **Created Documentation**:
- `OUTLOOK_OAUTH_SETUP.md` - Comprehensive setup guide (step-by-step)
- `OUTLOOK_OAUTH_QUICK_START.md` - 5-minute quick setup guide
- Updated `OAUTH_SETUP_GUIDE.md` - Added Outlook quick reference
- Updated `README.md` - Added Outlook OAuth to authentication section

## What You Need to Do

### 1. Set Up Azure App Registration

Follow the **quick start guide**:
- Open `OUTLOOK_OAUTH_QUICK_START.md`
- Follow the 5-minute setup steps
- Get your Client ID and Client Secret from Azure Portal

**Or** for detailed instructions:
- Open `OUTLOOK_OAUTH_SETUP.md`
- Follow the comprehensive step-by-step guide

### 2. Add Environment Variables

Add these to your `backend/.env` file:

```env
OUTLOOK_CLIENT_ID=your-client-id-from-azure
OUTLOOK_CLIENT_SECRET=your-client-secret-from-azure
OUTLOOK_REDIRECT_URI=http://localhost:3000/auth/outlook/callback
OUTLOOK_TENANT=common
```

### 3. Restart Backend

```powershell
cd backend
npm run dev
```

### 4. Test It!

1. Go to your login page
2. Click "Sign in with Microsoft" or "Sign in with Outlook"
3. Sign in with your Microsoft account
4. Authorize the permissions
5. You should be redirected back and logged in! ✅

## Files Changed

### Backend Code
- ✅ `backend/services/auth-service/src/controllers/auth-controller.ts`
  - Added `getOutlookOAuthConfig()` helper
  - Fixed `initiateOutlookOAuth()` to use helper
  - Fixed `handleOutlookCallback()` to use helper
  
- ✅ `backend/services/auth-service/src/controllers/oauth-handlers.ts`
  - Updated `exchangeOutlookCode()` to prioritize `process.env`
  - Enhanced error logging

### Documentation
- ✅ `OUTLOOK_OAUTH_SETUP.md` (new) - Comprehensive guide
- ✅ `OUTLOOK_OAUTH_QUICK_START.md` (new) - Quick setup
- ✅ `OAUTH_SETUP_GUIDE.md` - Updated with Outlook section
- ✅ `README.md` - Updated authentication section

## Key Features

- ✅ Supports both personal and work Microsoft accounts (`tenant=common`)
- ✅ Requests permissions for Mail, Calendar, and OneDrive
- ✅ Stores tokens in database (same `user_oauth_tokens` table)
- ✅ Same error handling improvements as Google OAuth
- ✅ Production-ready (just needs HTTPS for production)

## Scopes Requested

Your app will request these permissions:
- ✅ Basic: `openid`, `email`, `profile`, `offline_access`
- ✅ Mail: `Mail.Read`, `Mail.Send`
- ✅ Calendar: `Calendars.Read`, `Calendars.ReadWrite`
- ✅ Files: `Files.Read` (OneDrive)

## Troubleshooting

### Redirect URI Mismatch
- Make sure redirect URI in Azure Portal matches exactly
- Check for http vs https, port number, and path

### Invalid Client Secret
- Client secrets expire - check expiration date
- Create new secret if expired

### Missing Permissions
- Make sure you added all API permissions in Azure Portal
- User will see consent screen on first login

See `OUTLOOK_OAUTH_SETUP.md` for detailed troubleshooting.

## Next Steps

1. **Set up Azure app registration** (follow quick start guide)
2. **Add credentials to `.env`**
3. **Test the login flow**
4. **Build integrations** using Outlook API (mail, calendar, files)

## Resources

- **Quick Start**: `OUTLOOK_OAUTH_QUICK_START.md` (5 minutes)
- **Full Guide**: `OUTLOOK_OAUTH_SETUP.md` (detailed instructions)
- **General OAuth**: `OAUTH_SETUP_GUIDE.md` (covers both Google and Outlook)

Ready to set up Outlook OAuth! 🚀

