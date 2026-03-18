-- ── New enums ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE blood_group AS ENUM (
    'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE officer_approval_status AS ENUM (
    'pending_admin_approval',
    'under_verification',
    'approved',
    'rejected',
    'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE officer_specialization AS ENUM (
    'traffic', 'crime', 'cyber_cell', 'women_safety',
    'anti_narcotics', 'general_duty', 'armed_reserve', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE id_proof_type_ext AS ENUM (
    'aadhaar', 'pan', 'driving_licence', 'passport', 'employee_id'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE emergency_relation AS ENUM (
    'spouse', 'parent', 'sibling', 'child', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'id_proof', 'appointment_letter', 'service_certificate',
    'transfer_order', 'photo_in_uniform', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Extend profiles table ─────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email               TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth       DATE,
  ADD COLUMN IF NOT EXISTS blood_group         blood_group DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS father_husband_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_name         TEXT,
  ADD COLUMN IF NOT EXISTS official_email      TEXT,
  ADD COLUMN IF NOT EXISTS id_proof_verified   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active           BOOLEAN DEFAULT TRUE; -- Added missing column

-- ── Extend officer_profiles table ────────────────────────────────────────────

ALTER TABLE officer_profiles
  ADD COLUMN IF NOT EXISTS employee_id          TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS joining_date         DATE,
  ADD COLUMN IF NOT EXISTS department           TEXT DEFAULT 'Madhya Pradesh Police',
  ADD COLUMN IF NOT EXISTS specialization       officer_specialization DEFAULT 'general_duty',
  ADD COLUMN IF NOT EXISTS previous_station_id  UUID REFERENCES stations(id),
  ADD COLUMN IF NOT EXISTS approval_status      officer_approval_status
                                                  DEFAULT 'pending_admin_approval',
  ADD COLUMN IF NOT EXISTS approved_by          UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason     TEXT,
  ADD COLUMN IF NOT EXISTS suspension_reason    TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_path   TEXT,  -- Supabase Storage path
  ADD COLUMN IF NOT EXISTS registration_ip      INET,
  ADD COLUMN IF NOT EXISTS registration_device  TEXT,
  ADD COLUMN IF NOT EXISTS last_verification_at TIMESTAMPTZ;

-- ── Officer Profiles RLS ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "Allow users to register their own officer profile"
  ON officer_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow users to view their own officer profile"
  ON officer_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Officer emergency contacts ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS officer_emergency_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id      UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  contact_name    TEXT NOT NULL,
  relationship    emergency_relation NOT NULL,
  mobile          TEXT NOT NULL,
  alt_mobile      TEXT,
  address         TEXT
);

ALTER TABLE officer_emergency_contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "officer_own_emergency_contact"
  ON officer_emergency_contacts FOR ALL TO authenticated
  USING (officer_id = auth.uid())
  WITH CHECK (officer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Officer documents ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS officer_uploaded_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  doc_type        document_type NOT NULL,
  storage_path    TEXT NOT NULL,        -- officer-documents/{officer_id}/{uuid}.pdf
  file_name       TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  verified_by     UUID REFERENCES profiles(id),
  verified_at     TIMESTAMPTZ,
  rejection_note  TEXT
);

ALTER TABLE officer_uploaded_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "officer_own_documents"
  ON officer_uploaded_documents FOR ALL TO authenticated
  USING (officer_id = auth.uid())
  WITH CHECK (officer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_officer_docs_officer  ON officer_uploaded_documents(officer_id);
CREATE INDEX IF NOT EXISTS idx_officer_docs_type     ON officer_uploaded_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_officer_approval      ON officer_profiles(approval_status);

-- ── Approval audit log ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS officer_approval_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id      UUID NOT NULL REFERENCES profiles(id),
  action_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_by       UUID REFERENCES profiles(id),

  action          TEXT NOT NULL,
  note            TEXT,
  previous_status officer_approval_status,
  new_status      officer_approval_status
);

ALTER TABLE officer_approval_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "officer_read_own_log"
  ON officer_approval_log FOR SELECT TO authenticated
  USING (officer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_approval_log_officer ON officer_approval_log(officer_id);
CREATE INDEX IF NOT EXISTS idx_approval_log_status  ON officer_approval_log(action);

-- ── Triggers ──────────────────────────────────────────────────────────────────

-- Keep officer account inactive until approved
CREATE OR REPLACE FUNCTION enforce_officer_inactive_until_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- When a new officer_profile is created, set parent profile to inactive if role is officer
  UPDATE profiles
  SET is_active = FALSE
  WHERE id = NEW.id
  AND role IN ('constable','si','sho','dsp');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_officer_profile_created_deactivate ON officer_profiles;
CREATE TRIGGER on_officer_profile_created_deactivate
  AFTER INSERT ON officer_profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_officer_inactive_until_approved();

-- When approved, activate the profile
CREATE OR REPLACE FUNCTION activate_officer_on_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    UPDATE profiles SET is_active = TRUE WHERE id = NEW.id;

    -- Log the approval
    INSERT INTO officer_approval_log (
      officer_id, action_by, action, previous_status, new_status, note
    ) VALUES (
      NEW.id, NEW.approved_by,
      'approved', OLD.approval_status, 'approved',
      'Account approved and activated'
    );
  END IF;

  IF NEW.approval_status = 'rejected' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'rejected') THEN
    INSERT INTO officer_approval_log (
      officer_id, action, previous_status, new_status, note
    ) VALUES (
      NEW.id, 'rejected',
      OLD.approval_status, 'rejected',
      NEW.rejection_reason
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_officer_approval_status_change ON officer_profiles;
CREATE TRIGGER on_officer_approval_status_change
  AFTER UPDATE OF approval_status ON officer_profiles
  FOR EACH ROW EXECUTE FUNCTION activate_officer_on_approval();

-- Storage Buckets (Policies)
-- Note: Bucket creation itself usually requires administrative permissions or API call
-- These policies assume a bucket named 'officer-documents' exists.

DO $$ BEGIN
  CREATE POLICY "officer_upload_own_docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'officer-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "officer_read_own_docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'officer-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
