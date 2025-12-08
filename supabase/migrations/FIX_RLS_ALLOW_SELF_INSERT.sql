-- =====================================================
-- FIX RLS: ALLOW USERS TO INSERT THEIR OWN PROFILE
-- =====================================================
-- Problem: Users can't create their own profile/credit_account rows
-- during signup because RLS blocks INSERT operations
-- Solution: Add policies to allow self-INSERT
-- =====================================================

-- Drop existing INSERT policies if they exist
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own credit account" ON public.credit_accounts;

-- Allow users to INSERT their own profile
CREATE POLICY "Users can create own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to INSERT their own credit account
CREATE POLICY "Users can create own credit account"
  ON public.credit_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- DONE!
-- =====================================================
-- Now users can create their own profile and credit_account
-- during signup without being blocked by RLS
-- =====================================================
