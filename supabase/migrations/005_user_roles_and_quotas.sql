-- ==============================================================================
-- AutoFlow Database Schema Migration (Supabase PostgreSQL)
-- Version: 1.3.0
-- Migration: 005_user_roles_and_quotas.sql
-- Description: Adds user roles (Pleasant, Jack, King, Ace), custom quota overrides,
--              usage tracking, upgrade request queue, and Ace auto-provisioning.
-- ==============================================================================

-- 1. Extend public.users table with Tier and Quota Overrides
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NOT NULL DEFAULT 'jack' CHECK (tier IN ('pleasant', 'jack', 'king', 'ace')),
ADD COLUMN IF NOT EXISTS custom_doc_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_msg_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_tools JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Update existing owner accounts to 'ace'
UPDATE public.users
SET tier = 'ace'
WHERE LOWER(email) IN ('anishvv212002@gmail.com', 'anishvantagodi@gmail.com');

-- 2. Create User Usage Tracking Table
CREATE TABLE IF NOT EXISTS public.user_usage (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    message_count INTEGER NOT NULL DEFAULT 0,
    doc_count INTEGER NOT NULL DEFAULT 0,
    image_count INTEGER NOT NULL DEFAULT 0,
    last_active_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Upgrade Requests Queue Table
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    current_tier VARCHAR(20) NOT NULL,
    requested_tier VARCHAR(20) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Auto-Provision Ace Owner Accounts Function & Trigger
CREATE OR REPLACE FUNCTION public.handle_user_tier_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if newly created or updated user is in authorized Ace list
    IF LOWER(NEW.email) IN ('anishvv212002@gmail.com', 'anishvantagodi@gmail.com') THEN
        NEW.tier := 'ace';
    ELSE
        -- Default to 'jack' if not explicitly assigned
        IF NEW.tier IS NULL THEN
            NEW.tier := 'jack';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_user_tier ON public.users;
CREATE TRIGGER trigger_assign_user_tier
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_tier_assignment();

-- 5. RLS Policies
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own usage
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to read their own usage') THEN
        CREATE POLICY "Allow users to read their own usage"
        ON public.user_usage FOR SELECT TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Allow service role full access to user_usage
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service role full access to user_usage') THEN
        CREATE POLICY "Allow service role full access to user_usage"
        ON public.user_usage FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Allow users to submit upgrade requests
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to submit upgrade requests') THEN
        CREATE POLICY "Allow users to submit upgrade requests"
        ON public.upgrade_requests FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Allow users to view own upgrade requests
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to view own upgrade requests') THEN
        CREATE POLICY "Allow users to view own upgrade requests"
        ON public.upgrade_requests FOR SELECT TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Allow service role full access to upgrade_requests
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service role full access to upgrade_requests') THEN
        CREATE POLICY "Allow service role full access to upgrade_requests"
        ON public.upgrade_requests FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    END IF;
END $$;

