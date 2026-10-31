-- ==============================================================================
-- AutoFlow Database Schema Migration (Supabase PostgreSQL)
-- Version: 1.1.0
-- Migration: 002_chat_exports.sql
-- Description: Table for storing in-memory Base64-encoded exports (TXT, PDF, XLSX)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.chat_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('txt', 'pdf', 'xlsx')),
    mime_type VARCHAR(150) NOT NULL,
    content_base64 TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_exports_conv_id ON public.chat_exports(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_exports_created_at ON public.chat_exports(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_exports ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role full access to chat_exports"
ON public.chat_exports
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow public read access to downloads by ID
CREATE POLICY "Allow public download access to chat_exports"
ON public.chat_exports
FOR SELECT
TO public, anon, authenticated
USING (true);
