-- =============================================
-- 006_rank_extensions.sql — Escalation, Directives
-- =============================================

-- Escalation log
CREATE TABLE escalation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id) NOT NULL,
  escalated_by UUID REFERENCES profiles(id),
  escalated_to UUID REFERENCES profiles(id),
  from_role user_role NOT NULL,
  to_role user_role NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Directives (DSP → SHO → SI)
CREATE TABLE directives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_officer UUID REFERENCES profiles(id) NOT NULL,
  to_officer UUID REFERENCES profiles(id) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  incident_id UUID REFERENCES incidents(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_escalation_incident ON escalation_log(incident_id);
CREATE INDEX idx_escalation_created ON escalation_log(created_at DESC);
CREATE INDEX idx_directives_to ON directives(to_officer);
CREATE INDEX idx_directives_from ON directives(from_officer);

-- Enable RLS
ALTER TABLE escalation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE directives ENABLE ROW LEVEL SECURITY;

-- Escalation policies
CREATE POLICY "Officers can view escalations" ON escalation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('si', 'sho', 'dsp', 'admin')
    )
  );

CREATE POLICY "Officers can create escalations" ON escalation_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('constable', 'si', 'sho')
    )
  );

-- Directive policies
CREATE POLICY "Officers can view own directives" ON directives
  FOR SELECT USING (from_officer = auth.uid() OR to_officer = auth.uid());

CREATE POLICY "DSP/SHO can create directives" ON directives
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('dsp', 'sho', 'admin')
    )
  );
