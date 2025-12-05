-- Migration: Add vector store support for RAG
-- Purpose: Enable pgvector extension and create document_vectors table for RAG functionality

-- Enable pgvector extension (if available)
-- Note: pgvector must be installed in PostgreSQL. For CockroachDB, use alternative approach.
-- This will fail gracefully if pgvector is not available, allowing fallback to in-memory store
DO $$
BEGIN
  -- Try to create extension (will fail silently if not available)
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    -- Extension not available - this is OK, we'll use in-memory fallback
    RAISE NOTICE 'pgvector extension not available, will use in-memory vector store';
END $$;

-- Create document_vectors table for storing embeddings
-- Note: If pgvector is not available, this table will still be created but vector column will fail
-- In that case, we'll use the in-memory vector store instead
CREATE TABLE IF NOT EXISTS document_vectors (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small produces 1536-dimensional vectors
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_document_vectors_file_id ON document_vectors(file_id);
CREATE INDEX IF NOT EXISTS idx_document_vectors_created_at ON document_vectors(created_at);

-- Create vector similarity search index (HNSW for fast approximate nearest neighbor search)
-- This will only work if pgvector extension is available
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_document_vectors_embedding_hnsw 
    ON document_vectors 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
EXCEPTION
  WHEN OTHERS THEN
    -- Index creation failed (pgvector not available) - this is OK
    RAISE NOTICE 'HNSW index creation skipped (pgvector not available)';
END $$;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_document_vectors_updated_at ON document_vectors;
CREATE TRIGGER update_document_vectors_updated_at BEFORE UPDATE ON document_vectors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE document_vectors IS 'Stores document chunks and their vector embeddings for RAG retrieval';
COMMENT ON COLUMN document_vectors.embedding IS 'Vector embedding (1536 dimensions for OpenAI text-embedding-3-small)';
COMMENT ON COLUMN document_vectors.file_id IS 'Reference to the source file/document';
COMMENT ON COLUMN document_vectors.chunk_index IS 'Index of this chunk within the document';
