-- Script FINAL pour les politiques Storage basé sur la base fonctionnelle
-- Utilise 'public' au lieu de 'authenticated' et auth.uid()::text

-- 1. Supprimer TOUTES les politiques existantes sur storage.objects
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

-- 2. Créer les politiques EXACTEMENT comme dans la base fonctionnelle

-- Users peuvent lire leurs propres fichiers
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'enrich-uploads'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Users peuvent uploader dans leur propre dossier
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'enrich-uploads'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Politique alternative pour SELECT (authenticated role check)
CREATE POLICY "storage_select_own_enrich_uploads"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'enrich-uploads'
  AND auth.role() = 'authenticated'
);

-- Politique alternative pour INSERT (authenticated role check)
CREATE POLICY "storage_upload_enrich_uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'enrich-uploads'
  AND auth.role() = 'authenticated'
);

-- 3. Vérifier que les politiques sont créées
SELECT
  policyname,
  roles,
  cmd,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING'
    ELSE 'No USING'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK'
    ELSE 'No WITH CHECK'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
