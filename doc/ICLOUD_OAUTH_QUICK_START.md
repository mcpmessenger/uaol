# Apple Sign In (iCloud) - Quick Start Guide

## ⚠️ Important Limitations

**Sign in with Apple** is primarily for **authentication only**. It does NOT provide access to:
- ❌ iCloud Mail
- ❌ iCloud Calendar
- ❌ iCloud Drive
- ❌ iCloud Notes

It only provides:
- ✅ User identity (email, name)
- ✅ Authentication

To access iCloud services, you'd need CloudKit API or other methods (not standard OAuth).

## 🚀 Fast Setup (Requires Apple Developer Account)

### Prerequisites

- **Apple Developer Account** ($99/year) - Required
- Access to [Apple Developer Portal](https://developer.apple.com/)

### Step 1: Create App ID (5 min)

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **"Certificates, Identifiers & Profiles"** → **"Identifiers"**
3. Click **"+"** → Select **"App IDs"** → **"App"**
4. Fill in:
   - **Description**: `UAOL App`
   - **Bundle ID**: `com.uaol.app` (or your choice)
5. Enable **"Sign in with Apple"**
6. Click **"Continue"** → **"Register"**

### Step 2: Create Service ID (5 min)

1. In **"Identifiers"**, click **"+"** → **"Services IDs"**
2. Fill in:
   - **Description**: `UAOL Service`
   - **Identifier**: `com.uaol.service` (or your choice)
3. Click **"Continue"** → **"Register"**
4. Click on your Service ID → Check **"Sign in with Apple"** → **"Configure"**
5. Set:
   - **Primary App ID**: Select your App ID from Step 1
   - **Return URLs**: `http://localhost:3000/auth/icloud/callback`
6. Click **"Save"** → **"Continue"** → **"Save"**
7. **Copy the Service ID** - this is your `ICLOUD_CLIENT_ID`

### Step 3: Create Key (3 min)

1. In **"Keys"**, click **"+"**
2. **Key Name**: `UAOL Sign in with Apple Key`
3. Check **"Sign in with Apple"** → **"Configure"** → Select your App ID
4. Click **"Register"**
5. **Download the `.p8` file** - you can only download it once!
6. **Copy the Key ID** - this is your `ICLOUD_KEY_ID`

### Step 4: Get Team ID (1 min)

1. Go to **"Membership"** in Apple Developer Portal
2. **Copy your Team ID** - this is your `ICLOUD_TEAM_ID`

### Step 5: Generate JWT Secret

You need to generate a JWT token as the client secret. Create `backend/generate-apple-secret.js`:

```javascript
import jwt from 'jsonwebtoken';
import fs from 'fs';

const teamId = process.env.ICLOUD_TEAM_ID;
const keyId = process.env.ICLOUD_KEY_ID;
const clientId = process.env.ICLOUD_CLIENT_ID;
const keyPath = process.env.ICLOUD_KEY_PATH || 'AuthKey.p8';

const privateKey = fs.readFileSync(keyPath, 'utf8');
const now = Math.floor(Date.now() / 1000);

const clientSecret = jwt.sign(
  {
    iss: teamId,
    iat: now,
    exp: now + 86400 * 180, // 6 months
    aud: 'https://appleid.apple.com',
    sub: clientId,
  },
  privateKey,
  { algorithm: 'ES256', keyid: keyId }
);

console.log('Add this to backend/.env as ICLOUD_CLIENT_SECRET:');
console.log(clientSecret);
```

Run:
```powershell
cd backend
$env:ICLOUD_TEAM_ID="your-team-id"
$env:ICLOUD_KEY_ID="your-key-id"  
$env:ICLOUD_CLIENT_ID="com.uaol.service"
$env:ICLOUD_KEY_PATH="path/to/AuthKey_XXXXX.p8"
node generate-apple-secret.js
```

### Step 6: Add to .env

Add to `backend/.env`:

```env
ICLOUD_CLIENT_ID=com.uaol.service
ICLOUD_CLIENT_SECRET=paste-generated-jwt-here
ICLOUD_REDIRECT_URI=http://localhost:3000/auth/icloud/callback
ICLOUD_TEAM_ID=your-team-id
ICLOUD_KEY_ID=your-key-id
```

### Step 7: Restart & Test

1. Restart backend: `cd backend && npm run dev`
2. Go to login page
3. Click "Sign in with Apple"
4. Sign in and authorize
5. Done! ✅

## 📋 Required Values

- **ICLOUD_CLIENT_ID**: Your Service ID (e.g., `com.uaol.service`)
- **ICLOUD_CLIENT_SECRET**: Generated JWT token (valid for 6 months)
- **ICLOUD_REDIRECT_URI**: Must match Apple Developer Portal
- **ICLOUD_TEAM_ID**: Your Apple Developer Team ID
- **ICLOUD_KEY_ID**: Your Key ID

## ⚠️ Important Notes

1. **JWT Expires**: Client secret (JWT) expires after 6 months - regenerate it before expiration
2. **Email Only on First Login**: Apple only provides email on first authorization
3. **No iCloud Services**: Sign in with Apple doesn't provide access to mail, calendar, or drive
4. **Apple Developer Account Required**: $99/year subscription needed

## 📚 Full Documentation

See `ICLOUD_OAUTH_SETUP.md` for detailed instructions and troubleshooting.

## ✅ Checklist

- [ ] Apple Developer account active
- [ ] App ID created with Sign in with Apple enabled
- [ ] Service ID created and configured
- [ ] Key created and `.p8` file downloaded
- [ ] Team ID copied
- [ ] JWT client secret generated
- [ ] Environment variables added to `.env`
- [ ] Backend restarted
- [ ] Tested login flow

Ready to go! 🎉

