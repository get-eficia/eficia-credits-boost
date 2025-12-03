-- =====================================================
-- EFICIA CREDITS BOOST - DATABASE SETUP
-- =====================================================
-- This migration creates the necessary tables and triggers
-- to automatically create user profiles and credit accounts
-- when a new user signs up.
--
-- Execute this in Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste & Run
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
-- Stores user profile information
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- =====================================================
-- 2. BILLING PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.billing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  vat_number TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_postal_code TEXT,
  billing_country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own billing profile"
  ON public.billing_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all billing profiles"
  ON public.billing_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- =====================================================
-- 3. CREDIT ACCOUNTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit account"
  ON public.credit_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit accounts"
  ON public.credit_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update all credit accounts"
  ON public.credit_accounts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- =====================================================
-- 4. CREDIT PACKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  price_per_credit DECIMAL(10,4) NOT NULL,
  is_popular BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packs"
  ON public.credit_packs FOR SELECT
  USING (is_active = TRUE);

-- =====================================================
-- 5. CREDIT TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id UUID NOT NULL REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'enrich_deduction', 'refund', 'adjustment')),
  description TEXT,
  related_job_id UUID,
  related_pack_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_accounts
      WHERE id = credit_account_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can view all transactions"
  ON public.credit_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- =====================================================
-- 6. ENRICH JOBS TABLE
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
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.enrich_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs"
  ON public.enrich_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs"
  ON public.enrich_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all jobs"
  ON public.enrich_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update all jobs"
  ON public.enrich_jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- =====================================================
-- 7. TRIGGER FUNCTION: Auto-create profile on signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile (with error handling)
  INSERT INTO public.profiles (user_id, email, first_name, last_name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    FALSE
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create credit account with 0 balance (with error handling)
  INSERT INTO public.credit_accounts (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 8. TRIGGER FUNCTION: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profiles
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Apply to billing_profiles
DROP TRIGGER IF EXISTS set_updated_at_billing ON public.billing_profiles;
CREATE TRIGGER set_updated_at_billing
  BEFORE UPDATE ON public.billing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Apply to credit_accounts
DROP TRIGGER IF EXISTS set_updated_at_credits ON public.credit_accounts;
CREATE TRIGGER set_updated_at_credits
  BEFORE UPDATE ON public.credit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 9. INSERT DEFAULT CREDIT PACKS
-- =====================================================
-- Note: Use UPSERT pattern to avoid errors on re-run
-- Base price: 0.29€/number with degressive pricing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.credit_packs LIMIT 1) THEN
    INSERT INTO public.credit_packs (name, credits, price, price_per_credit, is_popular, features)
    VALUES
      ('Starter', 50, 14.50, 0.2900, false, ARRAY['50 phone numbers', 'Basic support', 'No expiration', '0.29€ per number']),
      ('Mini', 100, 27.00, 0.2700, false, ARRAY['100 phone numbers', 'Email support', 'No expiration', '0.27€ per number', 'Save 7%']),
      ('Basic', 200, 50.00, 0.2500, false, ARRAY['200 phone numbers', 'Email support', 'No expiration', '0.25€ per number', 'Save 14%']),
      ('Professional', 500, 110.00, 0.2200, true, ARRAY['500 phone numbers', 'Priority support', 'No expiration', '0.22€ per number', 'Save 24%']),
      ('Business', 1000, 190.00, 0.1900, false, ARRAY['1000 phone numbers', 'Priority support', 'No expiration', '0.19€ per number', 'Save 34%']),
      ('Premium', 2500, 400.00, 0.1600, false, ARRAY['2500 phone numbers', 'Premium support', 'No expiration', '0.16€ per number', 'Save 45%']),
      ('Enterprise', 5000, 700.00, 0.1400, false, ARRAY['5000 phone numbers', 'Dedicated support', 'No expiration', '0.14€ per number', 'Save 52%']),
      ('Corporate', 10000, 1200.00, 0.1200, false, ARRAY['10000 phone numbers', 'Dedicated support', 'Custom SLA', 'No expiration', '0.12€ per number', 'Save 59%']);
  END IF;
END $$;

-- =====================================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
-- Index on profiles for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON public.profiles(is_admin) WHERE is_admin = TRUE;

-- Index on credit_accounts for user lookups
CREATE INDEX IF NOT EXISTS idx_credit_accounts_user ON public.credit_accounts(user_id);

-- Index on enrich_jobs for user and status queries
CREATE INDEX IF NOT EXISTS idx_enrich_jobs_user ON public.enrich_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_enrich_jobs_status ON public.enrich_jobs(status);
CREATE INDEX IF NOT EXISTS idx_enrich_jobs_created ON public.enrich_jobs(created_at DESC);

-- Index on credit_transactions for account lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_account ON public.credit_transactions(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON public.credit_transactions(created_at DESC);

-- Index on billing_profiles for user lookups
CREATE INDEX IF NOT EXISTS idx_billing_profiles_user ON public.billing_profiles(user_id);

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.credit_packs TO anon;

-- =====================================================
-- DONE!
-- =====================================================
-- Your database is now configured.
-- Users will automatically get a profile and credit account
-- when they sign up through Supabase Auth.
-- =====================================================
