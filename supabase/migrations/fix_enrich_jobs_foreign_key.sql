-- =====================================================
-- FIX ENRICH_JOBS FOREIGN KEY
-- =====================================================
-- This migration ensures the enrich_jobs table exists
-- with proper foreign key constraint to auth.users
-- =====================================================

-- =====================================================
-- 1. CHECK IF TABLE EXISTS AND DROP IF NEEDED
-- =====================================================

-- If the table exists without proper constraints, we need to recreate it
-- First, let's check and potentially drop it if it's broken
DO $$
BEGIN
  -- Check if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'enrich_jobs'
  ) THEN
    -- Table exists, check if it has the foreign key
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'enrich_jobs'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%user_id%'
    ) THEN
      -- Foreign key is missing, we need to add it
      RAISE NOTICE 'Foreign key constraint missing on enrich_jobs.user_id, adding it now...';

      -- Try to add the constraint
      -- First check if there are any orphaned records
      DELETE FROM public.enrich_jobs
      WHERE user_id NOT IN (SELECT id FROM auth.users);

      -- Now add the foreign key constraint
      ALTER TABLE public.enrich_jobs
      ADD CONSTRAINT enrich_jobs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 2. CREATE TABLE IF NOT EXISTS (backup safety)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.enrich_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  original_file_path TEXT NOT NULL,
  enriched_file_path TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'error')),
  total_rows INTEGER,
  numbers_found INTEGER,
  credited_numbers INTEGER,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ENSURE RLS IS ENABLED
-- =====================================================

ALTER TABLE public.enrich_jobs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. DROP AND RECREATE POLICIES (ensure they exist)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.enrich_jobs;
DROP POLICY IF EXISTS "Users can create their own jobs" ON public.enrich_jobs;
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.enrich_jobs;
DROP POLICY IF EXISTS "Admins can update all jobs" ON public.enrich_jobs;

-- Recreate user policies
CREATE POLICY "Users can view their own jobs"
  ON public.enrich_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs"
  ON public.enrich_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Recreate admin policies using JWT metadata (no recursion)
CREATE POLICY "Admins can view all jobs"
  ON public.enrich_jobs FOR SELECT
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

CREATE POLICY "Admins can update all jobs"
  ON public.enrich_jobs FOR UPDATE
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- =====================================================
-- 5. ENSURE INDEX EXISTS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_enrich_jobs_user ON public.enrich_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_enrich_jobs_status ON public.enrich_jobs(status);
CREATE INDEX IF NOT EXISTS idx_enrich_jobs_created ON public.enrich_jobs(created_at DESC);

-- =====================================================
-- 6. VERIFY FOREIGN KEY EXISTS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'enrich_jobs'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE NOTICE '✓ Foreign key constraint exists on enrich_jobs.user_id';
  ELSE
    RAISE WARNING '✗ Foreign key constraint still missing!';
  END IF;
END $$;

-- =====================================================
-- DONE!
-- =====================================================
-- The enrich_jobs table should now have proper foreign key
-- constraint to auth.users(id)
-- =====================================================
