-- ==============================================================================
-- AutoFlow Database Schema Migration (Supabase PostgreSQL)
-- Version: 1.2.1
-- Migration: 004_document_content_hash.sql
-- Description: Adds content_hash column to user_documents for SHA-256 deduplication.
-- ==============================================================================

ALTER TABLE public.user_documents
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_user_documents_content_hash
ON public.user_documents(content_hash);

