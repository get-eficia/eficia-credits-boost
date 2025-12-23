-- Script pour rendre les politiques RLS identiques à la base fonctionnelle d'origine
-- Supprime les politiques service_role (redondantes) et utilise 'public' au lieu de 'anon, authenticated'

-- ============================================
-- 1. CREDIT_PACKS - Utiliser 'public' au lieu de 'anon, authenticated'
-- ============================================

DROP POLICY IF EXISTS "public_read_active_credit_packs" ON credit_packs;
DROP POLICY IF EXISTS "service_role_all_credit_packs" ON credit_packs;

CREATE POLICY "Anyone can view active credit packs"
ON credit_packs
FOR SELECT
TO public
USING (is_active = true);

-- ============================================
-- 2. CREDIT_TRANSACTIONS - Garder seulement users et admins
-- ============================================

DROP POLICY IF EXISTS "service_role_all_transactions" ON credit_transactions;

-- Renommer pour matcher l'originale
DROP POLICY IF EXISTS "admins_insert_transactions" ON credit_transactions;
DROP POLICY IF EXISTS "admins_view_all_transactions" ON credit_transactions;
DROP POLICY IF EXISTS "users_view_own_transactions" ON credit_transactions;
DROP POLICY IF EXISTS "admins_update_transactions" ON credit_transactions;

CREATE POLICY "Admins can insert transactions"
ON credit_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can view all transactions"
ON credit_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Users can view own transactions"
ON credit_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update transactions"
ON credit_transactions
FOR UPDATE
TO authenticated
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

-- ============================================
-- 3. ENRICH_JOBS - Supprimer users_update_own_jobs
-- ============================================

DROP POLICY IF EXISTS "service_role_all_jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "users_update_own_jobs" ON enrich_jobs;

-- Renommer pour matcher l'originale
DROP POLICY IF EXISTS "users_create_own_jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "users_view_own_jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "admins_view_all_jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "admins_update_all_jobs" ON enrich_jobs;

CREATE POLICY "Users can create own jobs"
ON enrich_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own jobs"
ON enrich_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all jobs"
ON enrich_jobs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update all jobs"
ON enrich_jobs
FOR UPDATE
TO authenticated
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

-- ============================================
-- 4. PROFILES - Supprimer les politiques service_role
-- ============================================

DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can select profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON profiles;

-- Les autres politiques restent (déjà bien nommées):
-- ✅ Users can create own profile
-- ✅ Admins can view all profiles
-- ✅ Users can view own profile
-- ✅ Users can update own profile
-- ✅ Admins can update any profile

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

-- Compter les politiques (devrait matcher la prod: 1, 4, 4, 5)
SELECT
  tablename,
  COUNT(*) as nombre_de_politiques
FROM pg_policies
WHERE tablename IN ('credit_packs', 'profiles', 'enrich_jobs', 'credit_transactions')
GROUP BY tablename
ORDER BY tablename;

-- Afficher toutes les politiques
SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('credit_packs', 'profiles', 'enrich_jobs', 'credit_transactions')
ORDER BY tablename, cmd, policyname;
