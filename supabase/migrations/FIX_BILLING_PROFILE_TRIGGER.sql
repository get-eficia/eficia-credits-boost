-- =====================================================
-- FIX: CREATE BILLING PROFILE VIA TRIGGER
-- =====================================================
-- The issue is that after signUp(), there's no active session
-- when email confirmation is required.
-- Solution: Create billing_profile in the database trigger
-- using SECURITY DEFINER to bypass RLS.
-- =====================================================

-- Drop and recreate the handle_new_user function to also create billing_profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, first_name, last_name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    FALSE
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create credit account
  INSERT INTO public.credit_accounts (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create empty billing profile (will be updated later by user)
  INSERT INTO public.billing_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONE!
-- =====================================================
-- Now the billing_profile is created automatically
-- when a user signs up, bypassing RLS with SECURITY DEFINER
-- =====================================================
