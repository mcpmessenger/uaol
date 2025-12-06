-- Create a test user for tool registration
-- Run this in CockroachDB SQL Shell if you get "No users found in database" error

INSERT INTO users (email, api_key, current_credits, subscription_tier)
VALUES (
  'test@example.com',
  'test-api-key-' || gen_random_uuid()::text,
  1000,
  'Free'
)
ON CONFLICT (email) DO NOTHING;

-- Verify user was created
SELECT user_id, email, current_credits FROM users LIMIT 1;
