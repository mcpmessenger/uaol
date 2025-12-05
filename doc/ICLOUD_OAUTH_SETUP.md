# iCloud OAuth Setup Guide (Sign in with Apple)

This guide explains how to set up **Sign in with Apple** for UAOL. Note that Apple's OAuth is different from Google/Microsoft - it uses "Sign in with Apple" which is primarily for authentication, not for accessing iCloud services like mail or calendar.

## ⚠️ Important Note

**Sign in with Apple** is primarily an **authentication method**, not a way to access iCloud services (mail, calendar, drive). It provides:
- User identity (email, name)
- Authentication only

Accessing iCloud services like Mail, Calendar, or Drive requires different APIs (CloudKit, IMAP, CalDAV) that are not available through standard OAuth flows.

## Prerequisites

- **Apple Developer Account** ($99/year) - Required
- Access to [Apple Developer Portal](https://developer.apple.com/)

## Step 1: Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Sign in with your Apple Developer account
3. Navigate to **"Certificates, Identifiers & Profiles"**
4. Click **"Identifiers"** in the left sidebar
5. Click **"+"** (plus button) to create a new identifier
6. Select **"App IDs"** → Click **"Continue"**
7. Select **"App"** → Click **"Continue"**
8. Fill in:
   - **Description**: `UAOL App` (or any description)
   - **Bundle ID**: `com.uaol.app` (or your chosen bundle ID, e.g., `com.yourcompany.uaol`)
9. Scroll down and **enable "Sign in with Apple"**
10. Click **"Continue"** → **"Register"**

## Step 2: Create Service ID

1. In **"Identifiers"**, click **"+"** again
2. Select **"Services IDs"** → Click **"Continue"**
3. Fill in:
   - **Description**: `UAOL Service`
   - **Identifier**: `com.uaol.service` (or your chosen service ID)
4. Click **"Continue"** → **"Register"**
5. After creation, click on your Service ID to configure it
6. Check **"Sign in with Apple"**
7. Click **"Configure"**
8. In the configuration:
   - **Primary App ID**: Select the App ID you created in Step 1
   - **Domains and Subdomains**: Add your domain (for production) or leave empty for localhost
   - **Return URLs**: Add `http://localhost:3000/auth/icloud/callback` (for development)
     - For production: `https://yourdomain.com/auth/icloud/callback`
9. Click **"Save"** → **"Continue"** → **"Save"**

## Step 3: Create Key for Sign in with Apple

1. In **"Certificates, Identifiers & Profiles"**, click **"Keys"** in the left sidebar
2. Click **"+"** (plus button)
3. Fill in:
   - **Key Name**: `UAOL Sign in with Apple Key`
4. Check **"Sign in with Apple"**
5. Click **"Configure"**
   - **Primary App ID**: Select your App ID from Step 1
6. Click **"Save"** → **"Continue"** → **"Register"**
7. **IMPORTANT**: Download the `.p8` key file - you can only download it once!
   - Save it securely (e.g., `AuthKey_XXXXXXXXXX.p8`)
8. Copy the **Key ID** - this is your `ICLOUD_KEY_ID`

## Step 4: Get Your Team ID

1. In Apple Developer Portal, go to **"Membership"** in the top navigation
2. Your **Team ID** is displayed there
3. Copy it - this is your `ICLOUD_TEAM_ID`

## Step 5: Generate Client Secret (JWT)

Apple requires a JWT token as the client secret. You need to generate this programmatically.

### Option A: Using Node.js Script

Create a file `backend/generate-apple-secret.js`:

```javascript
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get values from environment variables
const teamId = process.env.ICLOUD_TEAM_ID;
const keyId = process.env.ICLOUD_KEY_ID;
const clientId = process.env.ICLOUD_CLIENT_ID;
const keyPath = process.env.ICLOUD_KEY_PATH || join(__dirname, 'AuthKey.p8');

if (!teamId || !keyId || !clientId) {
  console.error('Missing required environment variables:');
  console.error('  ICLOUD_TEAM_ID:', teamId ? 'SET' : 'NOT SET');
  console.error('  ICLOUD_KEY_ID:', keyId ? 'SET' : 'NOT SET');
  console.error('  ICLOUD_CLIENT_ID:', clientId ? 'SET' : 'NOT SET');
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`Key file not found: ${keyPath}`);
  console.error('Set ICLOUD_KEY_PATH environment variable to the path of your .p8 key file');
  process.exit(1);
}

const privateKey = fs.readFileSync(keyPath, 'utf8');

// Generate JWT (valid for 6 months)
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
  {
    algorithm: 'ES256',
    keyid: keyId,
  }
);

console.log('Apple Client Secret (JWT):');
console.log(clientSecret);
console.log('\nAdd this to your backend/.env file as ICLOUD_CLIENT_SECRET');
```

Run it:
```powershell
cd backend
$env:ICLOUD_TEAM_ID="your-team-id"
$env:ICLOUD_KEY_ID="your-key-id"
$env:ICLOUD_CLIENT_ID="com.uaol.service"
$env:ICLOUD_KEY_PATH="path/to/AuthKey_XXXXX.p8"
node generate-apple-secret.js
```

### Option B: Using Online Tool

You can also use online JWT generators, but be careful with security:
1. Use a tool like [jwt.io](https://jwt.io) with the ES256 algorithm
2. Payload:
```json
{
  "iss": "YOUR_TEAM_ID",
  "iat": 1234567890,
  "exp": 1234567890,
  "aud": "https://appleid.apple.com",
  "sub": "YOUR_SERVICE_ID"
}
```
3. Use your `.p8` private key
4. Set key ID in header

**Note**: JWT tokens expire. You'll need to regenerate them periodically (every 6 months).

## Step 6: Configure Environment Variables

Add these to your `backend/.env` file:

```env
ICLOUD_CLIENT_ID=com.uaol.service
ICLOUD_CLIENT_SECRET=your-generated-jwt-token-here
ICLOUD_REDIRECT_URI=http://localhost:3000/auth/icloud/callback
ICLOUD_TEAM_ID=your-team-id
ICLOUD_KEY_ID=your-key-id
ICLOUD_KEY_PATH=path/to/AuthKey_XXXXX.p8
```

### Environment Variable Details

- **ICLOUD_CLIENT_ID**: Your Service ID from Step 2 (e.g., `com.uaol.service`)
- **ICLOUD_CLIENT_SECRET**: The JWT token you generated in Step 5
- **ICLOUD_REDIRECT_URI**: Must match what you set in Apple Developer Portal
- **ICLOUD_TEAM_ID**: Your Apple Developer Team ID
- **ICLOUD_KEY_ID**: Your Key ID from Step 3
- **ICLOUD_KEY_PATH**: Path to your `.p8` key file (optional, for regenerating secrets)

## Step 7: Update Backend Code

The backend code needs to be updated to properly handle Sign in with Apple. Let me check the current implementation and update it if needed.

## Limitations

**Important**: Sign in with Apple has limitations:

1. **No iCloud Service Access**: Sign in with Apple does NOT provide access to:
   - iCloud Mail
   - iCloud Calendar  
   - iCloud Drive
   - iCloud Notes

2. **Email Access**: 
   - Apple only provides email on the **first authorization**
   - Subsequent logins may not include email (user can choose to hide it)

3. **Name Access**:
   - Only provided on first authorization
   - May be missing on subsequent logins

4. **Data Access**: 
   - To access actual iCloud services, you'd need:
     - CloudKit API (for apps)
     - IMAP for mail
     - CalDAV for calendar
     - These require different authentication methods

## Testing

1. Start your backend: `cd backend && npm run dev`
2. Navigate to login page
3. Click "Sign in with Apple"
4. Sign in with your Apple ID
5. Authorize the app
6. You should be redirected back and logged in

## Troubleshooting

### Error: "invalid_client"
- **Cause**: Client ID or client secret is incorrect
- **Fix**: Verify your Service ID matches `ICLOUD_CLIENT_ID` and the JWT secret is valid

### Error: "invalid_grant"
- **Cause**: Authorization code has expired or been used
- **Fix**: Try the login flow again

### Error: "redirect_uri_mismatch"
- **Cause**: Redirect URI doesn't match what's configured in Apple Developer Portal
- **Fix**: Check both locations match exactly

### Missing Email on Subsequent Logins
- **Cause**: Apple only provides email on first authorization
- **Fix**: Store the email from first login and use user ID for subsequent logins

## Production Notes

1. **Update Return URLs** in Apple Developer Portal for production domain
2. **Use HTTPS** - required for production
3. **Regenerate JWT**: Client secrets (JWTs) expire after 6 months - set a reminder
4. **Store Key Securely**: Keep your `.p8` key file secure and backed up

## Next Steps

After setting up Sign in with Apple:

1. Test the login flow
2. Handle missing email on subsequent logins
3. Consider implementing CloudKit for actual iCloud data access (if needed)
4. Add "Connected Accounts" UI

## Resources

- [Sign in with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Apple Developer Portal](https://developer.apple.com/account/)
- [JWT.io](https://jwt.io) - For testing JWT tokens

