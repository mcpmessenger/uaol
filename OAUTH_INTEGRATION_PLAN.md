# OAuth Integration Plan

## 🎯 Two Types of OAuth Integration

### Type 1: OAuth for Authentication
**Purpose**: Let users sign in with Google/Outlook/iCloud accounts
- Simple login flow
- No data access needed
- Just verify identity

**Status**: ⏸️ Deferred (using email/API key for now)

---

### Type 2: OAuth for Data Access ⭐ **This is the important one**
**Purpose**: Access user's personal data from OAuth providers

## Why This Matters

Users will want to:
- **Access their files**: "Analyze documents from my Google Drive"
- **Check calendars**: "What's on my Outlook calendar today?"
- **Read emails**: "Summarize my recent Gmail messages"
- **Create events**: "Add this meeting to my iCloud calendar"
- **Access spreadsheets**: "Read data from my Google Sheets"

## OAuth Providers & Their Services

### Google OAuth
**Services Available**:
- 📁 **Google Drive** - Access files, folders, documents
- 📅 **Google Calendar** - Read/create events
- 📧 **Gmail** - Read/send emails
- 📊 **Google Sheets** - Read/write spreadsheet data
- 📝 **Google Docs** - Read/write documents

**Scopes Needed**:
- `https://www.googleapis.com/auth/drive.readonly` - Read Drive files
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/spreadsheets.readonly` - Read Sheets

### Microsoft/Outlook OAuth
**Services Available**:
- 📁 **OneDrive** - Access files and folders
- 📅 **Outlook Calendar** - Read/create events
- 📧 **Outlook Mail** - Read/send emails
- 👥 **Microsoft Teams** - Access Teams data
- 📊 **Excel Online** - Read/write spreadsheets

**Scopes Needed**:
- `Files.Read` - Read OneDrive files
- `Calendars.Read` - Read calendar
- `Mail.Read` - Read emails
- `Files.ReadWrite` - Read/write files (if needed)

### Apple/iCloud OAuth
**Services Available**:
- 📁 **iCloud Drive** - Access files
- 📅 **iCloud Calendar** - Read/create events
- 📧 **iCloud Mail** - Read emails
- 📝 **iCloud Notes** - Access notes
- 📸 **iCloud Photos** - Access photos (if needed)

**Scopes Needed**:
- `cloudkit.readonly` - Read iCloud data
- Calendar access
- Mail access

---

## Implementation Plan

### Phase 1: Database Schema ✅
**Status**: Ready to implement

**Table**: `user_oauth_tokens`
- Store access tokens per user per provider
- Store refresh tokens for token renewal
- Track scopes granted
- Track token expiry

**Migration File**: `backend/shared/database/migrations/add-oauth-tokens.sql`

### Phase 2: Backend OAuth Flow
**Tasks**:
1. Implement OAuth initiation endpoints
   - `GET /auth/google/connect` - Start Google OAuth
   - `GET /auth/outlook/connect` - Start Outlook OAuth
   - `GET /auth/icloud/connect` - Start iCloud OAuth

2. Implement OAuth callback handlers
   - Exchange authorization code for tokens
   - Store tokens in database
   - Link to user account

3. Token management
   - Refresh expired tokens automatically
   - Revoke tokens on user request
   - List connected accounts

### Phase 3: Tool Integration
**Tasks**:
1. Create MCP tools for each service:
   - `google-drive-read` - Read files from Drive
   - `google-calendar-read` - Read calendar events
   - `outlook-onedrive-read` - Read OneDrive files
   - `icloud-calendar-read` - Read iCloud calendar
   - etc.

2. Use stored OAuth tokens to make API calls
3. Handle token refresh automatically
4. Show user which services are connected

### Phase 4: Frontend UI
**Tasks**:
1. "Connect Accounts" page
   - Show available providers
   - Show connection status
   - "Connect Google" button
   - "Connect Outlook" button
   - "Connect iCloud" button

2. Connected accounts management
   - List connected accounts
   - Show granted permissions
   - Revoke access option

3. Integration in chat
   - "Access my Google Drive" commands
   - "Check my calendar" commands
   - Natural language to service calls

---

## Example Use Cases

### Use Case 1: Document Analysis
**User**: "Analyze the documents in my Google Drive folder 'Project X'"

**Flow**:
1. Check if user has Google OAuth token
2. If not, prompt to connect Google account
3. Use token to list Drive files
4. Filter by folder 'Project X'
5. Download and analyze documents
6. Return results

### Use Case 2: Calendar Integration
**User**: "What meetings do I have this week?"

**Flow**:
1. Check if user has Outlook/Google/iCloud token
2. Use token to query calendar API
3. Filter events for this week
4. Format and return results

### Use Case 3: Email Summarization
**User**: "Summarize my unread emails from this week"

**Flow**:
1. Check OAuth token for email provider
2. Query email API for unread messages
3. Process emails with AI
4. Return summary

---

## Security Considerations

1. **Token Storage**:
   - Encrypt tokens at rest
   - Use secure storage (AWS Secrets Manager or similar)
   - Never log tokens

2. **Token Refresh**:
   - Automatically refresh before expiry
   - Handle refresh failures gracefully
   - Notify user if refresh fails

3. **Scope Management**:
   - Request minimum required scopes
   - Show user what permissions are requested
   - Allow users to revoke access

4. **Token Rotation**:
   - Support token regeneration
   - Handle revoked tokens
   - Re-authenticate if needed

---

## Database Schema

```sql
CREATE TABLE user_oauth_tokens (
  token_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  provider VARCHAR(50), -- 'google', 'outlook', 'icloud'
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMP,
  scopes TEXT[], -- ['drive.readonly', 'calendar.read']
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Recommended Implementation Order

1. **Now**: Email/API key authentication (simple, works immediately)
2. **Next**: OAuth for authentication (Google/Outlook/iCloud login)
3. **Then**: OAuth for data access (Drive, Calendar, Email)
4. **Finally**: Advanced integrations (workflow automation with user data)

---

## Files to Create

### Backend
- `backend/shared/database/models/oauth-token.ts` - OAuth token model
- `backend/services/auth-service/src/controllers/oauth-controller.ts` - OAuth handlers
- `backend/services/auth-service/src/routes/oauth.ts` - OAuth routes
- `backend/shared/oauth/google-client.ts` - Google API client
- `backend/shared/oauth/outlook-client.ts` - Outlook API client
- `backend/shared/oauth/icloud-client.ts` - iCloud API client

### Frontend
- `src/pages/ConnectAccounts.tsx` - Connect OAuth accounts
- `src/components/oauth/ProviderCard.tsx` - OAuth provider card
- `src/components/oauth/ConnectedAccounts.tsx` - List connected accounts

---

## Next Steps

1. ✅ Create database migration for OAuth tokens
2. ⏸️ Implement OAuth token model
3. ⏸️ Add OAuth connection endpoints
4. ⏸️ Create frontend UI for connecting accounts
5. ⏸️ Build MCP tools that use OAuth tokens

**Priority**: Medium (after basic auth and core features)

