-- =====================================================
-- FIX BILLING PROFILE RLS POLICY
-- =====================================================
-- This migration fixes the RLS policy that prevents users
-- from creating their own billing profile during signup
-- =====================================================

-- =====================================================
-- 1. DROP EXISTING POLICY
-- =====================================================

DROP POLICY IF EXISTS "Users can manage their own billing profile" ON public.billing_profiles;

-- =====================================================
-- 2. CREATE SEPARATE POLICIES FOR EACH OPERATION
-- =====================================================

-- Allow users to INSERT their own billing profile
CREATE POLICY "Users can create their own billing profile"
  ON public.billing_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to SELECT their own billing profile
CREATE POLICY "Users can view their own billing profile"
  ON public.billing_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to UPDATE their own billing profile
CREATE POLICY "Users can update their own billing profile"
  ON public.billing_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own billing profile
CREATE POLICY "Users can delete their own billing profile"
  ON public.billing_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. KEEP ADMIN POLICIES (already using JWT metadata)
-- =====================================================

-- Admin policy should already exist from fix_rls_recursion.sql
-- If not, create it:

DROP POLICY IF EXISTS "Admins can view all billing profiles" ON public.billing_profiles;

CREATE POLICY "Admins can view all billing profiles"
  ON public.billing_profiles FOR SELECT
  USING (
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
-- DONE!
-- =====================================================
-- Users can now create their billing profile during signup
-- =====================================================
