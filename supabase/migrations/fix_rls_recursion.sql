-- =====================================================
-- FIX RLS RECURSION ERROR
-- =====================================================
-- This migration fixes the "infinite recursion detected in policy"
-- error by using auth metadata instead of profiles table lookup
-- =====================================================

-- =====================================================
-- 1. DROP PROBLEMATIC POLICIES
-- =====================================================

-- Drop all admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all billing profiles" ON public.billing_profiles;
DROP POLICY IF EXISTS "Admins can view all credit accounts" ON public.credit_accounts;
DROP POLICY IF EXISTS "Admins can update all credit accounts" ON public.credit_accounts;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.enrich_jobs;
DROP POLICY IF EXISTS "Admins can update all jobs" ON public.enrich_jobs;

-- =====================================================
-- 2. ADD is_admin TO auth.users METADATA ON PROFILE UPDATE
-- =====================================================

-- Function to sync is_admin to auth metadata
CREATE OR REPLACE FUNCTION public.sync_admin_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users metadata when is_admin changes
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('is_admin', NEW.is_admin)
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to keep auth metadata in sync
DROP TRIGGER IF EXISTS sync_admin_metadata ON public.profiles;
CREATE TRIGGER sync_admin_metadata
  AFTER INSERT OR UPDATE OF is_admin ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_admin_to_auth();

-- =====================================================
-- 3. RECREATE POLICIES USING auth.jwt() INSTEAD OF PROFILES TABLE
-- =====================================================

-- Profiles: Admins can view all
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- Billing Profiles: Admins can view all
CREATE POLICY "Admins can view all billing profiles"
  ON public.billing_profiles FOR SELECT
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- Credit Accounts: Admins can view all
CREATE POLICY "Admins can view all credit accounts"
  ON public.credit_accounts FOR SELECT
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- Credit Accounts: Admins can update all
CREATE POLICY "Admins can update all credit accounts"
  ON public.credit_accounts FOR UPDATE
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- Credit Transactions: Admins can insert
CREATE POLICY "Admins can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- Credit Transactions: Admins can view all
CREATE POLICY "Admins can view all transactions"
  ON public.credit_transactions FOR SELECT
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- Enrich Jobs: Admins can view all
CREATE POLICY "Admins can view all jobs"
  ON public.enrich_jobs FOR SELECT
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- Enrich Jobs: Admins can update all
CREATE POLICY "Admins can update all jobs"
  ON public.enrich_jobs FOR UPDATE
  USING (
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
      false
    ) = true
  );

-- =====================================================
-- 4. UPDATE EXISTING ADMIN USERS
-- =====================================================

-- Sync existing admin flags to auth metadata
DO $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN
    SELECT user_id, is_admin FROM public.profiles WHERE is_admin = true
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object('is_admin', true)
    WHERE id = admin_record.user_id;
  END LOOP;
END $$;

-- =====================================================
-- DONE!
-- =====================================================
-- The recursion issue is now fixed.
-- Admin status is stored in auth.jwt() metadata
-- and synced automatically when profiles.is_admin changes.
-- =====================================================
