-- Migration: Add guest user support
-- Purpose: Allow users to use UAOL without registration

-- Add guest user columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for guest session lookups
CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id) WHERE is_guest = true;

-- Create index for guest cleanup (expired guests)
CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users(expires_at) WHERE is_guest = true;

-- Add constraint: session_id required for guests
ALTER TABLE users 
  ADD CONSTRAINT check_guest_session_id 
  CHECK (is_guest = false OR session_id IS NOT NULL);

-- Set default credits for guests (1000 credits)
-- Note: This is handled in application code, but we can set a default
-- UPDATE users SET current_credits = 1000 WHERE is_guest = true AND current_credits = 0;

COMMENT ON COLUMN users.is_guest IS 'True if this is a temporary guest user (no email registration)';
COMMENT ON COLUMN users.session_id IS 'Session identifier for guest users (stored in browser localStorage)';
COMMENT ON COLUMN users.expires_at IS 'Expiration time for guest users (24 hours from creation)';

