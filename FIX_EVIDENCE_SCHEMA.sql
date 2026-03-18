-- =============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Enhances the incident_evidence table with new columns
-- =============================================================

-- Add description column for evidence annotations
ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS description TEXT;

-- Add primary flag to mark the main evidence
ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Add sort order for manual ordering
ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Add thumbnail URL for video/document previews
ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add verification fields for officers
ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE incident_evidence ADD COLUMN IF NOT EXISTS verification_note TEXT;

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON incident_evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_evidence_category ON incident_evidence(category);
CREATE INDEX IF NOT EXISTS idx_evidence_is_primary ON incident_evidence(incident_id, is_primary) WHERE is_primary = true;

-- Update the storage bucket to enforce file size and type limits
UPDATE storage.buckets SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp',
    'application/pdf',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'
  ]
WHERE id = 'incident-evidence';

-- Officer evidence access: view evidence for assigned incidents
DO $$ BEGIN
  CREATE POLICY "officer_assigned_evidence_select" ON incident_evidence FOR SELECT TO authenticated
  USING (
    incident_id IN (SELECT id FROM incidents WHERE assigned_officer_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Officer evidence access: verify/update evidence  
DO $$ BEGIN
  CREATE POLICY "officer_verify_evidence" ON incident_evidence FOR UPDATE TO authenticated
  USING (
    incident_id IN (SELECT id FROM incidents WHERE assigned_officer_id = auth.uid())
  )
  WITH CHECK (
    incident_id IN (SELECT id FROM incidents WHERE assigned_officer_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

SELECT 'Evidence schema enhanced successfully!' AS result;
