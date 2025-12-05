-- =====================================================
-- COMPLETE DATABASE RESET AND RECREATION
-- =====================================================
-- WARNING: This will DELETE ALL DATA and recreate everything
-- Only use this for development/testing!
-- =====================================================

-- =====================================================
-- STEP 1: DROP EVERYTHING (in correct order)
-- =====================================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sync_admin_metadata ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_billing ON public.billing_profiles;
DROP TRIGGER IF EXISTS set_updated_at_credits ON public.credit_accounts;
DROP TRIGGER IF EXISTS trigger_notify_admins_new_job ON public.enrich_jobs;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_admin_to_auth() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.notify_admins_new_job() CASCADE;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.enrich_jobs CASCADE;
DROP TABLE IF EXISTS public.credit_packs CASCADE;
DROP TABLE IF EXISTS public.billing_profiles CASCADE;
DROP TABLE IF EXISTS public.credit_accounts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- STEP 2: CREATE TABLES
-- =====================================================

-- Profiles table
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing profiles table
CREATE TABLE public.billing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  vat_number TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_postal_code TEXT,
  billing_country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit accounts table
CREATE TABLE public.credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit packs table
CREATE TABLE public.credit_packs (
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

-- Credit transactions table
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id UUID NOT NULL REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'enrich_deduction', 'refund', 'admin_adjustment')),
  description TEXT,
  related_job_id UUID,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrich jobs table
CREATE TABLE public.enrich_jobs (
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- STEP 3: CREATE INDEXES
-- =====================================================

CREATE INDEX idx_profiles_admin ON public.profiles(is_admin) WHERE is_admin = TRUE;
CREATE INDEX idx_credit_accounts_user ON public.credit_accounts(user_id);
CREATE INDEX idx_enrich_jobs_user ON public.enrich_jobs(user_id);
CREATE INDEX idx_enrich_jobs_status ON public.enrich_jobs(status);
CREATE INDEX idx_enrich_jobs_created ON public.enrich_jobs(created_at DESC);
CREATE INDEX idx_credit_transactions_account ON public.credit_transactions(credit_account_id);
CREATE INDEX idx_credit_transactions_created ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_billing_profiles_user ON public.billing_profiles(user_id);

-- =====================================================
-- STEP 4: ENABLE RLS
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrich_jobs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES - PROFILES
-- =====================================================

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- =====================================================
-- STEP 6: CREATE RLS POLICIES - BILLING PROFILES
-- =====================================================

CREATE POLICY "Users can create own billing profile"
  ON public.billing_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own billing profile"
  ON public.billing_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own billing profile"
  ON public.billing_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all billing profiles"
  ON public.billing_profiles FOR SELECT
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- =====================================================
-- STEP 7: CREATE RLS POLICIES - CREDIT ACCOUNTS
-- =====================================================

CREATE POLICY "Users can view own credit account"
  ON public.credit_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit accounts"
  ON public.credit_accounts FOR SELECT
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "Admins can update all credit accounts"
  ON public.credit_accounts FOR UPDATE
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- =====================================================
-- STEP 8: CREATE RLS POLICIES - CREDIT PACKS
-- =====================================================

CREATE POLICY "Anyone can view active credit packs"
  ON public.credit_packs FOR SELECT
  USING (is_active = true);

-- =====================================================
-- STEP 9: CREATE RLS POLICIES - CREDIT TRANSACTIONS
-- =====================================================

CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_accounts
      WHERE id = credit_account_id AND user_id = auth.uid()
    )
  );

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

-- =====================================================
-- STEP 10: CREATE RLS POLICIES - ENRICH JOBS
-- =====================================================

CREATE POLICY "Users can view own jobs"
  ON public.enrich_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON public.enrich_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all jobs"
  ON public.enrich_jobs FOR SELECT
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

CREATE POLICY "Admins can update all jobs"
  ON public.enrich_jobs FOR UPDATE
  TO authenticated
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- =====================================================
-- STEP 11: CREATE FUNCTIONS
-- =====================================================

-- Function: Auto-create profile and credit account on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    FALSE
  )
  ON CONFLICT (user_id) DO NOTHING;

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

-- Function: Sync admin status to JWT metadata
CREATE OR REPLACE FUNCTION public.sync_admin_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('is_admin', NEW.is_admin)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-update timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 12: CREATE TRIGGERS
-- =====================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER sync_admin_metadata
  AFTER INSERT OR UPDATE OF is_admin ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_admin_to_auth();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_billing
  BEFORE UPDATE ON public.billing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_credits
  BEFORE UPDATE ON public.credit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- STEP 13: INSERT DEFAULT DATA - CREDIT PACKS
-- =====================================================

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

-- =====================================================
-- STEP 14: GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.credit_packs TO anon;

-- =====================================================
-- DONE!
-- =====================================================
