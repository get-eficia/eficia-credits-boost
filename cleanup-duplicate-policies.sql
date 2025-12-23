-- Nettoyage des politiques en double et optimisation
-- Garde seulement les politiques nécessaires et bien nommées

-- ============================================
-- 1. CREDIT_PACKS - OK, pas de doublons
-- ============================================
-- ✅ Déjà bon:
-- - public_read_active_credit_packs (anon, authenticated, SELECT)
-- - service_role_all_credit_packs (service_role, ALL)

-- ============================================
-- 2. CREDIT_TRANSACTIONS - Nettoyer les doublons
-- ============================================

-- Supprimer les anciennes politiques (doublons)
DROP POLICY IF EXISTS "Admins can insert transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON credit_transactions;

-- Garder seulement:
-- ✅ users_view_own_transactions (authenticated, SELECT - own data)
-- ✅ admins_view_all_transactions (authenticated, SELECT - all data)
-- ✅ service_role_all_transactions (service_role, ALL)

-- Ajouter la politique manquante pour que les admins puissent insérer
DROP POLICY IF EXISTS "admins_insert_transactions" ON credit_transactions;
CREATE POLICY "admins_insert_transactions"
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

-- Ajouter la politique pour que les admins puissent updater
DROP POLICY IF EXISTS "admins_update_transactions" ON credit_transactions;
CREATE POLICY "admins_update_transactions"
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
-- 3. ENRICH_JOBS - Nettoyer les doublons
-- ============================================

-- Supprimer les anciennes politiques (doublons)
DROP POLICY IF EXISTS "Users can create own jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "Admins can view all jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "Users can view own jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "Admins can update all jobs" ON enrich_jobs;

-- Garder seulement:
-- ✅ users_create_own_jobs (authenticated, INSERT)
-- ✅ users_view_own_jobs (authenticated, SELECT - own data)
-- ✅ admins_view_all_jobs (authenticated, SELECT - all data)
-- ✅ users_update_own_jobs (authenticated, UPDATE - own data)
-- ✅ admins_update_all_jobs (authenticated, UPDATE - all data)
-- ✅ service_role_all_jobs (service_role, ALL)

-- ============================================
-- 4. PROFILES - Déjà propre, mais on peut simplifier
-- ============================================

-- Les politiques existantes sont bonnes, on les garde:
-- ✅ Users can create own profile (authenticated, INSERT)
-- ✅ Users can view own profile (authenticated, SELECT)
-- ✅ Admins can view all profiles (authenticated, SELECT)
-- ✅ Admins can update any profile (authenticated, UPDATE)
-- ✅ Users can update own profile (authenticated, UPDATE)
-- ✅ Service role can insert profiles (service_role, INSERT)
-- ✅ Service role can select profiles (service_role, SELECT)
-- ✅ Service role can update profiles (service_role, UPDATE)

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

-- Compter les politiques par table
SELECT
  tablename,
  COUNT(*) as nombre_de_politiques
FROM pg_policies
WHERE tablename IN ('credit_packs', 'profiles', 'enrich_jobs', 'credit_transactions')
GROUP BY tablename
ORDER BY tablename;

-- Afficher toutes les politiques restantes (propre)
SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('credit_packs', 'profiles', 'enrich_jobs', 'credit_transactions')
ORDER BY tablename, roles, cmd;
