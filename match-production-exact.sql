-- Script pour matcher EXACTEMENT la configuration de la base fonctionnelle
-- Mix de {public} et {authenticated} selon les tables

-- ============================================
-- 1. CREDIT_PACKS - {public} pour lecture publique
-- ============================================

DROP POLICY IF EXISTS "public_read_active_credit_packs" ON credit_packs;
DROP POLICY IF EXISTS "Anyone can view active credit packs" ON credit_packs;
DROP POLICY IF EXISTS "service_role_all_credit_packs" ON credit_packs;

CREATE POLICY "Anyone can view active credit packs"
ON credit_packs
FOR SELECT
TO public
USING (is_active = true);

-- ============================================
-- 2. PROFILES - {authenticated} uniquement
-- ============================================

-- Supprimer les politiques service_role (pas dans la prod)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can select profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON profiles;

-- Recréer avec {authenticated}
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
CREATE POLICY "Users can create own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
TO authenticated
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

-- ============================================
-- 3. ENRICH_JOBS - {authenticated} uniquement
-- ============================================

DROP POLICY IF EXISTS "service_role_all_jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "users_update_own_jobs" ON enrich_jobs;

-- Recréer avec {authenticated}
DROP POLICY IF EXISTS "Users can create own jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "users_create_own_jobs" ON enrich_jobs;
CREATE POLICY "Users can create own jobs"
ON enrich_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "users_view_own_jobs" ON enrich_jobs;
CREATE POLICY "Users can view own jobs"
ON enrich_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "admins_view_all_jobs" ON enrich_jobs;
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

DROP POLICY IF EXISTS "Admins can update all jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "admins_update_all_jobs" ON enrich_jobs;
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
-- 4. CREDIT_TRANSACTIONS - {authenticated} uniquement
-- ============================================

DROP POLICY IF EXISTS "service_role_all_transactions" ON credit_transactions;

-- Recréer avec {authenticated}
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "users_view_own_transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions"
ON credit_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "admins_view_all_transactions" ON credit_transactions;
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

DROP POLICY IF EXISTS "Admins can insert transactions" ON credit_transactions;
DROP POLICY IF EXISTS "admins_insert_transactions" ON credit_transactions;
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

DROP POLICY IF EXISTS "Admins can update transactions" ON credit_transactions;
DROP POLICY IF EXISTS "admins_update_transactions" ON credit_transactions;
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
-- 5. STORAGE - {public} (déjà fait, mais pour référence)
-- ============================================

-- Les politiques Storage sont déjà correctes (fix-storage-policies-final.sql)
-- Users can read own files - {public}
-- Users can upload to own folder - {public}
-- storage_select_own_enrich_uploads - {public}
-- storage_upload_enrich_uploads - {public}

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

-- Tables principales (devrait être: 1, 5, 4, 4)
SELECT
  tablename,
  COUNT(*) as nombre_de_politiques
FROM pg_policies
WHERE tablename IN ('credit_packs', 'profiles', 'enrich_jobs', 'credit_transactions')
GROUP BY tablename
ORDER BY tablename;

-- Toutes les politiques avec leurs rôles
SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('credit_packs', 'profiles', 'enrich_jobs', 'credit_transactions')
ORDER BY tablename, cmd, policyname;

-- Politiques Storage (devrait être 4 avec {public})
SELECT
  'storage.objects' as tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
