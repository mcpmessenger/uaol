-- Migration: Add user API keys storage
-- Purpose: Store encrypted API keys for multiple AI providers (OpenAI, Gemini, Claude) per user

CREATE TABLE IF NOT EXISTS user_api_keys (
    key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'claude')),
    encrypted_key TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_default ON user_api_keys(user_id, is_default) WHERE is_default = true;

DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
DROP FUNCTION IF EXISTS update_user_api_keys_updated_at();

CREATE FUNCTION update_user_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_user_api_keys_updated_at();

