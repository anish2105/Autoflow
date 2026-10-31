-- ==============================================================================
-- AutoFlow Database Schema Migration (Supabase PostgreSQL)
-- Version: 1.2.0
-- Migration: 003_user_documents.sql
-- Description: Table for storing user-level digitized documents (PDF, Excel, Images, DOCX)
--              with full and page-wise parsed Markdown from LlamaCloud OCR.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL DEFAULT 'pdf',
    mime_type VARCHAR(150) NOT NULL DEFAULT 'application/pdf',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    tier VARCHAR(20) NOT NULL DEFAULT 'fast' CHECK (tier IN ('fast', 'agentic')),
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'digitized', 'failed')),
    digitized BOOLEAN NOT NULL DEFAULT false,
    content_base64 TEXT NOT NULL,
    parsed_markdown TEXT,
    parsed_pages JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    source VARCHAR(50) DEFAULT 'upload' CHECK (source IN ('upload', 'chat')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON public.user_documents(status);
CREATE INDEX IF NOT EXISTS idx_user_documents_created_at ON public.user_documents(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role full access to user_documents"
ON public.user_documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to view/manage their own documents
CREATE POLICY "Allow users to manage their own documents"
ON public.user_documents
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow anon access for guest documents (when user_id IS NULL)
CREATE POLICY "Allow anon access for guest documents"
ON public.user_documents
FOR ALL
TO anon, public
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);
