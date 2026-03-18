-- =============================================
-- STEP 2: CREATE EVERYTHING (run AFTER Step 1)
-- =============================================

-- ENUMS
CREATE TYPE user_role AS ENUM ('citizen','constable','si','sho','dsp','admin','oversight');
CREATE TYPE incident_status AS ENUM ('submitted','under_review','assigned','in_progress','resolved','closed');
CREATE TYPE incident_priority AS ENUM ('low','medium','high','critical');
CREATE TYPE incident_category AS ENUM ('theft','assault','vandalism','robbery','burglary','traffic','noise_complaint','suspicious_activity','drug_activity','domestic','missing_person','other');
CREATE TYPE alert_type AS ENUM ('crime_alert','missing_person','wanted_notice','safety_advisory','sos');
CREATE TYPE complaint_status AS ENUM ('filed','under_review','investigating','resolved','dismissed');

-- GEOGRAPHY
CREATE TABLE zones (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL, city TEXT DEFAULT 'Indore', state TEXT DEFAULT 'Madhya Pradesh', dsp_id UUID, boundary JSONB, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE stations (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL, zone_id UUID REFERENCES zones(id), sho_id UUID, address TEXT, phone TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE neighborhoods (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL, city TEXT DEFAULT 'Indore', state TEXT DEFAULT 'Madhya Pradesh', station_id UUID REFERENCES stations(id), assigned_constable_id UUID, assigned_si_id UUID, boundary JSONB, created_at TIMESTAMPTZ DEFAULT NOW());

-- CORE
CREATE TABLE profiles (id UUID REFERENCES auth.users(id) PRIMARY KEY, role user_role NOT NULL DEFAULT 'citizen', full_name TEXT NOT NULL, phone TEXT, avatar_url TEXT, preferred_language TEXT DEFAULT 'en', address TEXT, neighborhood_id UUID REFERENCES neighborhoods(id), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE officer_profiles (id UUID REFERENCES profiles(id) PRIMARY KEY, badge_number TEXT NOT NULL UNIQUE, rank TEXT NOT NULL, role user_role NOT NULL, station_id UUID REFERENCES stations(id), beat_id UUID REFERENCES neighborhoods(id), supervisor_id UUID REFERENCES profiles(id), zone_id UUID REFERENCES zones(id), is_verified BOOLEAN DEFAULT FALSE, is_active BOOLEAN DEFAULT TRUE, years_of_service INTEGER DEFAULT 0, languages TEXT[] DEFAULT '{"Hindi","English"}', community_rating DECIMAL(3,2) DEFAULT 0, total_ratings INTEGER DEFAULT 0, bio TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE incidents (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category incident_category DEFAULT 'other', status incident_status DEFAULT 'submitted', priority incident_priority DEFAULT 'medium', is_anonymous BOOLEAN DEFAULT FALSE, reporter_id UUID REFERENCES profiles(id), assigned_officer_id UUID REFERENCES profiles(id), neighborhood_id UUID REFERENCES neighborhoods(id), latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, location_description TEXT, occurred_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ, resolution_notes TEXT, escalated_to_id UUID REFERENCES profiles(id), escalation_level user_role, ai_category_confidence DECIMAL(5,2), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE messages (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, incident_id UUID REFERENCES incidents(id), sender_id UUID REFERENCES profiles(id) NOT NULL, recipient_id UUID REFERENCES profiles(id) NOT NULL, content TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, is_anonymous_sender BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE notifications (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID REFERENCES profiles(id) NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, type TEXT DEFAULT 'info', reference_id UUID, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE alerts (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, type alert_type NOT NULL, title TEXT NOT NULL, description TEXT, neighborhood_id UUID REFERENCES neighborhoods(id), radius_km DECIMAL(5,2) DEFAULT 2, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, created_by UUID REFERENCES profiles(id), image_url TEXT, is_active BOOLEAN DEFAULT TRUE, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE sos_events (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID REFERENCES profiles(id) NOT NULL, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, responded_by UUID REFERENCES profiles(id), responded_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE forum_posts (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, neighborhood_id UUID REFERENCES neighborhoods(id) NOT NULL, author_id UUID REFERENCES profiles(id), title TEXT NOT NULL, content TEXT NOT NULL, is_pinned BOOLEAN DEFAULT FALSE, is_anonymous BOOLEAN DEFAULT FALSE, upvotes INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE complaints (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, filed_by UUID REFERENCES profiles(id), against_officer_id UUID REFERENCES profiles(id) NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, status complaint_status DEFAULT 'filed', is_anonymous BOOLEAN DEFAULT TRUE, reviewed_by UUID REFERENCES profiles(id), resolution_notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE patrol_logs (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, officer_id UUID REFERENCES profiles(id) NOT NULL, beat_id UUID REFERENCES neighborhoods(id), started_at TIMESTAMPTZ NOT NULL, ended_at TIMESTAMPTZ, route JSONB, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE community_events (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, title TEXT NOT NULL, description TEXT, neighborhood_id UUID REFERENCES neighborhoods(id), organizer_id UUID REFERENCES profiles(id), event_date TIMESTAMPTZ NOT NULL, location TEXT, max_attendees INTEGER, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE survey_templates (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, title TEXT NOT NULL, questions JSONB NOT NULL, created_by UUID REFERENCES profiles(id), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE survey_responses (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, survey_id UUID REFERENCES survey_templates(id) NOT NULL, respondent_id UUID REFERENCES profiles(id), answers JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE audit_log (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, actor_id UUID REFERENCES profiles(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID, details JSONB, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE escalation_log (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, incident_id UUID REFERENCES incidents(id) NOT NULL, escalated_by UUID REFERENCES profiles(id), escalated_to UUID REFERENCES profiles(id), from_role user_role NOT NULL, to_role user_role NOT NULL, reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE directives (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, from_officer UUID REFERENCES profiles(id) NOT NULL, to_officer UUID REFERENCES profiles(id) NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, incident_id UUID REFERENCES incidents(id), is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW());

-- TRIGGER: Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name, phone)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'citizen'), COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- TRIGGER: Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_officer_profiles_updated_at BEFORE UPDATE ON officer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_forum_posts_updated_at BEFORE UPDATE ON forum_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: Enable on all tables
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

-- RLS POLICIES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Officers can view profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('constable','si','sho','dsp','admin','oversight')));
CREATE POLICY "Citizens can create incidents" ON incidents FOR INSERT WITH CHECK (auth.uid() = reporter_id OR is_anonymous = true);
CREATE POLICY "Citizens can view own incidents" ON incidents FOR SELECT USING (reporter_id = auth.uid() OR is_anonymous = true OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen'));
CREATE POLICY "Officers can update incidents" ON incidents FOR UPDATE USING (assigned_officer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('si','sho','dsp','admin')));
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Anyone can view active alerts" ON alerts FOR SELECT USING (is_active = true);
CREATE POLICY "Officers can create alerts" ON alerts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('sho','dsp','admin')));
CREATE POLICY "Users can create SOS" ON sos_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view SOS" ON sos_events FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen'));
CREATE POLICY "Anyone can read forum" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON forum_posts FOR INSERT WITH CHECK (author_id = auth.uid() OR is_anonymous = true);
CREATE POLICY "Citizens can file complaints" ON complaints FOR INSERT WITH CHECK (filed_by = auth.uid() OR is_anonymous = true);
CREATE POLICY "SHO+ can view complaints" ON complaints FOR SELECT USING (filed_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('sho','dsp','admin','oversight')));
CREATE POLICY "Anyone can view zones" ON zones FOR SELECT USING (true);
CREATE POLICY "Anyone can view stations" ON stations FOR SELECT USING (true);
CREATE POLICY "Anyone can view neighborhoods" ON neighborhoods FOR SELECT USING (true);
CREATE POLICY "Admin can manage zones" ON zones FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Admin can manage stations" ON stations FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Officers manage patrol" ON patrol_logs FOR ALL USING (officer_id = auth.uid());
CREATE POLICY "Supervisors view patrol" ON patrol_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('si','sho','dsp','admin')));
CREATE POLICY "Admin/oversight view audit" ON audit_log FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','oversight')));
CREATE POLICY "View own officer profile" ON officer_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Update own officer profile" ON officer_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Supervisors view officers" ON officer_profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('si','sho','dsp','admin')));
CREATE POLICY "SHO/Admin verify officers" ON officer_profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('sho','admin')));
CREATE POLICY "View escalations" ON escalation_log FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('si','sho','dsp','admin')));
CREATE POLICY "Create escalations" ON escalation_log FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('constable','si','sho')));
CREATE POLICY "View own directives" ON directives FOR SELECT USING (from_officer = auth.uid() OR to_officer = auth.uid());
CREATE POLICY "Create directives" ON directives FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('dsp','sho','admin')));

-- SEED DATA
INSERT INTO zones (id, name) VALUES ('a1111111-1111-1111-1111-111111111111', 'Zone West'), ('a2222222-2222-2222-2222-222222222222', 'Zone East');
INSERT INTO stations (id, name, zone_id, address, phone) VALUES ('b1111111-1111-1111-1111-111111111111', 'Palasia Police Station', 'a1111111-1111-1111-1111-111111111111', 'Palasia Square, Indore', '+91-731-2555100'), ('b2222222-2222-2222-2222-222222222222', 'Vijay Nagar Police Station', 'a1111111-1111-1111-1111-111111111111', 'Vijay Nagar, Indore', '+91-731-2555200'), ('b3333333-3333-3333-3333-333333333333', 'Rajwada Police Station', 'a2222222-2222-2222-2222-222222222222', 'Near Rajwada, Indore', '+91-731-2555300');
INSERT INTO neighborhoods (id, name, station_id) VALUES ('c1111111-1111-1111-1111-111111111111', 'Beat 1 — Palasia Square', 'b1111111-1111-1111-1111-111111111111'), ('c2222222-2222-2222-2222-222222222222', 'Beat 2 — Sapna Sangeeta', 'b1111111-1111-1111-1111-111111111111'), ('c3333333-3333-3333-3333-333333333333', 'Beat 3 — AB Road', 'b1111111-1111-1111-1111-111111111111'), ('c4444444-4444-4444-4444-444444444444', 'Beat 4 — MG Road', 'b1111111-1111-1111-1111-111111111111'), ('c5555555-5555-5555-5555-555555555555', 'Beat 5 — Vijay Nagar Main', 'b2222222-2222-2222-2222-222222222222'), ('c6666666-6666-6666-6666-666666666666', 'Beat 6 — Scheme No. 54', 'b2222222-2222-2222-2222-222222222222'), ('c7777777-7777-7777-7777-777777777777', 'Beat 7 — New Palasia', 'b2222222-2222-2222-2222-222222222222');
