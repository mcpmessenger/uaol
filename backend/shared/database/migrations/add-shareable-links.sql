-- Migration: Add shareable workflow links for collaboration
-- Provides per-workflow shareable links with token and permission level

CREATE TABLE IF NOT EXISTS shareable_links (
    shareable_link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(workflow_id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('read', 'editor')),
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (access_token),
    UNIQUE (workflow_id, permission, access_token)
);

CREATE INDEX IF NOT EXISTS idx_shareable_links_workflow ON shareable_links(workflow_id);
CREATE INDEX IF NOT EXISTS idx_shareable_links_permission ON shareable_links(permission);
CREATE INDEX IF NOT EXISTS idx_shareable_links_expires_at ON shareable_links(expires_at);

DROP TRIGGER IF EXISTS update_shareable_links_updated_at ON shareable_links;
DROP FUNCTION IF EXISTS update_shareable_links_updated_at();

CREATE FUNCTION update_shareable_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shareable_links_updated_at
    BEFORE UPDATE ON shareable_links
    FOR EACH ROW
    EXECUTE FUNCTION update_shareable_links_updated_at();
