-- =============================================
-- 006_enhanced_sos.sql — Production SOS System
-- =============================================

-- SOS status enum
DO $$ BEGIN
  CREATE TYPE sos_status AS ENUM ('active', 'responded', 'resolved', 'cancelled', 'escalated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enhance sos_events table
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS location_source TEXT DEFAULT 'gps';
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS location_description TEXT;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS location_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS responding_officer_eta INTEGER;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS responding_officer_location JSONB;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS escalation_level TEXT;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS is_practice BOOLEAN DEFAULT FALSE;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS emergency_contacts TEXT[] DEFAULT '{}';
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS emergency_contacts_notified BOOLEAN DEFAULT FALSE;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS network_status TEXT DEFAULT 'online';
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- SOS settings per user (stored server-side for cross-device)
CREATE TABLE IF NOT EXISTS sos_settings (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  hold_duration DECIMAL(3,1) DEFAULT 2.0,
  shake_enabled BOOLEAN DEFAULT FALSE,
  emergency_contacts TEXT[] DEFAULT '{}',
  gps_accuracy TEXT DEFAULT 'high',
  sms_alert BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast active SOS lookup
CREATE INDEX IF NOT EXISTS idx_sos_events_active 
  ON sos_events(user_id, status) WHERE status = 'active';

-- Index for officer response lookup
CREATE INDEX IF NOT EXISTS idx_sos_events_responded 
  ON sos_events(responded_by) WHERE status IN ('active', 'responded');

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_sos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_sos_events_updated_at ON sos_events;
CREATE TRIGGER set_sos_events_updated_at 
  BEFORE UPDATE ON sos_events 
  FOR EACH ROW EXECUTE FUNCTION update_sos_updated_at();

DROP TRIGGER IF EXISTS set_sos_settings_updated_at ON sos_settings;
CREATE TRIGGER set_sos_settings_updated_at 
  BEFORE UPDATE ON sos_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS for sos_events
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Citizens can create SOS" ON sos_events;
CREATE POLICY "Citizens can create SOS" ON sos_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Citizens can view own SOS" ON sos_events;
CREATE POLICY "Citizens can view own SOS" ON sos_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM officer_profiles WHERE id = auth.uid() AND is_verified = TRUE
  ));

DROP POLICY IF EXISTS "Citizens can update own SOS" ON sos_events;
CREATE POLICY "Citizens can update own SOS" ON sos_events
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM officer_profiles WHERE id = auth.uid() AND is_verified = TRUE
  ));

-- RLS for sos_settings
ALTER TABLE sos_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own SOS settings" ON sos_settings;
CREATE POLICY "Users manage own SOS settings" ON sos_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for SOS
ALTER PUBLICATION supabase_realtime ADD TABLE sos_events;
