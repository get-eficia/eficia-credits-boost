-- Script de diagnostic pour les politiques Storage

-- 1. Vérifier si le bucket existe et ses propriétés
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'enrich-uploads';

-- 2. Vérifier toutes les politiques existantes sur storage.objects
SELECT
  policyname,
  roles,
  cmd,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 3. Vérifier si RLS est activé sur storage.objects
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 4. Supprimer TOUTES les politiques existantes sur storage.objects pour le bucket enrich-uploads
-- (pour repartir de zéro)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- 5. Créer les politiques minimales (comme dans votre base fonctionnelle probablement)

-- Politique ultra-permissive pour authenticated users (temporaire pour debug)
CREATE POLICY "authenticated_all_access"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'enrich-uploads')
WITH CHECK (bucket_id = 'enrich-uploads');

-- Vérifier que la politique est créée
SELECT
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';
