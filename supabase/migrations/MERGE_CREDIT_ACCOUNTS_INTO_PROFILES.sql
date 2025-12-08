-- =====================================================
-- MERGE CREDIT ACCOUNTS INTO PROFILES
-- =====================================================
-- This migration merges credit_accounts into profiles table
-- to simplify the schema and avoid unnecessary joins
-- =====================================================

-- Step 1: Add credit_balance column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS credit_balance INTEGER DEFAULT 0 NOT NULL;

-- Step 2: Migrate existing data from credit_accounts to profiles
UPDATE public.profiles p
SET credit_balance = COALESCE(ca.balance, 0)
FROM public.credit_accounts ca
WHERE p.user_id = ca.user_id;

-- Step 3: Update credit_transactions to reference user_id instead of credit_account_id
ALTER TABLE public.credit_transactions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 4: Populate user_id in credit_transactions from credit_accounts
UPDATE public.credit_transactions ct
SET user_id = ca.user_id
FROM public.credit_accounts ca
WHERE ct.credit_account_id = ca.id;

-- Step 5: Make user_id NOT NULL after migration
ALTER TABLE public.credit_transactions
ALTER COLUMN user_id SET NOT NULL;

-- Step 6: Drop the old credit_account_id foreign key constraint first
ALTER TABLE public.credit_transactions
DROP CONSTRAINT IF EXISTS credit_transactions_credit_account_id_fkey;

-- Step 7: Drop credit_accounts table and related objects
DROP TRIGGER IF EXISTS set_updated_at_credits ON public.credit_accounts;
DROP INDEX IF EXISTS idx_credit_accounts_user;
DROP TABLE IF EXISTS public.credit_accounts CASCADE;

-- Step 8: Now we can safely drop the credit_account_id column
ALTER TABLE public.credit_transactions
DROP COLUMN IF EXISTS credit_account_id;

-- Step 9: Create index on user_id for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON public.credit_transactions(user_id);

-- Step 10: Update RLS policies for credit_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.credit_transactions;

CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert transactions"
  ON public.credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "Admins can view all transactions"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- Step 11: Update handle_new_user function to not create credit_accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, is_admin, credit_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    FALSE,
    0
  )
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
