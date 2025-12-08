-- =====================================================
-- MERGE billing_profiles INTO profiles
-- =====================================================
-- Reason: No benefit to separation, only causes RLS issues
-- Solution: Add billing columns directly to profiles table
-- =====================================================

-- Step 1: Add billing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS vat_number TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT;

-- Step 2: Migrate existing data from billing_profiles to profiles (if any)
UPDATE public.profiles p
SET
  company_name = bp.company_name,
  vat_number = bp.vat_number,
  billing_address = bp.billing_address,
  billing_city = bp.billing_city,
  billing_postal_code = bp.billing_postal_code,
  billing_country = bp.billing_country
FROM public.billing_profiles bp
WHERE p.user_id = bp.user_id;

-- Step 3: Drop the billing_profiles table
DROP TABLE IF EXISTS public.billing_profiles CASCADE;

-- Step 4: Update the handle_new_user trigger to NOT create billing_profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile with billing fields ready (all NULL by default)
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
-- Now profiles table contains all user data including billing
-- No more RLS conflicts, simpler schema, easier queries
-- =====================================================
