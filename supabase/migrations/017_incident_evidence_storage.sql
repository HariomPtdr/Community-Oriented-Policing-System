-- =============================================
-- 017_incident_evidence_storage.sql
-- Evidence Management System — Storage + Enhanced Schema
-- =============================================

-- ── 1. Create storage bucket ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-evidence',
  'incident-evidence',
  true,
  52428800,  -- 50 MB max per file
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp',
    'application/pdf',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 2. Storage RLS Policies ───────────────────────────────────
-- Drop existing policies to recreate cleanly
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can upload own evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view relevant evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own draft evidence" ON storage.objects;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Upload: authenticated users can upload to the evidence folder
CREATE POLICY "evidence_insert_auth"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'incident-evidence' AND
  (storage.foldername(name))[1] = 'evidence'
);

-- View: any authenticated user can view evidence files
CREATE POLICY "evidence_select_auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'incident-evidence');

-- Delete: only the uploader can delete their evidence
CREATE POLICY "evidence_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'incident-evidence' AND
  owner = auth.uid()::text
);

-- ── 3. Enhanced incident_evidence columns ─────────────────────
-- Add new columns to existing table (safe IF NOT EXISTS approach)

DO $$ BEGIN
  ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS verification_note TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── 4. Extra Indexes ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON incident_evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_evidence_category   ON incident_evidence(category);
CREATE INDEX IF NOT EXISTS idx_evidence_is_primary ON incident_evidence(incident_id, is_primary) WHERE is_primary = true;

-- ── 5. Officer evidence access policy ─────────────────────────
-- Officers assigned to the incident can also view evidence
DO $$ BEGIN
  CREATE POLICY "officer_assigned_evidence_select" ON incident_evidence FOR SELECT TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM incidents WHERE assigned_officer_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Officers can update verification fields
DO $$ BEGIN
  CREATE POLICY "officer_verify_evidence" ON incident_evidence FOR UPDATE TO authenticated
  USING (
    incident_id IN (
      SELECT id FROM incidents WHERE assigned_officer_id = auth.uid()
    )
  )
  WITH CHECK (
    incident_id IN (
      SELECT id FROM incidents WHERE assigned_officer_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
