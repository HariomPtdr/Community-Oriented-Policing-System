-- =============================================
-- RESET_AND_MIGRATE.sql
-- Safe to run multiple times — drops everything first
-- =============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS set_incidents_updated_at ON incidents;
DROP TRIGGER IF EXISTS set_officer_profiles_updated_at ON officer_profiles;
DROP TRIGGER IF EXISTS set_forum_posts_updated_at ON forum_posts;
DROP TRIGGER IF EXISTS set_complaints_updated_at ON complaints;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at();

-- Drop tables (reverse order of dependencies)
DROP TABLE IF EXISTS survey_responses CASCADE;
DROP TABLE IF EXISTS survey_templates CASCADE;
DROP TABLE IF EXISTS community_events CASCADE;
DROP TABLE IF EXISTS patrol_logs CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS directives CASCADE;
DROP TABLE IF EXISTS escalation_log CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS sos_events CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS officer_profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS neighborhoods CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS zones CASCADE;

-- Drop enums
DROP TYPE IF EXISTS complaint_status CASCADE;
DROP TYPE IF EXISTS alert_type CASCADE;
DROP TYPE IF EXISTS incident_category CASCADE;
DROP TYPE IF EXISTS incident_priority CASCADE;
DROP TYPE IF EXISTS incident_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- =============================================
-- 001: ENUMS
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
-- 002: GEOGRAPHY
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

-- =============================================
-- 003: CORE TABLES
-- =============================================
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

CREATE TABLE survey_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID REFERENCES survey_templates(id) NOT NULL,
  respondent_id UUID REFERENCES profiles(id),
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- =============================================
-- 004: FUNCTIONS & TRIGGERS
-- =============================================
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
-- 005: INDEXES
-- =============================================
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_officer ON incidents(assigned_officer_id);
CREATE INDEX idx_incidents_neighborhood ON incidents(neighborhood_id);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_incidents_location ON incidents(latitude, longitude);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_neighborhood ON profiles(neighborhood_id);
CREATE INDEX idx_officer_station ON officer_profiles(station_id);
CREATE INDEX idx_officer_beat ON officer_profiles(beat_id);
CREATE INDEX idx_officer_zone ON officer_profiles(zone_id);
CREATE INDEX idx_officer_verified ON officer_profiles(is_verified);
CREATE INDEX idx_messages_incident ON messages(incident_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_read ON messages(is_read);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_neighborhood ON alerts(neighborhood_id);
CREATE INDEX idx_alerts_active ON alerts(is_active);
CREATE INDEX idx_sos_user ON sos_events(user_id);
CREATE INDEX idx_sos_created ON sos_events(created_at DESC);
CREATE INDEX idx_forum_neighborhood ON forum_posts(neighborhood_id);
CREATE INDEX idx_forum_created ON forum_posts(created_at DESC);
CREATE INDEX idx_complaints_officer ON complaints(against_officer_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_stations_zone ON stations(zone_id);
CREATE INDEX idx_neighborhoods_station ON neighborhoods(station_id);
CREATE INDEX idx_escalation_incident ON escalation_log(incident_id);
CREATE INDEX idx_escalation_created ON escalation_log(created_at DESC);
CREATE INDEX idx_directives_to ON directives(to_officer);
CREATE INDEX idx_directives_from ON directives(from_officer);

-- =============================================
-- 006: RLS POLICIES
-- =============================================
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
ALTER TABLE escalation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE directives ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Officers can view profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('constable','si','sho','dsp','admin','oversight'))
);

-- Incidents
CREATE POLICY "Citizens can create incidents" ON incidents FOR INSERT WITH CHECK (auth.uid() = reporter_id OR is_anonymous = true);
CREATE POLICY "Citizens can view own incidents" ON incidents FOR SELECT USING (
  reporter_id = auth.uid() OR is_anonymous = true OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen')
);
CREATE POLICY "Officers can update assigned incidents" ON incidents FOR UPDATE USING (
  assigned_officer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('si','sho','dsp','admin'))
);

-- Messages
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Alerts
CREATE POLICY "Anyone can view active alerts" ON alerts FOR SELECT USING (is_active = true);
CREATE POLICY "Officers can create alerts" ON alerts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('sho','dsp','admin'))
);

-- SOS
CREATE POLICY "Users can create SOS" ON sos_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own SOS" ON sos_events FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen')
);

-- Forum
CREATE POLICY "Anyone can read forum" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON forum_posts FOR INSERT WITH CHECK (author_id = auth.uid() OR is_anonymous = true);

-- Complaints
CREATE POLICY "Citizens can file complaints" ON complaints FOR INSERT WITH CHECK (filed_by = auth.uid() OR is_anonymous = true);
CREATE POLICY "SHO+ can view complaints" ON complaints FOR SELECT USING (
  filed_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('sho','dsp','admin','oversight'))
);

-- Geography (public read)
CREATE POLICY "Anyone can view zones" ON zones FOR SELECT USING (true);
CREATE POLICY "Anyone can view stations" ON stations FOR SELECT USING (true);
CREATE POLICY "Anyone can view neighborhoods" ON neighborhoods FOR SELECT USING (true);
CREATE POLICY "Admin can manage zones" ON zones FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admin can manage stations" ON stations FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Patrol
CREATE POLICY "Officers can manage own patrol logs" ON patrol_logs FOR ALL USING (officer_id = auth.uid());
CREATE POLICY "Supervisors can view patrol logs" ON patrol_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('si','sho','dsp','admin'))
);

-- Audit
CREATE POLICY "Admin/oversight can view audit log" ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','oversight'))
);

-- Officer profiles
CREATE POLICY "Officers can view own officer profile" ON officer_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Officers can update own profile" ON officer_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Supervisors can view officer profiles" ON officer_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('si','sho','dsp','admin'))
);
CREATE POLICY "SHO/Admin can verify officers" ON officer_profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('sho','admin'))
);

-- Escalation
CREATE POLICY "Officers can view escalations" ON escalation_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('si','sho','dsp','admin'))
);
CREATE POLICY "Officers can create escalations" ON escalation_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('constable','si','sho'))
);

-- Directives
CREATE POLICY "Officers can view own directives" ON directives FOR SELECT USING (from_officer = auth.uid() OR to_officer = auth.uid());
CREATE POLICY "DSP/SHO can create directives" ON directives FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('dsp','sho','admin'))
);

-- =============================================
-- 007: SEED DATA
-- =============================================
INSERT INTO zones (id, name, city, state) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Zone West', 'Indore', 'Madhya Pradesh'),
  ('a2222222-2222-2222-2222-222222222222', 'Zone East', 'Indore', 'Madhya Pradesh');

INSERT INTO stations (id, name, zone_id, address, phone) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Palasia Police Station', 'a1111111-1111-1111-1111-111111111111', 'Palasia Square, Indore', '+91-731-2555100'),
  ('b2222222-2222-2222-2222-222222222222', 'Vijay Nagar Police Station', 'a1111111-1111-1111-1111-111111111111', 'Vijay Nagar, Indore', '+91-731-2555200'),
  ('b3333333-3333-3333-3333-333333333333', 'Rajwada Police Station', 'a2222222-2222-2222-2222-222222222222', 'Near Rajwada, Indore', '+91-731-2555300');

INSERT INTO neighborhoods (id, name, station_id) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Beat 1 — Palasia Square', 'b1111111-1111-1111-1111-111111111111'),
  ('c2222222-2222-2222-2222-222222222222', 'Beat 2 — Sapna Sangeeta', 'b1111111-1111-1111-1111-111111111111'),
  ('c3333333-3333-3333-3333-333333333333', 'Beat 3 — AB Road', 'b1111111-1111-1111-1111-111111111111'),
  ('c4444444-4444-4444-4444-444444444444', 'Beat 4 — MG Road', 'b1111111-1111-1111-1111-111111111111'),
  ('c5555555-5555-5555-5555-555555555555', 'Beat 5 — Vijay Nagar Main', 'b2222222-2222-2222-2222-222222222222'),
  ('c6666666-6666-6666-6666-666666666666', 'Beat 6 — Scheme No. 54', 'b2222222-2222-2222-2222-222222222222'),
  ('c7777777-7777-7777-7777-777777777777', 'Beat 7 — New Palasia', 'b2222222-2222-2222-2222-222222222222');

INSERT INTO survey_templates (title, questions, is_active) VALUES
  ('Community Safety Survey Q1 2026', '[
    {"id": "q1", "text": "How safe do you feel in your neighborhood?", "type": "rating", "scale": 5},
    {"id": "q2", "text": "Have you interacted with your beat officer this month?", "type": "boolean"},
    {"id": "q3", "text": "Any safety concerns you want to report?", "type": "text"},
    {"id": "q4", "text": "Rate your overall experience with the police", "type": "rating", "scale": 5}
  ]'::jsonb, true);
