-- Fix pour la récursion infinie dans les politiques profiles
-- Utilise auth.jwt() au lieu d'interroger la table profiles

-- ============================================
-- PROFILES - Utiliser JWT metadata pour is_admin
-- ============================================

-- Supprimer les politiques qui causent la récursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Recréer avec JWT metadata (pas de récursion)
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Option 1: Utiliser JWT metadata
  COALESCE(
    ((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text)::boolean,
    false
  ) = true
);

CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  COALESCE(
    ((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text)::boolean,
    false
  ) = true
)
WITH CHECK (
  COALESCE(
    ((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text)::boolean,
    false
  ) = true
);

-- ============================================
-- ENRICH_JOBS - Même fix
-- ============================================

DROP POLICY IF EXISTS "Admins can view all jobs" ON enrich_jobs;
DROP POLICY IF EXISTS "Admins can update all jobs" ON enrich_jobs;

CREATE POLICY "Admins can view all jobs"
ON enrich_jobs
FOR SELECT
TO authenticated
USING (
  COALESCE(
    ((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text)::boolean,
    false
  ) = true
);

CREATE POLICY "Admins can update all jobs"
ON enrich_jobs
FOR UPDATE
TO authenticated
USING (
  COALESCE(
    ((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text)::boolean,
    false
  ) = true
)
WITH CHECK (
  COALESCE(
    ((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text)::boolean,
    false
  ) = true
);

-- ============================================
-- CREDIT_TRANSACTIONS - Même fix
-- ============================================

DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON credit_transactions;

CREATE POLICY "Admins can view all transactions"
ON credit_transactions
FOR SELECT
TO authenticated
USING (
  COALESCE(
    ((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text)::boolean,
    false
  ) = true
);

CREATE POLICY "Admins can insert transactions"
ON credit_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  COALESCE(
    ((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text)::boolean,
    false
  ) = true
);

CREATE POLICY "Admins can update transactions"
ON credit_transactions
FOR UPDATE
TO authenticated
USING (
  COALESCE(
    ((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text)::boolean,
    false
  ) = true
)
WITH CHECK (
  COALESCE(
    ((auth.jwt() -> 'app_metadata'::text) ->> 'is_admin'::text)::boolean,
    false
  ) = true
);

-- ============================================
-- IMPORTANT: Mettre is_admin dans les JWT metadata
-- ============================================

-- Pour que ça fonctionne, il faut que is_admin soit dans le JWT
-- Créer un trigger qui met à jour le JWT quand is_admin change

CREATE OR REPLACE FUNCTION public.handle_user_metadata_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour les métadonnées JWT de l'utilisateur
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('is_admin', NEW.is_admin)
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur INSERT et UPDATE de profiles
DROP TRIGGER IF EXISTS on_profile_admin_change ON profiles;
CREATE TRIGGER on_profile_admin_change
  AFTER INSERT OR UPDATE OF is_admin ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_metadata_update();

-- Mettre à jour les JWT de tous les utilisateurs existants
UPDATE auth.users u
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('is_admin', p.is_admin)
FROM profiles p
WHERE u.id = p.user_id;

-- Vérifier les politiques
SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'enrich_jobs', 'credit_transactions')
  AND policyname LIKE '%Admin%'
ORDER BY tablename, policyname;
