-- Check if user exists and fix if needed
-- Run these ONE AT A TIME in CockroachDB SQL Shell

-- Step 1: Check if the user from JWT token exists
SELECT user_id, email, subscription_tier, created_at
FROM users 
WHERE user_id = 'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf';

-- Step 2: If no results, check all users to find the correct one
SELECT user_id, email, subscription_tier, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: If you need to create the user (use the email from your OAuth sign-in)
-- Replace 'williamtflynn@gmail.com' with your actual email
INSERT INTO users (user_id, email, api_key, current_credits, subscription_tier)
VALUES (
    'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf'::uuid,
    'williamtflynn@gmail.com',
    'api-key-' || gen_random_uuid()::text,
    1000,
    'Free'
)
ON CONFLICT (user_id) DO NOTHING
ON CONFLICT (email) DO NOTHING;

-- Step 4: Verify user was created/updated
SELECT user_id, email, subscription_tier FROM users WHERE user_id = 'fae97c83-cdbd-4b2c-a3c2-088e5d1f32cf';
