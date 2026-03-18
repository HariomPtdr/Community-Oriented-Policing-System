-- =============================================
-- 001_enums.sql — Define all enum types
-- =============================================

CREATE TYPE user_role AS ENUM (
  'citizen', 'constable', 'si', 'sho', 'dsp', 'admin', 'oversight'
);

CREATE TYPE incident_status AS ENUM (
  'submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed'
);

CREATE TYPE incident_priority AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE incident_category AS ENUM (
  'theft', 'assault', 'vandalism', 'robbery', 'burglary',
  'traffic', 'noise_complaint', 'suspicious_activity',
  'drug_activity', 'domestic', 'missing_person', 'other'
);

CREATE TYPE alert_type AS ENUM (
  'crime_alert', 'missing_person', 'wanted_notice', 'safety_advisory', 'sos'
);

CREATE TYPE complaint_status AS ENUM (
  'filed', 'under_review', 'investigating', 'resolved', 'dismissed'
);
-- =============================================
-- 002_geography.sql — Zones, Stations, Neighborhoods
-- Must run BEFORE core_tables (profiles needs station_id FK)
-- =============================================

CREATE TABLE zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Indore',
  state TEXT NOT NULL DEFAULT 'Madhya Pradesh',
  dsp_id UUID,
  boundary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  zone_id UUID REFERENCES zones(id),
  sho_id UUID,
  address TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE neighborhoods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Indore',
  state TEXT NOT NULL DEFAULT 'Madhya Pradesh',
  station_id UUID REFERENCES stations(id),
  assigned_constable_id UUID,
  assigned_si_id UUID,
  boundary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE zones IS 'Geographic zones managed by DSPs';
COMMENT ON TABLE stations IS 'Police stations within zones, managed by SHOs';
COMMENT ON TABLE neighborhoods IS 'Beat areas within stations, patrolled by constables';
-- =============================================
-- 003_core_tables.sql — Profiles, Officers, Incidents, Messages, etc.
-- =============================================

-- User profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'citizen',
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  address TEXT,
  neighborhood_id UUID REFERENCES neighborhoods(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Officer-specific profile details
CREATE TABLE officer_profiles (
  id UUID REFERENCES profiles(id) PRIMARY KEY,
  badge_number TEXT NOT NULL UNIQUE,
  rank TEXT NOT NULL,
  role user_role NOT NULL,
  station_id UUID REFERENCES stations(id),
  beat_id UUID REFERENCES neighborhoods(id),
  supervisor_id UUID REFERENCES profiles(id),
  zone_id UUID REFERENCES zones(id),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  years_of_service INTEGER DEFAULT 0,
  languages TEXT[] DEFAULT '{"Hindi", "English"}',
  community_rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidents (core table)
CREATE TABLE incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category incident_category NOT NULL DEFAULT 'other',
  status incident_status NOT NULL DEFAULT 'submitted',
  priority incident_priority NOT NULL DEFAULT 'medium',
  is_anonymous BOOLEAN DEFAULT FALSE,
  reporter_id UUID REFERENCES profiles(id),
  assigned_officer_id UUID REFERENCES profiles(id),
  neighborhood_id UUID REFERENCES neighborhoods(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_description TEXT,
  occurred_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  escalated_to_id UUID REFERENCES profiles(id),
  escalation_level user_role,
  ai_category_confidence DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages between users
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id),
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  recipient_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_anonymous_sender BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type alert_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  neighborhood_id UUID REFERENCES neighborhoods(id),
  radius_km DECIMAL(5,2) DEFAULT 2,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_by UUID REFERENCES profiles(id),
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOS Events
CREATE TABLE sos_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  responded_by UUID REFERENCES profiles(id),
  responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Forum Posts
CREATE TABLE forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  neighborhood_id UUID REFERENCES neighborhoods(id) NOT NULL,
  author_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaints against officers
CREATE TABLE complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filed_by UUID REFERENCES profiles(id),
  against_officer_id UUID REFERENCES profiles(id) NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status complaint_status DEFAULT 'filed',
  is_anonymous BOOLEAN DEFAULT TRUE,
  reviewed_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patrol logs
CREATE TABLE patrol_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  officer_id UUID REFERENCES profiles(id) NOT NULL,
  beat_id UUID REFERENCES neighborhoods(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  route JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community events
CREATE TABLE community_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  neighborhood_id UUID REFERENCES neighborhoods(id),
  organizer_id UUID REFERENCES profiles(id),
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  max_attendees INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey templates
CREATE TABLE survey_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey responses
CREATE TABLE survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID REFERENCES survey_templates(id) NOT NULL,
  respondent_id UUID REFERENCES profiles(id),
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'citizen'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_officer_profiles_updated_at BEFORE UPDATE ON officer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_forum_posts_updated_at BEFORE UPDATE ON forum_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- =============================================
-- 004_indexes_triggers.sql — Performance indexes
-- =============================================

-- Incident indexes
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_officer ON incidents(assigned_officer_id);
CREATE INDEX idx_incidents_neighborhood ON incidents(neighborhood_id);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_incidents_location ON incidents(latitude, longitude);

-- Profile indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_neighborhood ON profiles(neighborhood_id);

-- Officer indexes
CREATE INDEX idx_officer_station ON officer_profiles(station_id);
CREATE INDEX idx_officer_beat ON officer_profiles(beat_id);
CREATE INDEX idx_officer_zone ON officer_profiles(zone_id);
CREATE INDEX idx_officer_verified ON officer_profiles(is_verified);

-- Messages
CREATE INDEX idx_messages_incident ON messages(incident_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_read ON messages(is_read);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Alerts
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_neighborhood ON alerts(neighborhood_id);
CREATE INDEX idx_alerts_active ON alerts(is_active);

-- SOS
CREATE INDEX idx_sos_user ON sos_events(user_id);
CREATE INDEX idx_sos_created ON sos_events(created_at DESC);

-- Forum
CREATE INDEX idx_forum_neighborhood ON forum_posts(neighborhood_id);
CREATE INDEX idx_forum_created ON forum_posts(created_at DESC);

-- Complaints
CREATE INDEX idx_complaints_officer ON complaints(against_officer_id);
CREATE INDEX idx_complaints_status ON complaints(status);

-- Audit log
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- Geography
CREATE INDEX idx_stations_zone ON stations(zone_id);
CREATE INDEX idx_neighborhoods_station ON neighborhoods(station_id);
-- =============================================
-- 005_rls_base.sql — Row Level Security policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Officers can view citizen profiles (for case handling)
CREATE POLICY "Officers can view profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('constable', 'si', 'sho', 'dsp', 'admin', 'oversight')
    )
  );

-- ============ INCIDENTS ============
-- Citizens can create incidents
CREATE POLICY "Citizens can create incidents" ON incidents
  FOR INSERT WITH CHECK (auth.uid() = reporter_id OR is_anonymous = true);

-- Citizens can view own incidents
CREATE POLICY "Citizens can view own incidents" ON incidents
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR is_anonymous = true
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen'
    )
  );

-- Officers can update incidents assigned to them
CREATE POLICY "Officers can update assigned incidents" ON incidents
  FOR UPDATE USING (
    assigned_officer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('si', 'sho', 'dsp', 'admin')
    )
  );

-- ============ MESSAGES ============
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ============ NOTIFICATIONS ============
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============ ALERTS ============
CREATE POLICY "Anyone can view active alerts" ON alerts
  FOR SELECT USING (is_active = true);

CREATE POLICY "Officers can create alerts" ON alerts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('sho', 'dsp', 'admin')
    )
  );

-- ============ SOS ============
CREATE POLICY "Users can create SOS" ON sos_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own SOS" ON sos_events
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen'
    )
  );

-- ============ FORUM ============
CREATE POLICY "Anyone in community can read forum" ON forum_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create posts" ON forum_posts
  FOR INSERT WITH CHECK (author_id = auth.uid() OR is_anonymous = true);

-- ============ COMPLAINTS ============
CREATE POLICY "Citizens can file complaints" ON complaints
  FOR INSERT WITH CHECK (filed_by = auth.uid() OR is_anonymous = true);

CREATE POLICY "SHO+ can view complaints" ON complaints
  FOR SELECT USING (
    filed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('sho', 'dsp', 'admin', 'oversight')
    )
  );

-- ============ GEOGRAPHY (public read) ============
CREATE POLICY "Anyone can view zones" ON zones FOR SELECT USING (true);
CREATE POLICY "Anyone can view stations" ON stations FOR SELECT USING (true);
CREATE POLICY "Anyone can view neighborhoods" ON neighborhoods FOR SELECT USING (true);

CREATE POLICY "Admin can manage zones" ON zones FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Admin can manage stations" ON stations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============ PATROL LOGS ============
CREATE POLICY "Officers can manage own patrol logs" ON patrol_logs
  FOR ALL USING (officer_id = auth.uid());

CREATE POLICY "Supervisors can view patrol logs" ON patrol_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('si', 'sho', 'dsp', 'admin')
    )
  );

-- ============ AUDIT LOG ============
CREATE POLICY "Admin and oversight can view audit log" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'oversight')
    )
  );

-- ============ OFFICER PROFILES ============
CREATE POLICY "Officers can view own officer profile" ON officer_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Officers can update own profile" ON officer_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Supervisors can view officer profiles" ON officer_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('si', 'sho', 'dsp', 'admin')
    )
  );

-- SHO and admin can verify officers
CREATE POLICY "SHO/Admin can verify officers" ON officer_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('sho', 'admin')
    )
  );
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
-- =============================================
-- 007_rank_rls.sql — Rank-scoped RLS policies
-- Constables see only their beat, SI sees supervised beats, etc.
-- =============================================

-- Constable: Only see incidents in their beat
CREATE POLICY "Constable: beat-scoped incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM officer_profiles op
      WHERE op.id = auth.uid()
      AND op.role = 'constable'
      AND op.beat_id = incidents.neighborhood_id
    )
  );

-- SI: See incidents in supervised beats
CREATE POLICY "SI: supervised-beat incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM officer_profiles op
      JOIN neighborhoods n ON n.assigned_si_id = op.id
      WHERE op.id = auth.uid()
      AND op.role = 'si'
      AND n.id = incidents.neighborhood_id
    )
  );

-- SHO: See all incidents in their station
CREATE POLICY "SHO: station-scoped incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM officer_profiles op
      JOIN stations s ON s.sho_id = op.id
      JOIN neighborhoods n ON n.station_id = s.id
      WHERE op.id = auth.uid()
      AND op.role = 'sho'
      AND n.id = incidents.neighborhood_id
    )
  );

-- DSP: See all incidents in their zone
CREATE POLICY "DSP: zone-scoped incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM officer_profiles op
      JOIN zones z ON z.dsp_id = op.id
      JOIN stations s ON s.zone_id = z.id
      JOIN neighborhoods n ON n.station_id = s.id
      WHERE op.id = auth.uid()
      AND op.role = 'dsp'
      AND n.id = incidents.neighborhood_id
    )
  );

-- Admin: See all incidents
CREATE POLICY "Admin: all incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Oversight: Read-only access to all data
CREATE POLICY "Oversight: read-only all incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'oversight'
    )
  );

-- Constable: beat-scoped complaints view
CREATE POLICY "Constable cannot view complaints" ON complaints
  FOR SELECT USING (
    NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'constable'
    )
    OR filed_by = auth.uid()
  );

-- Oversight: read-only on complaints
CREATE POLICY "Oversight: read-only complaints" ON complaints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'oversight'
    )
  );

-- Prevent oversight from modifying anything
-- (They can only SELECT — no INSERT, UPDATE, DELETE policies)
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
-- =============================================
-- 009 — Add JSONB detail columns for dynamic sub-forms
-- Supports per-dropdown contextual fields
-- =============================================

-- Simple Theft: property-type-specific details
ALTER TABLE incident_simple_theft
ADD COLUMN IF NOT EXISTS property_details JSONB DEFAULT '{}';

-- Cyber Crime: per-platform details + per-cyber-type details
ALTER TABLE incident_cyber_crime
ADD COLUMN IF NOT EXISTS platform_details JSONB DEFAULT '{}';

ALTER TABLE incident_cyber_crime
ADD COLUMN IF NOT EXISTS cyber_type_details JSONB DEFAULT '{}';

-- Cheating/Fraud: per-fraud-type details
ALTER TABLE incident_cheating_fraud
ADD COLUMN IF NOT EXISTS fraud_details JSONB DEFAULT '{}';

-- Burglary: per-premises-type details
ALTER TABLE incident_burglary
ADD COLUMN IF NOT EXISTS premises_details JSONB DEFAULT '{}';
-- =============================================
-- 010_sos_sms_tracking.sql — SMS/WhatsApp tracking for SOS
-- =============================================

-- Track which contacts were sent WhatsApp/SMS during SOS
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS sms_sent_to TEXT[] DEFAULT '{}';

-- Index for history lookup (most recent first)
CREATE INDEX IF NOT EXISTS idx_sos_events_user_created
  ON sos_events(user_id, created_at DESC);
-- =============================================
-- 011_profile_extended_details.sql — Extended profile details from Complainant form
-- =============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS father_husband_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_name TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS alternate_mobile TEXT,
  ADD COLUMN IF NOT EXISTS id_proof_type TEXT,
  ADD COLUMN IF NOT EXISTS id_number TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS city_town TEXT,
  ADD COLUMN IF NOT EXISTS tehsil_division TEXT,
  ADD COLUMN IF NOT EXISTS police_station_area TEXT,
  ADD COLUMN IF NOT EXISTS full_address TEXT;

-- We don't drop existing address column to avoid breaking changes, just use full_address going forward, or map them.
-- =============================================
-- 012_sho_announcements.sql — SHO Announcements to Citizens
-- Messages/Announcements that SHO can broadcast to citizens in their area
-- =============================================

-- SHO Announcements table
CREATE TABLE IF NOT EXISTS sho_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'safety', 'advisory', 'traffic', 'festival', 'weather', 'curfew', 'other')),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  target_neighborhoods UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sho_announcements_station ON sho_announcements(station_id);
CREATE INDEX IF NOT EXISTS idx_sho_announcements_active ON sho_announcements(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sho_announcements_created ON sho_announcements(created_at DESC);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS set_sho_announcements_updated_at ON sho_announcements;
CREATE TRIGGER set_sho_announcements_updated_at 
  BEFORE UPDATE ON sho_announcements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE sho_announcements ENABLE ROW LEVEL SECURITY;

-- Citizens can read active announcements
DROP POLICY IF EXISTS "Citizens can view announcements" ON sho_announcements;
CREATE POLICY "Citizens can view announcements" ON sho_announcements
  FOR SELECT TO authenticated
  USING (is_active = true);

-- SHO/Admin can manage announcements
DROP POLICY IF EXISTS "SHO can manage announcements" ON sho_announcements;
CREATE POLICY "SHO can manage announcements" ON sho_announcements
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================
-- Monthly Police Stats (aggregated view for citizens)
-- This stores pre-computed monthly statistics per station
-- =============================================

CREATE TABLE IF NOT EXISTS monthly_police_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  total_cases INTEGER DEFAULT 0,
  cases_solved INTEGER DEFAULT 0,
  cases_pending INTEGER DEFAULT 0,
  fir_registered INTEGER DEFAULT 0,
  arrests_made INTEGER DEFAULT 0,
  chargesheeted INTEGER DEFAULT 0,
  conviction_count INTEGER DEFAULT 0,
  avg_response_time_mins INTEGER DEFAULT 0,
  patrol_hours INTEGER DEFAULT 0,
  safety_score INTEGER DEFAULT 0 CHECK (safety_score >= 0 AND safety_score <= 100),
  crime_rate_change DECIMAL(5,2) DEFAULT 0,
  top_crime_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, month, year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monthly_stats_station ON monthly_police_stats(station_id, year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_period ON monthly_police_stats(year, month);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS set_monthly_stats_updated_at ON monthly_police_stats;
CREATE TRIGGER set_monthly_stats_updated_at 
  BEFORE UPDATE ON monthly_police_stats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE monthly_police_stats ENABLE ROW LEVEL SECURITY;

-- Everyone can read stats (public transparency data)
DROP POLICY IF EXISTS "Anyone can view monthly stats" ON monthly_police_stats;
CREATE POLICY "Anyone can view monthly stats" ON monthly_police_stats
  FOR SELECT TO authenticated
  USING (true);

-- Admin/SHO can manage stats
DROP POLICY IF EXISTS "Admin can manage monthly stats" ON monthly_police_stats;
CREATE POLICY "Admin can manage monthly stats" ON monthly_police_stats
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
-- =============================================
-- 013_chat_rooms.sql — Citizen-Officer Chat System
-- Chat rooms linked to incidents for real-time communication
-- =============================================

-- Chat Rooms table (one per incident, linking citizen and assigned officer)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  citizen_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  officer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(incident_id)
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_citizen ON chat_rooms(citizen_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_officer ON chat_rooms(officer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_incident ON chat_rooms(incident_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_msg ON chat_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

-- Auto-update timestamp on chat_rooms
DROP TRIGGER IF EXISTS set_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER set_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat room policies: only participants can see their rooms
DROP POLICY IF EXISTS "Users can view own chat rooms" ON chat_rooms;
CREATE POLICY "Users can view own chat rooms" ON chat_rooms
  FOR SELECT TO authenticated
  USING (citizen_id = auth.uid() OR officer_id = auth.uid());

DROP POLICY IF EXISTS "System can create chat rooms" ON chat_rooms;
CREATE POLICY "System can create chat rooms" ON chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Participants can update chat rooms" ON chat_rooms;
CREATE POLICY "Participants can update chat rooms" ON chat_rooms
  FOR UPDATE TO authenticated
  USING (citizen_id = auth.uid() OR officer_id = auth.uid());

-- Chat messages policies: only room participants can read/write messages
DROP POLICY IF EXISTS "Participants can view messages" ON chat_messages;
CREATE POLICY "Participants can view messages" ON chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = room_id
      AND (cr.citizen_id = auth.uid() OR cr.officer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can send messages" ON chat_messages;
CREATE POLICY "Participants can send messages" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = room_id
      AND (cr.citizen_id = auth.uid() OR cr.officer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Sender can update own messages" ON chat_messages;
CREATE POLICY "Sender can update own messages" ON chat_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- Function to auto-create chat room when officer is assigned to incident
CREATE OR REPLACE FUNCTION create_chat_room_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_officer_id IS NOT NULL AND (OLD.assigned_officer_id IS NULL OR OLD.assigned_officer_id != NEW.assigned_officer_id) THEN
    INSERT INTO chat_rooms (incident_id, citizen_id, officer_id)
    VALUES (NEW.id, NEW.reporter_id, NEW.assigned_officer_id)
    ON CONFLICT (incident_id) DO UPDATE SET
      officer_id = EXCLUDED.officer_id,
      status = 'active',
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_chat_room ON incidents;
CREATE TRIGGER auto_create_chat_room
  AFTER UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_room_on_assignment();
-- Add profile_completed column to profiles table
-- This field locks identity fields (name, father's name, gender, ID proof, address) 
-- after registration so they cannot be changed

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- For existing users who already have all registration data filled, mark as completed
UPDATE profiles 
SET profile_completed = TRUE 
WHERE full_name IS NOT NULL 
  AND father_husband_name IS NOT NULL 
  AND gender IS NOT NULL 
  AND id_proof_type IS NOT NULL 
  AND id_number IS NOT NULL 
  AND state IS NOT NULL;
-- Add id_proof_url to profiles table for storing uploaded ID proof document URL
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_proof_url TEXT DEFAULT NULL;

-- Create storage buckets for profile photos and ID proof documents
-- Note: Run these via Supabase Dashboard if INSERT INTO storage.buckets doesn't work
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('id-proofs', 'id-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'avatars');

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Storage policies for id-proofs bucket
CREATE POLICY "Users can upload own id proof"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'id-proofs' AND (storage.foldername(name))[1] = 'id-proofs');

CREATE POLICY "Users can update own id proof"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'id-proofs');

CREATE POLICY "Anyone can view id proofs"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'id-proofs');
-- Enable pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table 1: user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  
  -- Device info
  device_name       TEXT,
  browser           TEXT,
  os                TEXT,
  device_type       TEXT,
  
  -- Location
  ip_address        INET,
  city              TEXT,
  region            TEXT,
  country           TEXT DEFAULT 'India',
  
  -- Status
  is_current        BOOLEAN DEFAULT FALSE,
  is_revoked        BOOLEAN DEFAULT FALSE,
  revoked_at        TIMESTAMPTZ,
  revoked_by        TEXT,
  
  -- Supabase session reference
  supabase_session_id TEXT
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_sessions"
ON user_sessions FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_sessions_user       ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active     ON user_sessions(user_id, is_revoked) WHERE is_revoked = false;
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON user_sessions(last_active_at DESC);


-- Table 2: login_history
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'login_result') THEN
        CREATE TYPE login_result AS ENUM ('success', 'failed', 'blocked', '2fa_failed', '2fa_success');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'login_method') THEN
        CREATE TYPE login_method AS ENUM ('email_password', 'google', 'phone_otp', 'magic_link');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS login_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- What happened
  result          login_result NOT NULL,
  method          login_method DEFAULT 'email_password',
  failure_reason  TEXT,
  
  -- Where from
  ip_address      INET,
  city            TEXT,
  region          TEXT,
  country         TEXT DEFAULT 'India',
  browser         TEXT,
  os              TEXT,
  device_type     TEXT,
  
  -- Flags
  is_suspicious   BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT
);

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_login_history"
ON login_history FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Only server-side (service role) can insert login history
CREATE POLICY "service_insert_login_history"
ON login_history FOR INSERT TO service_role
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_login_history_user   ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_time   ON login_history(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_failed ON login_history(user_id, result) WHERE result = 'failed';


-- Table 3: two_factor_config
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'twofa_method') THEN
        CREATE TYPE twofa_method AS ENUM ('sms', 'totp', 'disabled');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS two_factor_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  method            twofa_method NOT NULL DEFAULT 'disabled',
  is_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  enabled_at        TIMESTAMPTZ,
  
  -- TOTP specific (Google Authenticator)
  totp_secret       TEXT,
  totp_verified     BOOLEAN DEFAULT FALSE,
  
  -- SMS specific
  phone_verified    BOOLEAN DEFAULT FALSE,
  
  -- Backup codes (hashed, never stored plain)
  backup_codes      TEXT[],
  backup_codes_generated_at TIMESTAMPTZ,
  backup_codes_remaining INTEGER DEFAULT 8
);

ALTER TABLE two_factor_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_2fa"
ON two_factor_config FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- Table 4: security_notifications_prefs
CREATE TABLE IF NOT EXISTS security_notifications_prefs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- What to notify about
  notify_new_device_login   BOOLEAN DEFAULT TRUE,
  notify_password_change    BOOLEAN DEFAULT TRUE,
  notify_fir_status_change  BOOLEAN DEFAULT TRUE,
  notify_new_device_linked  BOOLEAN DEFAULT TRUE,
  notify_failed_logins      BOOLEAN DEFAULT TRUE,
  notify_account_accessed   BOOLEAN DEFAULT FALSE,
  
  -- How to notify
  via_email                 BOOLEAN DEFAULT TRUE,
  via_sms                   BOOLEAN DEFAULT TRUE,
  via_push                  BOOLEAN DEFAULT FALSE
);

ALTER TABLE security_notifications_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_notif_prefs"
ON security_notifications_prefs FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- Table 5: privacy_controls
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'forum_visibility') THEN
        CREATE TYPE forum_visibility AS ENUM ('everyone', 'neighborhood_only', 'hidden');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS privacy_controls (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  forum_name_visibility     forum_visibility DEFAULT 'neighborhood_only',
  allow_officer_profile_view BOOLEAN DEFAULT TRUE,  -- required for FIR, warn if disabled
  anonymous_by_default      BOOLEAN DEFAULT FALSE,
  hide_last_seen            BOOLEAN DEFAULT FALSE,
  data_collection_consent   BOOLEAN DEFAULT TRUE,
  marketing_consent         BOOLEAN DEFAULT FALSE
);

ALTER TABLE privacy_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_privacy"
ON privacy_controls FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- Table 6: account_deletion_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deletion_status') THEN
        CREATE TYPE deletion_status AS ENUM (
          'pending_review',
          'blocked_open_firs',
          'approved',
          'completed',
          'cancelled'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  status          deletion_status NOT NULL DEFAULT 'pending_review',
  reason          TEXT,
  
  -- Block reasons
  blocked_reason  TEXT,          -- "has_2_open_firs"
  open_fir_count  INTEGER,
  
  -- Scheduling
  scheduled_for   TIMESTAMPTZ,   -- 30 days after approval
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  
  -- Verification
  confirmed_by_user BOOLEAN DEFAULT FALSE,
  confirmation_text TEXT,        -- user must type "DELETE MY ACCOUNT"
  reauth_verified   BOOLEAN DEFAULT FALSE
);

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_deletion_request"
ON account_deletion_requests FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- Table 7: data_export_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_status') THEN
        CREATE TYPE export_status AS ENUM ('pending', 'processing', 'ready', 'downloaded', 'expired');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS data_export_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  status          export_status DEFAULT 'pending',
  download_url    TEXT,
  file_size_bytes INTEGER,
  ready_at        TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  downloaded_at   TIMESTAMPTZ,
  
  -- Rate limit: max 1 export per 7 days
  CONSTRAINT one_export_per_week UNIQUE (user_id, requested_at)
);

ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_exports"
ON data_export_requests FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- Auto-create defaults trigger
CREATE OR REPLACE FUNCTION create_user_security_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO two_factor_config (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO security_notifications_prefs (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO privacy_controls (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_user_security_defaults();

-- Since we already have existing users in the profile table, insert the missing default records for them.
INSERT INTO two_factor_config (user_id)
SELECT id FROM auth.users ON CONFLICT DO NOTHING;

INSERT INTO security_notifications_prefs (user_id)
SELECT id FROM auth.users ON CONFLICT DO NOTHING;

INSERT INTO privacy_controls (user_id)
SELECT id FROM auth.users ON CONFLICT DO NOTHING;
-- =============================================
-- 016_activity_log.sql — Activity Log + Monthly Summary
-- =============================================
BEGIN;

-- ── Activity event types ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE activity_event_type AS ENUM (
    'account_created',
    'profile_updated',
    'password_changed',
    'login_new_device',
    'two_factor_enabled',
    'two_factor_disabled',
    'report_filed',
    'report_status_changed',
    'report_resolved',
    'report_rejected',
    'fir_number_assigned',
    'sos_activated',
    'sos_resolved',
    'sos_false_alarm',
    'sos_cancelled',
    'forum_post_published',
    'forum_post_resolved',
    'forum_comment_posted',
    'forum_post_removed',
    'area_alert_received',
    'case_feedback_submitted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Main activity log table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citizen_activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      activity_event_type NOT NULL,
  title           TEXT NOT NULL,
  subtitle        TEXT,
  action_label    TEXT,
  action_url      TEXT,
  metadata        JSONB DEFAULT '{}',
  category        TEXT NOT NULL
    CHECK (category IN ('reports', 'sos', 'forum', 'account', 'alerts'))
);

ALTER TABLE citizen_activity_log ENABLE ROW LEVEL SECURITY;

-- Users only see their own activity
DO $$ BEGIN
  CREATE POLICY "user_own_activity"
  ON citizen_activity_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role inserts
DO $$ BEGIN
  CREATE POLICY "service_insert_activity"
  ON citizen_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_user         ON citizen_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_time    ON citizen_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_category     ON citizen_activity_log(user_id, category);
CREATE INDEX IF NOT EXISTS idx_activity_event_type   ON citizen_activity_log(event_type);

-- ── Monthly activity summary ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citizen_monthly_summary (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start           DATE NOT NULL,
  reports_filed         INTEGER DEFAULT 0,
  reports_resolved      INTEGER DEFAULT 0,
  reports_active        INTEGER DEFAULT 0,
  sos_activated         INTEGER DEFAULT 0,
  forum_posts           INTEGER DEFAULT 0,
  alerts_received       INTEGER DEFAULT 0,
  computed_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, month_start)
);

ALTER TABLE citizen_monthly_summary ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_own_monthly_summary"
  ON citizen_monthly_summary FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_monthly_summary_user ON citizen_monthly_summary(user_id, month_start DESC);


-- ── Triggers to auto-insert activity log entries ──────────────────────────────

-- 1. New profile → account_created
CREATE OR REPLACE FUNCTION log_account_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO citizen_activity_log (
    user_id, event_type, title, subtitle, category
  ) VALUES (
    NEW.id,
    'account_created',
    'Account Created',
    'Welcome to COPS, ' || COALESCE(NEW.full_name, 'Citizen'),
    'account'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_activity ON profiles;
CREATE TRIGGER on_profile_created_activity
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_account_created();

-- 2. Profile updated → profile_updated
CREATE OR REPLACE FUNCTION log_profile_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  changed_fields TEXT[] := '{}';
BEGIN
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    changed_fields := array_append(changed_fields, 'full_name');
  END IF;
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    changed_fields := array_append(changed_fields, 'phone');
  END IF;
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    changed_fields := array_append(changed_fields, 'avatar');
  END IF;
  IF OLD.address IS DISTINCT FROM NEW.address THEN
    changed_fields := array_append(changed_fields, 'address');
  END IF;

  IF array_length(changed_fields, 1) > 0 THEN
    INSERT INTO citizen_activity_log (
      user_id, event_type, title, subtitle, metadata, category
    ) VALUES (
      NEW.id,
      'profile_updated',
      'Profile Updated',
      'Changed: ' || array_to_string(changed_fields, ', '),
      jsonb_build_object('fields_changed', changed_fields),
      'account'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated_activity ON profiles;
CREATE TRIGGER on_profile_updated_activity
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_updated();

-- 3. Incident submitted → report_filed
CREATE OR REPLACE FUNCTION log_report_filed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status != 'draft' THEN
    INSERT INTO citizen_activity_log (
      user_id, event_type, title, subtitle,
      action_label, action_url, metadata, category
    ) VALUES (
      NEW.reporter_id,
      'report_filed',
      'Report Filed' || COALESCE(' · ' || UPPER(NEW.fir_number), ''),
      INITCAP(REPLACE(COALESCE(NEW.complaint_type::TEXT, 'general'), '_', ' '))
        || COALESCE(' · ' || NEW.i_city, ''),
      'View Report',
      '/citizen/my-reports/' || NEW.id,
      jsonb_build_object(
        'incident_id', NEW.id,
        'fir_number', NEW.fir_number,
        'complaint_type', NEW.complaint_type,
        'location', NEW.i_city
      ),
      'reports'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_incident_filed_activity ON incidents;
CREATE TRIGGER on_incident_filed_activity
  AFTER INSERT ON incidents
  FOR EACH ROW EXECUTE FUNCTION log_report_filed();

-- 4. Incident status changed
CREATE OR REPLACE FUNCTION log_report_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  event_type_val activity_event_type;
  title_val TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  event_type_val := CASE
    WHEN NEW.status = 'resolved' THEN 'report_resolved'::activity_event_type
    WHEN NEW.status = 'rejected' THEN 'report_rejected'::activity_event_type
    ELSE 'report_status_changed'::activity_event_type
  END;

  title_val := CASE event_type_val
    WHEN 'report_resolved'     THEN 'Report Resolved'
    WHEN 'report_rejected'     THEN 'Report Rejected'
    ELSE                            'Report Status Updated'
  END;

  INSERT INTO citizen_activity_log (
    user_id, event_type, title, subtitle,
    action_label, action_url, metadata, category
  ) VALUES (
    NEW.reporter_id,
    event_type_val,
    title_val,
    INITCAP(REPLACE(OLD.status::TEXT, '_', ' '))
      || ' → '
      || INITCAP(REPLACE(NEW.status::TEXT, '_', ' ')),
    'View Report',
    '/citizen/my-reports/' || NEW.id,
    jsonb_build_object(
      'incident_id', NEW.id,
      'fir_number', NEW.fir_number,
      'old_status', OLD.status,
      'new_status', NEW.status
    ),
    'reports'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_incident_status_activity ON incidents;
CREATE TRIGGER on_incident_status_activity
  AFTER UPDATE OF status ON incidents
  FOR EACH ROW EXECUTE FUNCTION log_report_status_change();

-- 5. SOS activity
CREATE OR REPLACE FUNCTION log_sos_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.is_practice IS NULL OR NEW.is_practice = false) THEN
    INSERT INTO citizen_activity_log (
      user_id, event_type, title, subtitle, category
    ) VALUES (
      NEW.user_id, 'sos_activated', 'SOS Activated',
      'Emergency alert sent',
      'sos'
    );
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'resolved' THEN
      INSERT INTO citizen_activity_log (
        user_id, event_type, title, subtitle, category
      ) VALUES (
        NEW.user_id, 'sos_resolved', 'SOS Resolved',
        'Emergency resolved',
        'sos'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_sos_activity ON sos_events;
CREATE TRIGGER on_sos_activity
  AFTER INSERT OR UPDATE ON sos_events
  FOR EACH ROW EXECUTE FUNCTION log_sos_activity();

-- ── Backfill existing users ──────────────────────────────────────────────────

-- Backfill account_created events
INSERT INTO citizen_activity_log (user_id, event_type, title, subtitle, category, created_at)
SELECT
  p.id,
  'account_created',
  'Account Created',
  'Welcome to COPS, ' || COALESCE(p.full_name, 'Citizen'),
  'account',
  p.created_at
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM citizen_activity_log cal
  WHERE cal.user_id = p.id AND cal.event_type = 'account_created'
);

-- Backfill report_filed events
INSERT INTO citizen_activity_log (
  user_id, event_type, title, subtitle, action_label, action_url, metadata, category, created_at
)
SELECT
  i.reporter_id,
  'report_filed',
  'Report Filed' || COALESCE(' · ' || UPPER(i.fir_number), ''),
  INITCAP(REPLACE(COALESCE(i.complaint_type::TEXT, 'general'), '_', ' ')) || COALESCE(' · ' || i.i_city, ''),
  'View Report',
  '/citizen/my-reports/' || i.id,
  jsonb_build_object('incident_id', i.id, 'fir_number', i.fir_number, 'complaint_type', i.complaint_type),
  'reports',
  i.created_at
FROM incidents i
WHERE i.status != 'draft'
AND i.reporter_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM citizen_activity_log cal
  WHERE cal.user_id = i.reporter_id
  AND cal.metadata->>'incident_id' = i.id::TEXT
  AND cal.event_type = 'report_filed'
);

COMMIT;
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
-- Add emergency and volunteer fields to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT FALSE;
-- =============================================
-- 019_lost_and_found.sql
-- Lost & Found Complete Schema — Police-backed item recovery
-- =============================================

BEGIN;

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE lf_report_type AS ENUM ('lost', 'found');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lf_status AS ENUM (
    'active',       -- currently visible and open
    'matched',      -- potential match found, under review
    'claimed',      -- someone has claimed ownership
    'reunited',     -- confirmed reunited with owner
    'in_custody',   -- physically held at police station
    'expired',      -- auto-expired after 90/30 days
    'archived',     -- manually archived by user
    'removed'       -- removed by officer
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lf_category AS ENUM (
    'mobile_phone',
    'wallet_bag',
    'keys',
    'documents',
    'vehicle',
    'jewellery',
    'electronics',
    'clothing',
    'pets',
    'person',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lf_claim_status AS ENUM (
    'pending',      -- claim submitted, awaiting officer review
    'verifying',    -- officer asked for proof
    'approved',     -- officer verified, handover in progress
    'rejected',     -- false claim
    'completed'     -- item physically handed over
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Storage bucket ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lost-found-media',
  'lost-found-media',
  true,
  10485760,  -- 10 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "lf_media_insert" ON storage.objects;
CREATE POLICY "lf_media_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lost-found-media');

DROP POLICY IF EXISTS "lf_media_select" ON storage.objects;
CREATE POLICY "lf_media_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lost-found-media');

DROP POLICY IF EXISTS "lf_media_delete" ON storage.objects;
CREATE POLICY "lf_media_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lost-found-media');

-- ── Main lost_found_items table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lost_found_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Who reported
  reporter_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type         lf_report_type NOT NULL,
  status              lf_status NOT NULL DEFAULT 'active',

  -- Item basics
  item_name           TEXT NOT NULL,
  category            lf_category NOT NULL,
  description         TEXT NOT NULL,
  brand               TEXT,
  color               TEXT,

  -- Category-specific data (JSONB)
  category_details    JSONB DEFAULT '{}',

  -- Contact info from reporter
  contact_name        TEXT NOT NULL,
  contact_phone       TEXT,
  contact_email       TEXT,

  -- Contact preferences
  contact_via_platform BOOLEAN DEFAULT TRUE,
  show_phone          BOOLEAN DEFAULT FALSE,
  show_email          BOOLEAN DEFAULT FALSE,

  -- Location
  location_text       TEXT NOT NULL,
  location_area       TEXT,
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,

  -- Timing
  incident_date       DATE NOT NULL,
  incident_time       TEXT,

  -- Reward (optional)
  has_reward          BOOLEAN DEFAULT FALSE,
  reward_amount       NUMERIC(10, 2),
  reward_note         TEXT,

  -- Photos (array of storage paths)
  photo_paths         TEXT[] DEFAULT '{}',
  primary_photo_path  TEXT,

  -- AI matching
  ai_keywords         TEXT[],
  ai_match_checked_at TIMESTAMPTZ,

  -- Expiry
  expires_at          TIMESTAMPTZ,
  expiry_warned       BOOLEAN DEFAULT FALSE,
  renewal_count       INTEGER DEFAULT 0,

  -- Officer fields
  officer_notes       TEXT,
  assigned_officer_id UUID REFERENCES profiles(id),

  -- Stats
  view_count          INTEGER DEFAULT 0,
  claim_count         INTEGER DEFAULT 0
);

ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lf_reporter     ON lost_found_items(reporter_id);
CREATE INDEX IF NOT EXISTS idx_lf_status       ON lost_found_items(status);
CREATE INDEX IF NOT EXISTS idx_lf_category     ON lost_found_items(category);
CREATE INDEX IF NOT EXISTS idx_lf_type         ON lost_found_items(report_type);
CREATE INDEX IF NOT EXISTS idx_lf_date         ON lost_found_items(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_lf_expires      ON lost_found_items(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_lf_item_name    ON lost_found_items USING GIN(to_tsvector('english', item_name));

-- ── RLS Policies for lost_found_items ────────────────────────────────────────

-- Anyone authenticated can read active/matched/claimed/reunited items
CREATE POLICY "lf_items_select_active"
ON lost_found_items FOR SELECT
TO authenticated
USING (
  status IN ('active', 'matched', 'claimed', 'reunited')
  OR reporter_id = auth.uid()
);

-- Any citizen can insert their own
CREATE POLICY "lf_items_insert_own"
ON lost_found_items FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Reporter can update their own active items
CREATE POLICY "lf_items_update_own"
ON lost_found_items FOR UPDATE
TO authenticated
USING (reporter_id = auth.uid())
WITH CHECK (reporter_id = auth.uid());

-- ── Claims table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lost_found_claims (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  item_id             UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  claimant_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status              lf_claim_status NOT NULL DEFAULT 'pending',

  -- What the claimant says
  claim_message       TEXT NOT NULL,
  proof_description   TEXT,
  proof_file_paths    TEXT[] DEFAULT '{}',

  -- Officer review
  reviewed_by         UUID REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  handover_date       DATE,
  handover_location   TEXT,
  handover_notes      TEXT,

  UNIQUE (item_id, claimant_id)
);

ALTER TABLE lost_found_claims ENABLE ROW LEVEL SECURITY;

-- Claimant can read/insert their own claims
CREATE POLICY "lf_claims_select_own"
ON lost_found_claims FOR SELECT
TO authenticated
USING (claimant_id = auth.uid());

CREATE POLICY "lf_claims_insert_own"
ON lost_found_claims FOR INSERT
TO authenticated
WITH CHECK (claimant_id = auth.uid());

-- Reporter can see claims on their own items
CREATE POLICY "lf_claims_reporter_select"
ON lost_found_claims FOR SELECT
TO authenticated
USING (
  item_id IN (
    SELECT id FROM lost_found_items WHERE reporter_id = auth.uid()
  )
);

-- ── AI Matches table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lost_found_matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  lost_item_id        UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  found_item_id       UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,

  match_score         NUMERIC(5, 2) NOT NULL,
  match_reasons       TEXT[],
  ai_explanation      TEXT,

  is_notified         BOOLEAN DEFAULT FALSE,
  is_dismissed        BOOLEAN DEFAULT FALSE,
  dismissed_by        UUID REFERENCES profiles(id),
  dismissed_reason    TEXT,

  led_to_reunion      BOOLEAN DEFAULT FALSE,

  UNIQUE (lost_item_id, found_item_id)
);

ALTER TABLE lost_found_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lf_matches_select"
ON lost_found_matches FOR SELECT
TO authenticated
USING (
  lost_item_id IN (SELECT id FROM lost_found_items WHERE reporter_id = auth.uid())
  OR found_item_id IN (SELECT id FROM lost_found_items WHERE reporter_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_matches_lost    ON lost_found_matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_found   ON lost_found_matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_score   ON lost_found_matches(match_score DESC);

-- ── Triggers ──────────────────────────────────────────────────────────────────

-- Auto updated_at
CREATE TRIGGER set_lf_items_updated_at
  BEFORE UPDATE ON lost_found_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_lf_claims_updated_at
  BEFORE UPDATE ON lost_found_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set expires_at on insert
CREATE OR REPLACE FUNCTION set_lf_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.expires_at := CASE NEW.report_type
    WHEN 'lost'  THEN now() + INTERVAL '90 days'
    WHEN 'found' THEN now() + INTERVAL '30 days'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lf_insert_set_expiry ON lost_found_items;
CREATE TRIGGER on_lf_insert_set_expiry
  BEFORE INSERT ON lost_found_items
  FOR EACH ROW EXECUTE FUNCTION set_lf_expiry();

-- Increment claim_count on new claim
CREATE OR REPLACE FUNCTION increment_lf_claim_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE lost_found_items
  SET claim_count = claim_count + 1
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lf_claim_insert ON lost_found_claims;
CREATE TRIGGER on_lf_claim_insert
  AFTER INSERT ON lost_found_claims
  FOR EACH ROW EXECUTE FUNCTION increment_lf_claim_count();

-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Auto-match trigger: find potential matches when item is inserted
CREATE OR REPLACE FUNCTION check_lf_matches()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  match_record RECORD;
  opposite_type lf_report_type;
  notif_title TEXT;
  notif_body TEXT;
  lost_id UUID;
  found_id UUID;
BEGIN
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Determine opposite type
  opposite_type := CASE NEW.report_type
    WHEN 'lost' THEN 'found'::lf_report_type
    WHEN 'found' THEN 'lost'::lf_report_type
  END;

  FOR match_record IN
    SELECT * FROM lost_found_items
    WHERE report_type = opposite_type
    AND category = NEW.category
    AND status IN ('active', 'matched')
    AND (
      item_name ILIKE '%' || NEW.item_name || '%'
      OR NEW.item_name ILIKE '%' || item_name || '%'
      OR similarity(LOWER(item_name), LOWER(NEW.item_name)) > 0.3
    )
    AND reporter_id != NEW.reporter_id
    AND incident_date >= NEW.incident_date - INTERVAL '30 days'
    AND incident_date <= NEW.incident_date + INTERVAL '30 days'
    LIMIT 10
  LOOP
    -- Determine lost/found IDs
    IF NEW.report_type = 'lost' THEN
      lost_id := NEW.id;
      found_id := match_record.id;
    ELSE
      lost_id := match_record.id;
      found_id := NEW.id;
    END IF;

    -- Insert match (skip if exists)
    INSERT INTO lost_found_matches (lost_item_id, found_item_id, match_score, match_reasons)
    VALUES (
      lost_id, found_id,
      ROUND(similarity(LOWER(NEW.item_name), LOWER(match_record.item_name)) * 100),
      ARRAY[
        'Same category: ' || NEW.category::TEXT,
        'Similar name match',
        'Date range within 30 days'
      ]
    )
    ON CONFLICT (lost_item_id, found_item_id) DO NOTHING;

    -- Notify the new reporter
    INSERT INTO notifications (user_id, title, body, type, reference_id)
    VALUES (
      NEW.reporter_id,
      '⚡ Potential Match Found!',
      'A ' || opposite_type::TEXT || ' item "' || match_record.item_name || '" may match your report.',
      'success',
      NEW.id
    );

    -- Notify the existing reporter
    INSERT INTO notifications (user_id, title, body, type, reference_id)
    VALUES (
      match_record.reporter_id,
      '⚡ New Potential Match!',
      'Someone just reported a ' || NEW.report_type::TEXT || ' item "' || NEW.item_name || '" that may match yours.',
      'success',
      match_record.id
    );

    -- Update both items to 'matched'
    UPDATE lost_found_items SET status = 'matched' WHERE id IN (NEW.id, match_record.id) AND status = 'active';
  END LOOP;

  -- Update match check timestamp
  NEW.ai_match_checked_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_lf_matches ON lost_found_items;
CREATE TRIGGER trigger_check_lf_matches
  AFTER INSERT ON lost_found_items
  FOR EACH ROW EXECUTE FUNCTION check_lf_matches();

COMMIT;
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
