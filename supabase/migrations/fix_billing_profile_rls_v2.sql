-- =====================================================
-- FIX BILLING PROFILE RLS POLICY V2
-- =====================================================
-- This migration completely fixes the billing_profiles RLS
-- by ensuring new users can create their billing profile
-- =====================================================

-- =====================================================
-- 1. DROP ALL EXISTING POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage their own billing profile" ON public.billing_profiles;
DROP POLICY IF EXISTS "Users can create their own billing profile" ON public.billing_profiles;
DROP POLICY IF EXISTS "Users can view their own billing profile" ON public.billing_profiles;
DROP POLICY IF EXISTS "Users can update their own billing profile" ON public.billing_profiles;
DROP POLICY IF EXISTS "Users can delete their own billing profile" ON public.billing_profiles;
DROP POLICY IF EXISTS "Admins can view all billing profiles" ON public.billing_profiles;

-- =====================================================
-- 2. CREATE NEW POLICIES WITH PROPER PERMISSIONS
-- =====================================================

-- INSERT: Allow authenticated users to create billing profile with their own user_id
-- Important: Check only the user_id matches, don't use USING clause for INSERT
CREATE POLICY "Authenticated users can create billing profile"
  ON public.billing_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SELECT: Allow users to view their own billing profile
CREATE POLICY "Users can view own billing profile"
  ON public.billing_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- UPDATE: Allow users to update their own billing profile
CREATE POLICY "Users can update own billing profile"
  ON public.billing_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Allow users to delete their own billing profile
CREATE POLICY "Users can delete own billing profile"
  ON public.billing_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. ADMIN POLICIES (using JWT metadata, no recursion)
-- =====================================================

-- SELECT: Admins can view all billing profiles
CREATE POLICY "Admins can view all billing profiles"
  ON public.billing_profiles FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- UPDATE: Admins can update all billing profiles
CREATE POLICY "Admins can update all billing profiles"
  ON public.billing_profiles FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- =====================================================
-- 4. VERIFY RLS IS ENABLED
-- =====================================================

ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. VERIFY POLICIES
-- =====================================================

-- Show all policies on billing_profiles
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'billing_profiles';

  RAISE NOTICE '✓ Created % policies on billing_profiles', policy_count;
END $$;

-- =====================================================
-- DONE!
-- =====================================================
-- Users should now be able to create billing profiles
-- Expected policies:
-- 1. Authenticated users can create billing profile (INSERT)
-- 2. Users can view own billing profile (SELECT)
-- 3. Users can update own billing profile (UPDATE)
-- 4. Users can delete own billing profile (DELETE)
-- 5. Admins can view all billing profiles (SELECT)
-- 6. Admins can update all billing profiles (UPDATE)
-- =====================================================
