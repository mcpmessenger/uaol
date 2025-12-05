# Outlook OAuth Setup Guide

This guide explains how to set up Microsoft Outlook OAuth authentication for UAOL.

## Overview

Outlook OAuth allows users to:
- Sign in with their Microsoft/Outlook account
- Access Outlook email, calendar, and OneDrive files
- Connect their work or personal Microsoft account

## Prerequisites

- Microsoft Azure account (free tier works)
- Access to Azure Portal

## Step 1: Register Your App in Azure Portal

### 1.1 Go to Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account
3. If you don't have an Azure account, you can create a free one

### 1.2 Create App Registration

1. In Azure Portal, search for **"Azure Active Directory"** or go to **"Microsoft Entra ID"**
2. Click on **"App registrations"** in the left sidebar
3. Click **"+ New registration"**

### 1.3 Configure App Registration

Fill in the following details:

- **Name**: `UAOL` (or your app name)
- **Supported account types**: Select **"Accounts in any organizational directory and personal Microsoft accounts"**
  - This allows both personal Microsoft accounts and work/school accounts
- **Redirect URI**:
  - Platform: **Web**
  - Redirect URI: `http://localhost:3000/auth/outlook/callback`
  
4. Click **"Register"**

### 1.4 Save Your Client ID

After registration, you'll be on the app's overview page:
- **Application (client) ID**: Copy this value - this is your `OUTLOOK_CLIENT_ID`
- Save it for later (you'll add it to your `.env` file)

## Step 2: Create Client Secret

1. In your app registration, click **"Certificates & secrets"** in the left sidebar
2. Click **"+ New client secret"**
3. Fill in:
   - **Description**: `UAOL OAuth Secret` (or any description)
   - **Expires**: Choose duration (24 months recommended for development)
4. Click **"Add"**
5. **IMPORTANT**: Copy the **Value** immediately - you won't be able to see it again!
   - This is your `OUTLOOK_CLIENT_SECRET`
   - Save it securely

⚠️ **Security Note**: Client secrets are sensitive. Never commit them to git.

## Step 3: Configure API Permissions

1. In your app registration, click **"API permissions"** in the left sidebar
2. Click **"+ Add a permission"**
3. Select **"Microsoft Graph"**
4. Select **"Delegated permissions"** (for user-based access)

### Required Permissions

Add the following permissions one by one:

#### Basic Permissions (Always Required)
- ✅ `openid` - Sign users in (automatically included)
- ✅ `email` - Read user's email address
- ✅ `profile` - Read user's profile
- ✅ `offline_access` - Maintain access to data (for refresh tokens)

#### Mail Permissions
- ✅ `Mail.Read` - Read user's mail
- ✅ `Mail.Send` - Send mail as the user

#### Calendar Permissions
- ✅ `Calendars.Read` - Read user's calendars
- ✅ `Calendars.ReadWrite` - Have full access to user's calendars

#### Files Permissions
- ✅ `Files.Read` - Read user's OneDrive files

### 4. Grant Admin Consent (Optional)

For testing with personal accounts, you don't need admin consent. However:
- If you're using work/school accounts, an admin may need to grant consent
- Click **"Grant admin consent for [Your Organization]"** if you have admin rights

## Step 4: Configure Redirect URIs

1. In your app registration, click **"Authentication"** in the left sidebar
2. Under **"Redirect URIs"**, make sure you have:
   - `http://localhost:3000/auth/outlook/callback` (for local development)
   - Add your production URL when ready: `https://yourdomain.com/auth/outlook/callback`

3. Under **"Front-channel logout URL"** (optional):
   - You can leave this empty for now

4. Under **"Implicit grant and hybrid flows"**:
   - Keep defaults (usually ID tokens only)

5. Click **"Save"**

## Step 5: Configure Environment Variables

Add these to your `backend/.env` file:

```env
OUTLOOK_CLIENT_ID=your-client-id-from-azure
OUTLOOK_CLIENT_SECRET=your-client-secret-value
OUTLOOK_REDIRECT_URI=http://localhost:3000/auth/outlook/callback
OUTLOOK_TENANT=common
```

### Environment Variable Details

- **OUTLOOK_CLIENT_ID**: The Application (client) ID from Azure Portal
- **OUTLOOK_CLIENT_SECRET**: The client secret value you copied
- **OUTLOOK_REDIRECT_URI**: Should match what you set in Azure Portal
- **OUTLOOK_TENANT**: 
  - `common` - For both personal and work accounts (recommended)
  - `organizations` - For work/school accounts only
  - `consumers` - For personal accounts only
  - Or your specific tenant ID

## Step 6: Verify Setup

### Check Backend Logs

Start your backend:
```bash
cd backend
npm run dev
```

Look for logs showing Outlook OAuth configuration status. You should see:
```
Outlook OAuth configuration loaded
```

### Test OAuth Flow

1. Navigate to your login page
2. Click "Sign in with Microsoft" or "Sign in with Outlook"
3. You should be redirected to Microsoft's login page
4. Sign in with your Microsoft account
5. Authorize the permissions
6. You should be redirected back to your app and logged in

## Troubleshooting

### Error: "AADSTS50011: The redirect URI specified in the request does not match"

**Cause**: The redirect URI in your `.env` doesn't match what's in Azure Portal

**Fix**:
1. Check your `OUTLOOK_REDIRECT_URI` in `backend/.env`
2. Go to Azure Portal → Your App → Authentication
3. Make sure the redirect URI matches exactly (including http/https, port, path)
4. Save in Azure Portal
5. Restart your backend

### Error: "AADSTS7000215: Invalid client secret"

**Cause**: The client secret is incorrect or expired

**Fix**:
1. Go to Azure Portal → Your App → Certificates & secrets
2. Check if your secret has expired
3. Create a new client secret if needed
4. Update `OUTLOOK_CLIENT_SECRET` in your `.env`
5. Restart your backend

### Error: "AADSTS65001: The user or administrator has not consented"

**Cause**: User needs to grant permissions, or admin consent is required

**Fix**:
- For personal accounts: The user will see a consent screen - they need to click "Accept"
- For work accounts: An admin may need to grant consent first

### Error: "Invalid client_id parameter"

**Cause**: The client ID in your `.env` is incorrect

**Fix**:
1. Go to Azure Portal → Your App → Overview
2. Copy the correct Application (client) ID
3. Update `OUTLOOK_CLIENT_ID` in your `.env`
4. Restart your backend

## Scopes Requested

Your app requests these scopes (configured in code):

- `openid` - Sign in
- `email` - Read email address
- `profile` - Read profile
- `offline_access` - Refresh tokens
- `https://graph.microsoft.com/Mail.Read` - Read mail
- `https://graph.microsoft.com/Mail.Send` - Send mail
- `https://graph.microsoft.com/Calendars.Read` - Read calendars
- `https://graph.microsoft.com/Calendars.ReadWrite` - Write calendars
- `https://graph.microsoft.com/Files.Read` - Read OneDrive files

## Security Notes

- ⚠️ Never commit client secrets to git
- ⚠️ Client secrets expire - set reminders to rotate them
- ⚠️ Use HTTPS in production (required by Microsoft)
- ⚠️ Store secrets securely (use environment variables or Azure Key Vault)

## Production Deployment

For production:

1. **Update Redirect URIs**:
   - Add production URL to Azure Portal → Authentication → Redirect URIs
   - Update `OUTLOOK_REDIRECT_URI` in production environment

2. **Use HTTPS**:
   - Microsoft requires HTTPS for production OAuth callbacks
   - Update redirect URI to use `https://`

3. **Review Permissions**:
   - Only request permissions you actually need
   - Consider requesting permissions incrementally

4. **Security**:
   - Store secrets in Azure Key Vault or similar
   - Use managed identities if running on Azure
   - Rotate client secrets regularly

## Next Steps

After setting up Outlook OAuth:

1. Test the login flow
2. Verify tokens are stored in database
3. Implement token refresh logic
4. Add "Connected Accounts" UI
5. Build integrations using Outlook API (mail, calendar, files)

## Resources

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/overview)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)

