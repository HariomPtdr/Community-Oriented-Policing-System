-- =============================================
-- 022_storage_revisions.sql — Storage Bucket Fixes & Security Tightening
-- =============================================

BEGIN;

-- 1. Create missing 'fir-documents' bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fir-documents', 
  'fir-documents', 
  false, 
  52428800, -- 50MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Update 'incident-evidence' Policies
-- Remove the 'evidence/' folder requirement as components don't use it
-- Link to incidents table for ownership verification
DROP POLICY IF EXISTS "evidence_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "evidence_select_auth" ON storage.objects;
DROP POLICY IF EXISTS "evidence_delete_own" ON storage.objects;

CREATE POLICY "evidence_insert_verified"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'incident-evidence' AND
  EXISTS (
    SELECT 1 FROM incidents 
    WHERE id::text = (storage.foldername(name))[1] 
    AND reporter_id = auth.uid()
  )
);

CREATE POLICY "evidence_select_visibility"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'incident-evidence' AND
  (
    EXISTS (
      SELECT 1 FROM incidents 
      WHERE id::text = (storage.foldername(name))[1] 
      AND reporter_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role != 'citizen'
    )
  )
);

CREATE POLICY "evidence_delete_visibility"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'incident-evidence' AND
  EXISTS (
    SELECT 1 FROM incidents 
    WHERE id::text = (storage.foldername(name))[1] 
    AND reporter_id = auth.uid()
  )
);

-- 3. Update 'lost-found-media' Visibility
-- Change Select to PUBLIC so images show up in listings for everyone
DROP POLICY IF EXISTS "lf_media_select" ON storage.objects;
CREATE POLICY "lf_media_select_public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'lost-found-media');

-- 4. Tighten 'id-proofs' Privacy (CRITICAL)
-- Currently anyone can view all ID proofs. Changing to owner + officers only.
DROP POLICY IF EXISTS "Anyone can view id proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own id proof" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own id proof" ON storage.objects;

CREATE POLICY "id_proof_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'id-proofs' AND 
  (split_part(storage.filename(name), '.', 1)) = auth.uid()::text
);

CREATE POLICY "id_proof_select_restricted"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'id-proofs' AND (
    (split_part(storage.filename(name), '.', 1)) = auth.uid()::text
    OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen')
  )
);

-- 5. Tighten 'avatars' Upload
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  (split_part(storage.filename(name), '.', 1)) = auth.uid()::text
);

-- 6. Add 'fir-documents' Policies
CREATE POLICY "fir_docs_select_restricted"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'fir-documents' AND (
    EXISTS (
      SELECT 1 FROM fir_documents fd
      JOIN incidents i ON fd.incident_id = i.id
      WHERE fd.storage_path = name AND i.reporter_id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen')
  )
);

COMMIT;
