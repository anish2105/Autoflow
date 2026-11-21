-- ==============================================================================
-- AutoFlow Database Schema Migration (Supabase PostgreSQL)
-- Version: 1.4.0
-- Migration: 006_user_workflows.sql
-- Description: Creates public.workflows table for user-defined multi-agent pipelines
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Workflow',
    description TEXT DEFAULT '',
    system_prompt_prefix TEXT DEFAULT '',
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    mermaid_code TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user workflow lookups
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON public.workflows(created_at DESC);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to read own workflows') THEN
        CREATE POLICY "Allow users to read own workflows"
        ON public.workflows FOR SELECT TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to insert own workflows') THEN
        CREATE POLICY "Allow users to insert own workflows"
        ON public.workflows FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to update own workflows') THEN
        CREATE POLICY "Allow users to update own workflows"
        ON public.workflows FOR UPDATE TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to delete own workflows') THEN
        CREATE POLICY "Allow users to delete own workflows"
        ON public.workflows FOR DELETE TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Service role full access
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service role full access to workflows') THEN
        CREATE POLICY "Allow service role full access to workflows"
        ON public.workflows FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    END IF;
END $$;

