-- =============================================================================
-- Enterprise RAG Document Engine - Database Schema
-- =============================================================================
-- This script initializes the PostgreSQL database with tables for:
-- 1. Users: Authentication and user management
-- 2. Documents: PDF metadata with MinIO storage references
-- 3. Chat Sessions: Conversation history for RAG interactions
--
-- Design Principles:
-- - UUIDs for primary keys (distributed system friendly, no sequence contention)
-- - Timestamps with timezone for proper temporal handling
-- - JSONB for flexible metadata without schema migrations
-- - Proper indexing for common query patterns
-- - Soft deletes via deleted_at for audit trails
-- =============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Users Table
-- =============================================================================
-- Stores user authentication and profile information.
-- In production, integrate with your identity provider (Auth0, Clerk, etc.)
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Authentication fields
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- NULL if using OAuth/SSO

    -- Profile information
    full_name VARCHAR(255),
    avatar_url TEXT,

    -- Account status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,

    -- Flexible metadata for extensibility
    -- Example: { "preferences": { "theme": "dark" }, "quotas": { "max_documents": 100 } }
    metadata JSONB DEFAULT '{}',

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete support

);

-- Index for email lookups during authentication
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- =============================================================================
-- Documents Table
-- =============================================================================
-- Stores document metadata with references to:
-- - MinIO: Raw PDF file storage (minio_object_key)
-- - Qdrant: Vector embeddings (qdrant_collection, qdrant_point_ids)
--
-- The actual file content lives in MinIO; only metadata here.
-- Vector embeddings live in Qdrant; we store IDs for cleanup/sync.
-- =============================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner relationship
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Document metadata
    title VARCHAR(500) NOT NULL,
    description TEXT,
    original_filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    file_size_bytes BIGINT,

    -- MinIO storage reference
    -- Format: "documents/{user_id}/{document_id}/{filename}"
    minio_bucket VARCHAR(255) NOT NULL,
    minio_object_key VARCHAR(1000) NOT NULL,

    -- Qdrant vector storage reference
    -- Stores the collection name and point IDs for this document's chunks
    qdrant_collection VARCHAR(255),
    qdrant_point_ids UUID[] DEFAULT '{}', -- Array of point IDs in Qdrant

    -- Processing status tracking
    -- pending -> processing -> completed | failed
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_error TEXT,
    processed_at TIMESTAMPTZ,

    -- Document statistics (populated after processing)
    page_count INTEGER,
    chunk_count INTEGER,
    word_count INTEGER,

    -- Flexible metadata for extensibility
    -- Example: { "language": "en", "tags": ["legal", "contract"], "ocr_applied": true }
    metadata JSONB DEFAULT '{}',

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ

);

-- Composite index for user's documents listing (most common query)
CREATE INDEX idx_documents_user_id ON documents(user_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Index for processing status (background job queries)
CREATE INDEX idx_documents_processing_status ON documents(processing_status)
    WHERE deleted_at IS NULL AND processing_status IN ('pending', 'processing');

-- =============================================================================
-- Chat Sessions Table
-- =============================================================================
-- Stores conversation sessions between users and the RAG system.
-- Each session can reference one or more documents for context.
--
-- Design: Messages stored as JSONB array for flexibility and performance.
-- For high-volume systems, consider a separate messages table.
-- =============================================================================
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner relationship
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session metadata
    title VARCHAR(500), -- Auto-generated or user-defined

    -- Document context: Which documents are being queried
    -- Allows multi-document RAG conversations
    document_ids UUID[] DEFAULT '{}',

    -- Conversation messages stored as JSONB array
    -- Format: [
    --   { "role": "user", "content": "...", "timestamp": "..." },
    --   { "role": "assistant", "content": "...", "timestamp": "...", "sources": [...] }
    -- ]
    messages JSONB DEFAULT '[]',

    -- Session state
    is_active BOOLEAN DEFAULT true,

    -- RAG configuration for this session
    -- Example: { "temperature": 0.7, "top_k": 5, "model": "gpt-4" }
    rag_config JSONB DEFAULT '{}',

    -- Flexible metadata
    -- Example: { "shared_with": [...], "export_format": "pdf" }
    metadata JSONB DEFAULT '{}',

    -- Audit timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ

);

-- Index for user's chat sessions listing
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id, updated_at DESC)
    WHERE deleted_at IS NULL;

-- Index for finding sessions by document (useful for document deletion cleanup)
CREATE INDEX idx_chat_sessions_documents ON chat_sessions USING GIN(document_ids)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- Updated Timestamp Trigger
-- =============================================================================
-- Automatically update the updated_at column on any row modification.
-- This ensures audit timestamps are always accurate without application logic.
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Initial Data (Development Only)
-- =============================================================================
-- Create a test user for development. Remove in production.
-- =============================================================================
INSERT INTO users (id, email, full_name, is_active, is_verified)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'dev@example.com',
    'Development User',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- Comments for Documentation
-- =============================================================================
COMMENT ON TABLE users IS 'User accounts for the RAG Document Engine';
COMMENT ON TABLE documents IS 'PDF document metadata with MinIO and Qdrant references';
COMMENT ON TABLE chat_sessions IS 'RAG conversation history with document context';

COMMENT ON COLUMN documents.minio_object_key IS 'Full path to PDF in MinIO bucket';
COMMENT ON COLUMN documents.qdrant_point_ids IS 'Array of vector point IDs in Qdrant for cleanup';
COMMENT ON COLUMN chat_sessions.messages IS 'JSONB array of conversation messages with roles and content';
