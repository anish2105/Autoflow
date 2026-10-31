-- ==============================================================================
-- AutoFlow Database Schema Migration (Supabase PostgreSQL)
-- Version: 1.0.0
-- Hierarchy:
--   users
--     └── conversations
--           ├── messages
--           └── runs
--                 └── execution_steps
--                       └── tool_calls
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USERS TABLE
-- Public user profile table synchronized with Supabase auth.users
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to automatically create/update public.users on auth.users changes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.users.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- 2. CONVERSATIONS TABLE
-- Persistent chat sessions belonging to users
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);


-- ==============================================================================
-- 3. MESSAGES TABLE
-- Chronological conversation history (user prompts and assistant responses)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT,
    sequence_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_seq ON public.messages(conversation_id, sequence_number ASC);


-- ==============================================================================
-- 4. RUNS TABLE
-- Tracks individual agent workflow executions for a conversation turn
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'running', 'completed', 'error', 'aborted')),
    input_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
    iteration_count INTEGER DEFAULT 0,
    total_latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runs_conversation_id ON public.runs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON public.runs(status);


-- ==============================================================================
-- 5. EXECUTION_STEPS TABLE
-- Detailed step-by-step trace of LangGraph node visits (agent, tools, validator, synthesizer)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.execution_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    node VARCHAR(100) NOT NULL,
    step_type VARCHAR(50),
    action TEXT,
    status VARCHAR(30) DEFAULT 'success',
    input JSONB,
    output JSONB,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execution_steps_run_id ON public.execution_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_execution_steps_step_num ON public.execution_steps(run_id, step_number ASC);


-- ==============================================================================
-- 6. TOOL_CALLS TABLE
-- First-class entities capturing every individual tool invocation and result
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
    execution_step_id UUID REFERENCES public.execution_steps(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    arguments JSONB,
    result JSONB,
    status VARCHAR(30) DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'error', 'failed')),
    error TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    latency_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_run_id ON public.tool_calls(run_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_tool_name ON public.tool_calls(tool_name);


-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each authenticated user can only view and manage their own data
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_calls ENABLE ROW LEVEL SECURITY;

-- 7.1 Users Table Policy
CREATE POLICY "Users can view and update own profile"
    ON public.users
    FOR ALL
    USING (auth.uid() = id);

-- 7.2 Conversations Policy
CREATE POLICY "Users can CRUD their own conversations"
    ON public.conversations
    FOR ALL
    USING (auth.uid() = user_id);

-- 7.3 Messages Policy
CREATE POLICY "Users can CRUD messages in their conversations"
    ON public.messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
        )
    );

-- 7.4 Runs Policy
CREATE POLICY "Users can CRUD runs in their conversations"
    ON public.runs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = runs.conversation_id AND c.user_id = auth.uid()
        )
    );

-- 7.5 Execution Steps Policy
CREATE POLICY "Users can CRUD execution steps for their runs"
    ON public.execution_steps
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.runs r
            JOIN public.conversations c ON c.id = r.conversation_id
            WHERE r.id = execution_steps.run_id AND c.user_id = auth.uid()
        )
    );

-- 7.6 Tool Calls Policy
CREATE POLICY "Users can CRUD tool calls for their runs"
    ON public.tool_calls
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.runs r
            JOIN public.conversations c ON c.id = r.conversation_id
            WHERE r.id = tool_calls.run_id AND c.user_id = auth.uid()
        )
    );
