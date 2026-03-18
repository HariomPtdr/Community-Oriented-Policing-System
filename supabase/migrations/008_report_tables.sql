-- =============================================
-- 008_report_tables.sql — File-a-Report system
-- Complete incident reporting with 5 complaint types
-- =============================================

-- ── New ENUMs ─────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE complaint_type AS ENUM (
    'simple_theft', 'cyber_crime', 'ncr', 'cheating_fraud', 'burglary'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE filing_mode AS ENUM ('self', 'behalf');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE property_type AS ENUM (
    'mobile_phone', 'vehicle', 'cash', 'jewellery',
    'electronics', 'documents', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cyber_crime_type AS ENUM (
    'online_fraud', 'upi_scam', 'credit_debit_fraud',
    'social_media_hack', 'phishing', 'otp_scam',
    'fake_job_scam', 'cyber_bullying', 'identity_theft', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cyber_platform AS ENUM (
    'whatsapp', 'instagram', 'facebook', 'telegram',
    'website', 'phone_call', 'email', 'upi_app', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fraud_type AS ENUM (
    'money_lending_fraud', 'business_fraud', 'property_fraud',
    'online_investment_scam', 'job_offer_scam',
    'fake_company_fraud', 'loan_fraud', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'cash', 'bank_transfer', 'upi', 'cheque',
    'online_payment', 'crypto'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE premises_type AS ENUM (
    'residential_house', 'apartment', 'shop',
    'office', 'warehouse', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE entry_method AS ENUM (
    'door_broken', 'window_broken', 'lock_cut',
    'duplicate_key_suspected', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ncr_type AS ENUM (
    'noise_complaint', 'neighbour_dispute'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE evidence_category AS ENUM (
    'property_photo', 'proof', 'screenshot',
    'transaction_receipt', 'cctv_footage', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add 'draft' and 'rejected' to incident_status if not already there
DO $$ BEGIN
  ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'submitted';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'closed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Extend incidents table ─────────────────────────────────────

-- Filing metadata
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS filing_mode filing_mode DEFAULT 'self';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS behalf_name TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS behalf_relation TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS behalf_contact TEXT;

-- Complaint type & FIR
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS complaint_type complaint_type;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS fir_number TEXT UNIQUE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS io_assigned_id UUID REFERENCES profiles(id);

-- Extended complainant details
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS c_full_name TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS c_father_name TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS c_mother_name TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS c_mobile TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS c_alt_mobile TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS c_email TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS c_gender TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS c_address TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS c_district TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS c_police_station TEXT;

-- Incident location details
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_district TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_police_station TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_state TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_city TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_date DATE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_approx_time TIME;

-- Extended fields
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS detailed_description TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS has_suspect BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS has_proof BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id);

-- AI fields
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ai_priority TEXT CHECK (ai_priority IN ('critical','high','medium','low'));
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ai_categorized_at TIMESTAMPTZ;

-- Signature
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS citizen_signature TEXT;

-- Recovery
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS your_loss_amount NUMERIC(15,2);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS total_estimated_loss NUMERIC(15,2);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS total_recovered_value NUMERIC(15,2);

-- Draft progress
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS current_step SMALLINT DEFAULT 1;

-- ── Type-Specific Detail Tables ────────────────────────────────

-- Simple Theft Details
CREATE TABLE IF NOT EXISTS incident_simple_theft (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  property_type   property_type NOT NULL DEFAULT 'other',
  property_description TEXT,
  property_details JSONB DEFAULT '{}',
  estimated_price NUMERIC(15, 2),
  suspect_name    TEXT,
  suspect_address TEXT,
  suspect_description TEXT,
  suspect_phone   TEXT,
  property_photos TEXT[] DEFAULT '{}',
  proof_files     TEXT[] DEFAULT '{}'
);

-- Cyber Crime Details
CREATE TABLE IF NOT EXISTS incident_cyber_crime (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id         UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  cyber_type          cyber_crime_type NOT NULL DEFAULT 'other',
  platform_used       TEXT[] DEFAULT '{}',
  platform_other_desc TEXT,
  website_url         TEXT,
  amount_lost         NUMERIC(15, 2),
  transaction_id      TEXT,
  upi_id              TEXT,
  ifsc_code           TEXT,
  bank_name           TEXT,
  date_of_transaction DATE,
  suspect_name        TEXT,
  suspect_phone       TEXT,
  suspect_website     TEXT,
  suspect_social_handle TEXT,
  suspect_description TEXT,
  proof_files         TEXT[] DEFAULT '{}'
);

-- Cheating / Fraud Details
CREATE TABLE IF NOT EXISTS incident_cheating_fraud (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id         UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  fraud_type          fraud_type NOT NULL DEFAULT 'other',
  fraud_amount        NUMERIC(15, 2),
  payment_method      TEXT,
  has_transaction     BOOLEAN DEFAULT FALSE,
  transaction_id      TEXT,
  bank_name           TEXT,
  account_number      TEXT,
  ifsc_code           TEXT,
  upi_id              TEXT,
  suspect_name        TEXT,
  suspect_mob         TEXT,
  suspect_address     TEXT,
  suspect_company     TEXT,
  suspect_website     TEXT,
  suspect_bank_acc    TEXT,
  proof_files         TEXT[] DEFAULT '{}'
);

-- Burglary Details
CREATE TABLE IF NOT EXISTS incident_burglary (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id           UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  premises_type         premises_type NOT NULL DEFAULT 'other',
  entry_method          TEXT,
  cctv_available        BOOLEAN,
  stolen_property_desc  TEXT,
  estimated_value       NUMERIC(15, 2),
  suspect_name          TEXT,
  suspect_address       TEXT,
  suspect_description   TEXT,
  proof_files           TEXT[] DEFAULT '{}'
);

-- NCR (Non-Cognizable Report)
CREATE TABLE IF NOT EXISTS incident_ncr (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  ncr_type        ncr_type NOT NULL DEFAULT 'noise_complaint',
  description     TEXT,
  suspect_name    TEXT,
  suspect_address TEXT,
  suspect_phone   TEXT,
  suspect_description TEXT
);

-- ── Evidence / Proof Files ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_evidence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),
  bucket          TEXT NOT NULL DEFAULT 'incident-evidence',
  storage_path    TEXT NOT NULL,
  public_url      TEXT,
  file_name       TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       TEXT,
  category        evidence_category NOT NULL DEFAULT 'proof'
);

CREATE INDEX IF NOT EXISTS idx_evidence_incident ON incident_evidence(incident_id);

-- ── Status History (Audit Trail) ───────────────────────────────

CREATE TABLE IF NOT EXISTS incident_status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by    UUID REFERENCES profiles(id),
  old_status    TEXT,
  new_status    TEXT NOT NULL,
  note          TEXT
);

CREATE INDEX IF NOT EXISTS idx_status_history_incident ON incident_status_history(incident_id);

-- ── Additional Indexes ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_incidents_complaint_type ON incidents(complaint_type);
CREATE INDEX IF NOT EXISTS idx_incidents_station ON incidents(station_id);
CREATE INDEX IF NOT EXISTS idx_incidents_i_date ON incidents(i_date);
CREATE INDEX IF NOT EXISTS idx_incidents_fir_number ON incidents(fir_number);

-- ── RLS Policies for new tables ────────────────────────────────

ALTER TABLE incident_simple_theft ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_cyber_crime ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_cheating_fraud ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_burglary ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_ncr ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_status_history ENABLE ROW LEVEL SECURITY;

-- Citizens can CRUD their own type-specific details
CREATE POLICY "citizen_own_simple_theft" ON incident_simple_theft FOR ALL TO authenticated
USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid()));

CREATE POLICY "citizen_own_cyber_crime" ON incident_cyber_crime FOR ALL TO authenticated
USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid()));

CREATE POLICY "citizen_own_cheating_fraud" ON incident_cheating_fraud FOR ALL TO authenticated
USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid()));

CREATE POLICY "citizen_own_burglary" ON incident_burglary FOR ALL TO authenticated
USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid()));

CREATE POLICY "citizen_own_ncr" ON incident_ncr FOR ALL TO authenticated
USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid()));

-- Evidence policies
CREATE POLICY "citizen_own_evidence_select" ON incident_evidence FOR SELECT TO authenticated
USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid()));

CREATE POLICY "citizen_own_evidence_insert" ON incident_evidence FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid() AND incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid()));

CREATE POLICY "citizen_own_evidence_delete" ON incident_evidence FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() AND incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid() AND status = 'draft'));

-- Status history: citizens can read their own, officers can read scoped
CREATE POLICY "citizen_own_status_history" ON incident_status_history FOR SELECT TO authenticated
USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid()));

CREATE POLICY "system_insert_status_history" ON incident_status_history FOR INSERT TO authenticated
WITH CHECK (true);
