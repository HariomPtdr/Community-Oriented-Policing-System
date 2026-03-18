-- =============================================
-- 021_fir_tracking.sql — FIR Tracking & Case Management
-- Extended status pipeline, case updates, escalation, feedback, FIR documents
-- =============================================

BEGIN;

-- ── Extend incident_status enum with new tracking statuses ────────────
DO $$ BEGIN
  ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'evidence_collection' AFTER 'in_progress';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'accused_identified' AFTER 'evidence_collection';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'accused_arrested' AFTER 'accused_identified';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'charge_sheet_filed' AFTER 'accused_arrested';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Case public updates (officer posts visible to citizen) ────────────
CREATE TABLE IF NOT EXISTS case_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_by       UUID NOT NULL REFERENCES profiles(id),
  content         TEXT NOT NULL,
  is_public       BOOLEAN DEFAULT TRUE,
  update_type     TEXT NOT NULL DEFAULT 'progress'
    CHECK (update_type IN ('progress', 'request', 'info', 'resolution'))
);

ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;

-- Citizens can read public updates for their own incidents
DO $$ BEGIN
CREATE POLICY "citizen_read_public_updates"
ON case_updates FOR SELECT TO authenticated
USING (
  is_public = true
  AND incident_id IN (
    SELECT id FROM incidents WHERE reporter_id = auth.uid()
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Officers can read all updates for their station's incidents
DO $$ BEGIN
CREATE POLICY "officer_read_all_updates"
ON case_updates FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Officers can insert updates
DO $$ BEGIN
CREATE POLICY "officer_insert_updates"
ON case_updates FOR INSERT TO authenticated
WITH CHECK (
  posted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- System inserts (for triggers) - allow authenticated users to insert
DO $$ BEGIN
CREATE POLICY "system_insert_case_updates"
ON case_updates FOR INSERT TO authenticated
WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_case_updates_incident ON case_updates(incident_id, created_at DESC);

-- ── Status update requests (citizen requests officer attention) ───────
CREATE TABLE IF NOT EXISTS status_update_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES profiles(id),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  message         TEXT,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  response        TEXT
);

ALTER TABLE status_update_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "citizen_own_requests_select"
ON status_update_requests FOR SELECT TO authenticated
USING (requested_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "citizen_own_requests_insert"
ON status_update_requests FOR INSERT TO authenticated
WITH CHECK (requested_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "officer_read_requests"
ON status_update_requests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "officer_update_requests"
ON status_update_requests FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_status_requests_incident ON status_update_requests(incident_id);

-- ── Extend escalation_log with citizen-initiated fields ───────────────
ALTER TABLE escalation_log
  ADD COLUMN IF NOT EXISTS citizen_reason TEXT,
  ADD COLUMN IF NOT EXISTS citizen_initiated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ DEFAULT now();

-- Allow citizens to view their own escalations
DO $$ BEGIN
CREATE POLICY "citizen_read_own_escalations"
ON escalation_log FOR SELECT TO authenticated
USING (
  incident_id IN (
    SELECT id FROM incidents WHERE reporter_id = auth.uid()
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow citizens to create escalations
DO $$ BEGIN
CREATE POLICY "citizen_create_escalations"
ON escalation_log FOR INSERT TO authenticated
WITH CHECK (
  escalated_by = auth.uid()
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── FIR document generation log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS fir_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by    UUID REFERENCES profiles(id),
  storage_path    TEXT NOT NULL,
  file_size_bytes INTEGER,
  version         INTEGER DEFAULT 1,
  is_current      BOOLEAN DEFAULT TRUE,
  trigger_reason  TEXT
);

ALTER TABLE fir_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "citizen_read_own_fir_doc"
ON fir_documents FOR SELECT TO authenticated
USING (
  incident_id IN (
    SELECT id FROM incidents WHERE reporter_id = auth.uid()
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "officer_read_fir_docs"
ON fir_documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "officer_manage_fir_docs"
ON fir_documents FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_fir_docs_incident ON fir_documents(incident_id, is_current);

-- ── Case feedback ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  citizen_id      UUID NOT NULL REFERENCES profiles(id),
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT,
  was_officer_responsive BOOLEAN,
  was_resolution_satisfactory BOOLEAN,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  officer_response TEXT,
  officer_responded_at TIMESTAMPTZ
);

ALTER TABLE case_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "citizen_own_feedback_select"
ON case_feedback FOR SELECT TO authenticated
USING (citizen_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "citizen_own_feedback_insert"
ON case_feedback FOR INSERT TO authenticated
WITH CHECK (citizen_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "officer_read_feedback"
ON case_feedback FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_case_feedback_incident ON case_feedback(incident_id);

-- ── Add verified_at / verified_by to incidents for police verification ──
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ── Officer-level RLS policies for incident management ────────────────

-- Officers can read all incidents for their station
DO $$ BEGIN
CREATE POLICY "officer_read_incidents"
ON incidents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Officers can update incidents
DO $$ BEGIN
CREATE POLICY "officer_update_incidents"
ON incidents FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Officers can read evidence for all incidents
DO $$ BEGIN
CREATE POLICY "officer_read_evidence"
ON incident_evidence FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Officers can read status history for all incidents
DO $$ BEGIN
CREATE POLICY "officer_read_status_history"
ON incident_status_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Officers can insert status history
DO $$ BEGIN
CREATE POLICY "officer_insert_status_history"
ON incident_status_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Officers can read type-specific detail tables
DO $$ BEGIN
CREATE POLICY "officer_read_simple_theft"
ON incident_simple_theft FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "officer_read_cyber_crime"
ON incident_cyber_crime FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "officer_read_cheating_fraud"
ON incident_cheating_fraud FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "officer_read_burglary"
ON incident_burglary FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "officer_read_ncr"
ON incident_ncr FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('constable','si','sho','dsp','admin')
  )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
