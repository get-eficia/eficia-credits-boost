-- Script pour sécuriser les politiques RLS sur toutes les tables
-- Les GRANT donnent les permissions de base, mais les politiques RLS contrôlent l'accès réel

-- ============================================
-- 1. CREDIT_PACKS - Lecture seule publique
-- ============================================

-- Supprimer les anciennes politiques si nécessaire
DROP POLICY IF EXISTS "Anyone can view active credit packs" ON credit_packs;
DROP POLICY IF EXISTS "public_read_credit_packs" ON credit_packs;

-- Activer RLS
ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;

-- Lecture publique des packs actifs uniquement
CREATE POLICY "public_read_active_credit_packs"
ON credit_packs
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Service role peut tout faire (pour admin)
CREATE POLICY "service_role_all_credit_packs"
ON credit_packs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- 2. PROFILES - Chaque user voit/modifie son profil
-- ============================================

-- Les politiques existent déjà, vérifions qu'elles sont complètes

-- Activer RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Note: Vos politiques existantes sont déjà bonnes:
-- - Users can view own profile (authenticated, SELECT)
-- - Users can create own profile (authenticated, INSERT)
-- - Users can update own profile (authenticated, UPDATE)
-- - Admins can view all profiles (authenticated admin, SELECT)
-- - Admins can update any profile (authenticated admin, UPDATE)
-- - Service role can insert/select/update profiles (service_role)

-- ============================================
-- 3. ENRICH_JOBS - Users voient leurs propres jobs
-- ============================================

ALTER TABLE enrich_jobs ENABLE ROW LEVEL SECURITY;

-- Users peuvent voir leurs propres jobs
DROP POLICY IF EXISTS "users_view_own_jobs" ON enrich_jobs;
CREATE POLICY "users_view_own_jobs"
ON enrich_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users peuvent créer leurs propres jobs
DROP POLICY IF EXISTS "users_create_own_jobs" ON enrich_jobs;
CREATE POLICY "users_create_own_jobs"
ON enrich_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users peuvent updater leurs propres jobs (par ex. pour annuler)
DROP POLICY IF EXISTS "users_update_own_jobs" ON enrich_jobs;
CREATE POLICY "users_update_own_jobs"
ON enrich_jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins peuvent voir tous les jobs
DROP POLICY IF EXISTS "admins_view_all_jobs" ON enrich_jobs;
CREATE POLICY "admins_view_all_jobs"
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

-- Admins peuvent modifier tous les jobs
DROP POLICY IF EXISTS "admins_update_all_jobs" ON enrich_jobs;
CREATE POLICY "admins_update_all_jobs"
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

-- Service role peut tout faire
DROP POLICY IF EXISTS "service_role_all_jobs" ON enrich_jobs;
CREATE POLICY "service_role_all_jobs"
ON enrich_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- 4. CREDIT_TRANSACTIONS - Users voient leur historique
-- ============================================

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users peuvent voir leurs propres transactions
DROP POLICY IF EXISTS "users_view_own_transactions" ON credit_transactions;
CREATE POLICY "users_view_own_transactions"
ON credit_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins peuvent voir toutes les transactions
DROP POLICY IF EXISTS "admins_view_all_transactions" ON credit_transactions;
CREATE POLICY "admins_view_all_transactions"
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

-- Seul le service_role peut insérer/modifier des transactions (via Edge Functions)
DROP POLICY IF EXISTS "service_role_all_transactions" ON credit_transactions;
CREATE POLICY "service_role_all_transactions"
ON credit_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

-- Vérifier que RLS est activé partout
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('credit_packs', 'profiles', 'enrich_jobs', 'credit_transactions')
ORDER BY tablename;

-- Voir toutes les politiques
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  CASE
    WHEN qual IS NOT NULL THEN 'USING clause présente'
    ELSE 'Pas de USING'
  END as using_check,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK présent'
    ELSE 'Pas de WITH CHECK'
  END as with_check_check
FROM pg_policies
WHERE tablename IN ('credit_packs', 'profiles', 'enrich_jobs', 'credit_transactions')
ORDER BY tablename, roles, cmd;
