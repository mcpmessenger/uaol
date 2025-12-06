-- Migration: Add avatar_url column to users table
-- Purpose: Store OAuth provider avatar/picture URLs for user profiles

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index for avatar lookups (optional, but can be useful)
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url) WHERE avatar_url IS NOT NULL;

COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar/picture from OAuth provider (Google, Outlook, etc.)';

