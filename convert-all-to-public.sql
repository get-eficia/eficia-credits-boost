-- Script pour convertir TOUTES les politiques de 'authenticated' vers 'public'
-- Basé sur les meilleures pratiques de votre base fonctionnelle

-- ============================================
-- 1. CREDIT_PACKS
-- ============================================

DROP POLICY IF EXISTS "public_read_active_credit_packs" ON credit_packs;
DROP POLICY IF EXISTS "Anyone can view active credit packs" ON credit_packs;

CREATE POLICY "Anyone can view active credit packs"
ON credit_packs
FOR SELECT
TO public
USING (is_active = true);

-- Service role n'a pas besoin de politique (contourne RLS)
DROP POLICY IF EXISTS "service_role_all_credit_packs" ON credit_packs;

-- ============================================
-- 2. PROFILES
-- ============================================

-- Users peuvent créer leur propre profil
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
CREATE POLICY "Users can create own profile"
ON profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Users peuvent voir leur propre profil
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO public
USING (auth.uid() = user_id);

-- Users peuvent modifier leur propre profil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins peuvent voir tous les profils
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_admin = true
  )
);

-- Admins peuvent modifier tous les profils
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_admin = true
  )
);

-- Supprimer les politiques service_role (redondantes)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can select profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON profiles;

-- ============================================
-- 3. ENRICH_JOBS
-- ============================================

-- Users peuvent créer leurs propres jobs
DROP POLICY IF EXISTS "Users can create own jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "users_create_own_jobs" ON enrich_jobs;
CREATE POLICY "Users can create own jobs"
ON enrich_jobs
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Users peuvent voir leurs propres jobs
DROP POLICY IF EXISTS "Users can view own jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "users_view_own_jobs" ON enrich_jobs;
CREATE POLICY "Users can view own jobs"
ON enrich_jobs
FOR SELECT
TO public
USING (auth.uid() = user_id);

-- Admins peuvent voir tous les jobs
DROP POLICY IF EXISTS "Admins can view all jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "admins_view_all_jobs" ON enrich_jobs;
CREATE POLICY "Admins can view all jobs"
ON enrich_jobs
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Admins peuvent modifier tous les jobs
DROP POLICY IF EXISTS "Admins can update all jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "admins_update_all_jobs" ON enrich_jobs;
CREATE POLICY "Admins can update all jobs"
ON enrich_jobs
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Supprimer les politiques redondantes
DROP POLICY IF EXISTS "users_update_own_jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "service_role_all_jobs" ON enrich_jobs;

-- ============================================
-- 4. CREDIT_TRANSACTIONS
-- ============================================

-- Users peuvent voir leurs propres transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "users_view_own_transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions"
ON credit_transactions
FOR SELECT
TO public
USING (auth.uid() = user_id);

-- Admins peuvent voir toutes les transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "admins_view_all_transactions" ON credit_transactions;
CREATE POLICY "Admins can view all transactions"
ON credit_transactions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Admins peuvent insérer des transactions
DROP POLICY IF EXISTS "Admins can insert transactions" ON credit_transactions;
DROP POLICY IF EXISTS "admins_insert_transactions" ON credit_transactions;
CREATE POLICY "Admins can insert transactions"
ON credit_transactions
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Admins peuvent modifier des transactions
DROP POLICY IF EXISTS "Admins can update transactions" ON credit_transactions;
DROP POLICY IF EXISTS "admins_update_transactions" ON credit_transactions;
CREATE POLICY "Admins can update transactions"
ON credit_transactions
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Supprimer les politiques service_role (redondantes)
DROP POLICY IF EXISTS "service_role_all_transactions" ON credit_transactions;

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

-- Compter les politiques par table (devrait être: credit_packs=1, profiles=5, enrich_jobs=4, credit_transactions=4)
SELECT
  tablename,
  COUNT(*) as nombre_de_politiques
FROM pg_policies
WHERE tablename IN ('credit_packs', 'profiles', 'enrich_jobs', 'credit_transactions')
GROUP BY tablename
ORDER BY tablename;

-- Afficher toutes les politiques (toutes devraient avoir roles={public})
SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('credit_packs', 'profiles', 'enrich_jobs', 'credit_transactions')
ORDER BY tablename, cmd, policyname;

-- Afficher les politiques Storage (devraient toutes être {public})
SELECT
  'storage.objects' as tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
