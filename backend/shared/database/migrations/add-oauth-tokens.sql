-- Migration: Add OAuth token storage
-- Purpose: Store OAuth tokens for accessing user's data from Google, Outlook, iCloud

CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'outlook', 'icloud'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  scopes TEXT[], -- Array of granted scopes
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user_id ON user_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_provider ON user_oauth_tokens(provider);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_oauth_tokens_updated_at
  BEFORE UPDATE ON user_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_oauth_tokens_updated_at();

COMMENT ON TABLE user_oauth_tokens IS 'Stores OAuth tokens for accessing user data from external providers (Google, Outlook, iCloud)';
COMMENT ON COLUMN user_oauth_tokens.provider IS 'OAuth provider: google, outlook, or icloud';
COMMENT ON COLUMN user_oauth_tokens.scopes IS 'Array of OAuth scopes granted (e.g., ["drive.readonly", "calendar.read"])';

