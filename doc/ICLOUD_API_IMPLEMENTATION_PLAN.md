# iCloud API Access - Implementation Plan

## Executive Summary

**Key Finding**: iCloud does NOT provide standard OAuth REST APIs like Google/Microsoft. Accessing iCloud content requires different approaches:

- **iCloud Mail** → IMAP/SMTP with app-specific passwords
- **iCloud Calendar** → CalDAV protocol with app-specific passwords  
- **iCloud Drive** → CloudKit API (very complex, requires native app)

## Recommendation: Focus on Google/Microsoft First

Since you already have:
- ✅ Google OAuth working
- ✅ Microsoft OAuth ready

**Best Strategy**:
1. **Start with Google & Microsoft** - They have proper REST APIs via OAuth
2. **Add iCloud Mail/Calendar later** if users specifically request it
3. **Skip iCloud Drive** - Too complex, use Google Drive/OneDrive instead

---

## Option 1: iCloud Mail via IMAP (Most Practical)

### What Users Need to Do

1. Go to https://appleid.apple.com/
2. Sign in with Apple ID
3. Generate an "App-Specific Password"
4. Copy the password
5. Enter email + password in your app

### What Your App Does

1. Store encrypted app-specific password
2. Connect to `imap.mail.me.com` using IMAP
3. Read/send emails programmatically

### Implementation Steps

#### Step 1: Add Database Schema for iCloud Credentials

Create migration: `backend/shared/database/migrations/add-icloud-credentials.sql`

```sql
-- Store iCloud credentials (different from OAuth tokens)
CREATE TABLE IF NOT EXISTS user_icloud_credentials (
  credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  app_specific_password_encrypted TEXT NOT NULL, -- Must be encrypted!
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_icloud_credentials_user_id 
  ON user_icloud_credentials(user_id);
```

#### Step 2: Create iCloud Mail Service

Create `backend/shared/services/icloud-mail-service.ts`:

```typescript
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { decrypt, encrypt } from '../auth/encryption';

export interface ICloudMailCredentials {
  email: string;
  appSpecificPassword: string;
}

export class ICloudMailService {
  /**
   * Test connection to iCloud Mail
   */
  static async testConnection(credentials: ICloudMailCredentials): Promise<boolean> {
    return new Promise((resolve) => {
      const imap = new Imap({
        user: credentials.email,
        password: credentials.appSpecificPassword,
        host: 'imap.mail.me.com',
        port: 993,
        tls: true,
      });

      imap.once('ready', () => {
        imap.end();
        resolve(true);
      });

      imap.once('error', () => {
        resolve(false);
      });

      imap.connect();
    });
  }

  /**
   * Get unread emails
   */
  static async getUnreadEmails(
    credentials: ICloudMailCredentials,
    limit: number = 10
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: credentials.email,
        password: credentials.appSpecificPassword,
        host: 'imap.mail.me.com',
        port: 993,
        tls: true,
      });

      const emails: any[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          imap.search(['UNSEEN'], (err, results) => {
            if (err || !results || results.length === 0) {
              imap.end();
              return resolve([]);
            }

            const fetch = imap.fetch(results.slice(-limit), { bodies: '' });

            fetch.on('message', (msg) => {
              msg.on('body', (stream) => {
                simpleParser(stream, (err, parsed) => {
                  if (!err && parsed) {
                    emails.push({
                      subject: parsed.subject,
                      from: parsed.from?.text,
                      date: parsed.date,
                      text: parsed.text,
                      html: parsed.html,
                    });
                  }
                });
              });
            });

            fetch.once('end', () => {
              imap.end();
              resolve(emails);
            });
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }
}
```

#### Step 3: Create API Endpoints

Add to `backend/services/api-gateway/src/routes/icloud.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../../../shared/auth/middleware';
import { ICloudMailService } from '../../../shared/services/icloud-mail-service';
import { encrypt, decrypt } from '../../../shared/auth/encryption';
// Import database models to store credentials

const router = Router();

/**
 * Connect iCloud Mail
 * POST /api/icloud/mail/connect
 */
router.post('/mail/connect', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { email, appSpecificPassword } = req.body;

    if (!email || !appSpecificPassword) {
      return res.status(400).json({
        error: 'Email and app-specific password are required',
      });
    }

    // Test connection first
    const isValid = await ICloudMailService.testConnection({
      email,
      appSpecificPassword,
    });

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid credentials. Please check your email and app-specific password.',
      });
    }

    // Encrypt password before storing
    const encryptedPassword = encrypt(appSpecificPassword);

    // Store in database (implement this)
    // await storeICloudCredentials(userId, email, encryptedPassword);

    res.json({
      success: true,
      message: 'iCloud Mail connected successfully',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get unread emails
 * GET /api/icloud/mail/unread
 */
router.get('/mail/unread', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get encrypted credentials from database
    // const credentials = await getICloudCredentials(userId);
    // const appSpecificPassword = decrypt(credentials.app_specific_password_encrypted);

    // const emails = await ICloudMailService.getUnreadEmails(
    //   { email: credentials.email, appSpecificPassword },
    //   limit
    // );

    res.json({
      emails: [], // TODO: Implement
      message: 'Not yet implemented',
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
```

#### Step 4: Install Required Packages

```bash
cd backend
npm install imap mailparser
npm install --save-dev @types/imap
```

---

## Option 2: iCloud Calendar via CalDAV

Similar approach but using CalDAV protocol instead of IMAP.

### Required Package

```bash
npm install tsdav
```

### Implementation Similar to Mail

Create `backend/shared/services/icloud-calendar-service.ts` using CalDAV library.

---

## Database Schema Comparison

### Google/Microsoft (OAuth Tokens)
```sql
-- Already exists: user_oauth_tokens table
-- Stores: access_token, refresh_token (from OAuth flow)
```

### iCloud (App-Specific Passwords)
```sql
-- Need new table: user_icloud_credentials
-- Stores: email, encrypted_app_specific_password
```

---

## Security: Encrypt App-Specific Passwords

You MUST encrypt passwords before storing. Use the existing encryption utility:

```typescript
import { encrypt, decrypt } from '../shared/auth/encryption';

// Before storing
const encrypted = encrypt(appSpecificPassword);

// When using
const decrypted = decrypt(encrypted);
```

---

## User Experience Flow

### For Google/Microsoft (OAuth - Better UX)
1. User clicks "Connect Google"
2. Redirects to Google login
3. User authorizes
4. Redirected back - done! ✅

### For iCloud (App-Specific Password - Worse UX)
1. User clicks "Connect iCloud Mail"
2. App shows instructions:
   - "Go to appleid.apple.com"
   - "Generate an app-specific password"
   - "Paste it here"
3. User must manually generate password
4. User enters email + password
5. Done ✅ (but more steps)

---

## Implementation Priority

### Phase 1: Google & Microsoft (Easiest) ⭐
- ✅ Already have OAuth working
- ✅ Standard REST APIs
- ✅ Better user experience

### Phase 2: iCloud Mail (If Needed)
- ⚠️ More complex (IMAP)
- ⚠️ Requires app-specific passwords
- ⚠️ Less user-friendly

### Phase 3: iCloud Calendar (If Needed)
- ⚠️ CalDAV protocol
- ⚠️ Similar complexity to Mail

### Skip: iCloud Drive
- ❌ Too complex (CloudKit)
- ❌ Use Google Drive/OneDrive instead

---

## Next Steps

1. **Decide if you need iCloud**:
   - Most users have Google/Microsoft accounts
   - iCloud is mainly for Apple users
   - Consider: Do your users specifically need iCloud?

2. **If yes, start with Mail**:
   - Most common use case
   - IMAP is well-documented
   - Can reuse pattern for Calendar later

3. **Implement gradually**:
   - Start with credential storage
   - Add connection testing
   - Add email reading
   - Add email sending

---

## Comparison Table

| Feature | Google | Microsoft | iCloud Mail |
|---------|--------|-----------|-------------|
| **Setup Difficulty** | ⭐ Easy | ⭐ Easy | ⭐⭐⭐ Medium |
| **User Experience** | ⭐⭐⭐ Great | ⭐⭐⭐ Great | ⭐⭐ OK |
| **Security** | ⭐⭐⭐ OAuth | ⭐⭐⭐ OAuth | ⭐⭐ Password |
| **API Quality** | ⭐⭐⭐ REST | ⭐⭐⭐ REST | ⭐⭐ IMAP |
| **Documentation** | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent | ⭐⭐ Good |

**Recommendation**: Start with Google/Microsoft, add iCloud only if users specifically request it.

