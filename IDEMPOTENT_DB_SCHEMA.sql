-- =========================================================================================
-- MASTER IDEMPOTENT DB SCHEMA FOR COPS PLATFORM
-- You can safely run this script multiple times in the Supabase SQL Editor.
-- It will NOT delete existing tables or data. It handles "Already Exists" edge cases.
-- =========================================================================================

-- ─────────────────────────────────────────────────────────────────────────────────
-- 1. ENUMS (Safe Creation)
-- ─────────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('citizen', 'constable', 'si', 'sho', 'dsp', 'admin', 'oversight'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE incident_status AS ENUM ('draft', 'submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'submitted'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'closed'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE incident_priority AS ENUM ('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE incident_category AS ENUM ('theft', 'assault', 'vandalism', 'robbery', 'burglary', 'traffic', 'noise_complaint', 'suspicious_activity', 'drug_activity', 'domestic', 'missing_person', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE alert_type AS ENUM ('crime_alert', 'missing_person', 'wanted_notice', 'safety_advisory', 'sos'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE complaint_status AS ENUM ('filed', 'under_review', 'investigating', 'resolved', 'dismissed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE complaint_type AS ENUM ('simple_theft', 'cyber_crime', 'ncr', 'cheating_fraud', 'burglary'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE filing_mode AS ENUM ('self', 'behalf'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE property_type AS ENUM ('mobile_phone', 'vehicle', 'cash', 'jewellery', 'electronics', 'documents', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE cyber_crime_type AS ENUM ('online_fraud', 'upi_scam', 'credit_debit_fraud', 'social_media_hack', 'phishing', 'otp_scam', 'fake_job_scam', 'cyber_bullying', 'identity_theft', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE cyber_platform AS ENUM ('whatsapp', 'instagram', 'facebook', 'telegram', 'website', 'phone_call', 'email', 'upi_app', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE fraud_type AS ENUM ('money_lending_fraud', 'business_fraud', 'property_fraud', 'online_investment_scam', 'job_offer_scam', 'fake_company_fraud', 'loan_fraud', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'upi', 'cheque', 'online_payment', 'crypto'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE premises_type AS ENUM ('residential_house', 'apartment', 'shop', 'office', 'warehouse', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE entry_method AS ENUM ('door_broken', 'window_broken', 'lock_cut', 'duplicate_key_suspected', 'unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ncr_type AS ENUM ('noise_complaint', 'neighbour_dispute'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE evidence_category AS ENUM ('property_photo', 'proof', 'screenshot', 'transaction_receipt', 'cctv_footage', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- 2. TABLES (Safe Creation)
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Indore',
  state TEXT NOT NULL DEFAULT 'Madhya Pradesh',
  dsp_id UUID,
  boundary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
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

CREATE TABLE IF NOT EXISTS neighborhoods (
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

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS officer_profiles (
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

CREATE TABLE IF NOT EXISTS incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category incident_category NOT NULL DEFAULT 'other',
  status incident_status NOT NULL DEFAULT 'draft',
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

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id),
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  recipient_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_anonymous_sender BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
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

CREATE TABLE IF NOT EXISTS sos_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  responded_by UUID REFERENCES profiles(id),
  responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_posts (
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

CREATE TABLE IF NOT EXISTS complaints (
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

CREATE TABLE IF NOT EXISTS patrol_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  officer_id UUID REFERENCES profiles(id) NOT NULL,
  beat_id UUID REFERENCES neighborhoods(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  route JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_events (
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

CREATE TABLE IF NOT EXISTS survey_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID REFERENCES survey_templates(id) NOT NULL,
  respondent_id UUID REFERENCES profiles(id),
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id) NOT NULL,
  escalated_by UUID REFERENCES profiles(id),
  escalated_to UUID REFERENCES profiles(id),
  from_role user_role NOT NULL,
  to_role user_role NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS directives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_officer UUID REFERENCES profiles(id) NOT NULL,
  to_officer UUID REFERENCES profiles(id) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  incident_id UUID REFERENCES incidents(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advanced Incident Tables
CREATE TABLE IF NOT EXISTS incident_simple_theft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  property_type property_type NOT NULL DEFAULT 'other',
  property_description TEXT,
  property_details JSONB DEFAULT '{}',
  estimated_price NUMERIC(15, 2),
  suspect_name TEXT,
  suspect_address TEXT,
  suspect_description TEXT,
  suspect_phone TEXT,
  property_photos TEXT[] DEFAULT '{}',
  proof_files TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS incident_cyber_crime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  cyber_type cyber_crime_type NOT NULL DEFAULT 'other',
  platform_used TEXT[] DEFAULT '{}',
  platform_other_desc TEXT,
  website_url TEXT,
  amount_lost NUMERIC(15, 2),
  transaction_id TEXT,
  upi_id TEXT,
  ifsc_code TEXT,
  bank_name TEXT,
  date_of_transaction DATE,
  suspect_name TEXT,
  suspect_phone TEXT,
  suspect_website TEXT,
  suspect_social_handle TEXT,
  suspect_description TEXT,
  proof_files TEXT[] DEFAULT '{}',
  platform_details JSONB DEFAULT '{}',
  cyber_type_details JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS incident_cheating_fraud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  fraud_type fraud_type NOT NULL DEFAULT 'other',
  fraud_amount NUMERIC(15, 2),
  payment_method TEXT,
  has_transaction BOOLEAN DEFAULT FALSE,
  transaction_id TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  upi_id TEXT,
  suspect_name TEXT,
  suspect_mob TEXT,
  suspect_address TEXT,
  suspect_company TEXT,
  suspect_website TEXT,
  suspect_bank_acc TEXT,
  proof_files TEXT[] DEFAULT '{}',
  fraud_details JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS incident_burglary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  premises_type premises_type NOT NULL DEFAULT 'other',
  entry_method TEXT,
  cctv_available BOOLEAN,
  stolen_property_desc TEXT,
  estimated_value NUMERIC(15, 2),
  suspect_name TEXT,
  suspect_address TEXT,
  suspect_description TEXT,
  proof_files TEXT[] DEFAULT '{}',
  premises_details JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS incident_ncr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  ncr_type ncr_type NOT NULL DEFAULT 'noise_complaint',
  description TEXT,
  suspect_name TEXT,
  suspect_address TEXT,
  suspect_phone TEXT,
  suspect_description TEXT
);

CREATE TABLE IF NOT EXISTS incident_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  bucket TEXT NOT NULL DEFAULT 'incident-evidence',
  storage_path TEXT NOT NULL,
  public_url TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  category evidence_category NOT NULL DEFAULT 'proof'
);

CREATE TABLE IF NOT EXISTS incident_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES profiles(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- 3. SCHEMA UPDATES (Safe Alterations for New Columns)
-- ─────────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS father_husband_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alternate_mobile TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_proof_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city_town TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tehsil_division TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS police_station_area TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_address TEXT;

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS filing_mode filing_mode DEFAULT 'self';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS behalf_name TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS behalf_relation TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS behalf_contact TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS complaint_type complaint_type;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS fir_number TEXT UNIQUE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS io_assigned_id UUID REFERENCES profiles(id);
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
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_district TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_police_station TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_state TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_city TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_date DATE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS i_approx_time TIME;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS detailed_description TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS has_suspect BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS has_proof BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ai_priority TEXT CHECK (ai_priority IN ('critical','high','medium','low'));
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ai_categorized_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS citizen_signature TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS your_loss_amount NUMERIC(15,2);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS total_estimated_loss NUMERIC(15,2);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS total_recovered_value NUMERIC(15,2);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS current_step SMALLINT DEFAULT 1;

ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS practice_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS initial_status TEXT DEFAULT 'active';
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS sms_sent_to TEXT[] DEFAULT '{}';

-- SHO Announcements to Citizens
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

-- Monthly Police Stats (aggregated per station)
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

-- ─────────────────────────────────────────────────────────────────────────────────
-- 4. INDEXES (Safe Creation)
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_officer ON incidents(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_neighborhood ON incidents(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_neighborhood ON profiles(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_officer_station ON officer_profiles(station_id);
CREATE INDEX IF NOT EXISTS idx_officer_beat ON officer_profiles(beat_id);
CREATE INDEX IF NOT EXISTS idx_officer_zone ON officer_profiles(zone_id);
CREATE INDEX IF NOT EXISTS idx_officer_verified ON officer_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_messages_incident ON messages(incident_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_neighborhood ON alerts(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_sos_user ON sos_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_created ON sos_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_events_user_created ON sos_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_neighborhood ON forum_posts(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_forum_created ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_officer ON complaints(against_officer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stations_zone ON stations(zone_id);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_station ON neighborhoods(station_id);
CREATE INDEX IF NOT EXISTS idx_escalation_incident ON escalation_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_escalation_created ON escalation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_directives_to ON directives(to_officer);
CREATE INDEX IF NOT EXISTS idx_directives_from ON directives(from_officer);
CREATE INDEX IF NOT EXISTS idx_evidence_incident ON incident_evidence(incident_id);
CREATE INDEX IF NOT EXISTS idx_status_history_incident ON incident_status_history(incident_id);
CREATE INDEX IF NOT EXISTS idx_incidents_complaint_type ON incidents(complaint_type);
CREATE INDEX IF NOT EXISTS idx_incidents_station ON incidents(station_id);
CREATE INDEX IF NOT EXISTS idx_incidents_i_date ON incidents(i_date);
CREATE INDEX IF NOT EXISTS idx_incidents_fir_number ON incidents(fir_number);


-- ─────────────────────────────────────────────────────────────────────────────────
-- 5. TRIGGERS & FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'citizen')::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_incidents_updated_at ON incidents;
CREATE TRIGGER set_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_officer_profiles_updated_at ON officer_profiles;
CREATE TRIGGER set_officer_profiles_updated_at BEFORE UPDATE ON officer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_forum_posts_updated_at ON forum_posts;
CREATE TRIGGER set_forum_posts_updated_at BEFORE UPDATE ON forum_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_complaints_updated_at ON complaints;
CREATE TRIGGER set_complaints_updated_at BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS) Enable
-- ─────────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
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
  ALTER TABLE incident_simple_theft ENABLE ROW LEVEL SECURITY;
  ALTER TABLE incident_cyber_crime ENABLE ROW LEVEL SECURITY;
  ALTER TABLE incident_cheating_fraud ENABLE ROW LEVEL SECURITY;
  ALTER TABLE incident_burglary ENABLE ROW LEVEL SECURITY;
  ALTER TABLE incident_ncr ENABLE ROW LEVEL SECURITY;
  ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;
  ALTER TABLE incident_status_history ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- 7. POLICIES (Safe Creation via Ignore duplicate)
-- ─────────────────────────────────────────────────────────────────────────────────
-- NOTE: We use auth.role() = 'authenticated' instead of querying profiles inside
-- a profiles policy, which would cause INFINITE RECURSION and 500 errors.
DO $$ BEGIN
  CREATE POLICY "Authenticated can view profiles" ON profiles FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow insert for signup trigger" ON profiles FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable generic public read for development/MVP purposes if needed, otherwise rely on specific
DO $$ BEGIN CREATE POLICY "Citizens can create incidents" ON incidents FOR INSERT WITH CHECK (auth.uid() = reporter_id OR is_anonymous = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Citizens can view own incidents" ON incidents FOR SELECT USING (reporter_id = auth.uid() OR is_anonymous = true OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Officers can update assigned incidents" ON incidents FOR UPDATE USING (assigned_officer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('si', 'sho', 'dsp', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Additional simple sub-table policies
DO $$ BEGIN CREATE POLICY "citizen_own_simple_theft" ON incident_simple_theft FOR ALL TO authenticated USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "citizen_own_cyber_crime" ON incident_cyber_crime FOR ALL TO authenticated USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "citizen_own_cheating_fraud" ON incident_cheating_fraud FOR ALL TO authenticated USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "citizen_own_burglary" ON incident_burglary FOR ALL TO authenticated USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "citizen_own_ncr" ON incident_ncr FOR ALL TO authenticated USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "citizen_own_evidence_select" ON incident_evidence FOR SELECT TO authenticated USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "citizen_own_evidence_insert" ON incident_evidence FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "citizen_own_evidence_delete" ON incident_evidence FOR DELETE TO authenticated USING (uploaded_by = auth.uid() AND incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid() AND status = 'draft')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "citizen_own_status_history" ON incident_status_history FOR SELECT TO authenticated USING (incident_id IN (SELECT id FROM incidents WHERE reporter_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "system_insert_status_history" ON incident_status_history FOR INSERT TO authenticated WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================================
-- 8. USER DELETION CASCADES (Proper FK Constraints for Supabase Dashboard)
-- =========================================================================================

-- We drop the old trigger since we're using proper FK constraints now
DROP TRIGGER IF EXISTS on_profile_delete ON profiles;
DROP FUNCTION IF EXISTS delete_user_data();

DO $$
DECLARE
  r RECORD;
  fk_def TEXT;
  on_delete_action TEXT;
BEGIN
  -- 1. Ensure `profiles.id` has ON DELETE CASCADE from auth.users
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'profiles' AND kcu.column_name = 'id'
  ) LOOP
    EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
  ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

  -- 2. Dynamically replace all FOREIGN KEYS referencing profiles(id)
  --    with correct ON DELETE CASCADE or ON DELETE SET NULL so Supabase user deletes don't fail.
  FOR r IN (
    SELECT tc.table_name, tc.constraint_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'profiles' AND ccu.column_name = 'id'
  ) LOOP
    -- Drop the existing constraint
    EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    
    -- Determine the appropriate action
    IF r.column_name IN ('assigned_officer_id', 'escalated_to_id', 'io_assigned_id', 'supervisor_id', 'responded_by', 'filed_by', 'reviewed_by', 'actor_id', 'escalated_by', 'escalated_to', 'changed_by') THEN
      on_delete_action := 'ON DELETE SET NULL';
    ELSE
      on_delete_action := 'ON DELETE CASCADE';
    END IF;

    -- Create the new constraint
    fk_def := 'ALTER TABLE ' || quote_ident(r.table_name) || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES profiles(id) ' || on_delete_action;
    BEGIN
      EXECUTE fk_def;
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- Ignore if it somehow exists
    END;
  END LOOP;

  -- 3. Also fix dependent tables of incidents (ON DELETE CASCADE to incidents)
  FOR r IN (
    SELECT tc.table_name, tc.constraint_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'incidents' AND ccu.column_name = 'id'
  ) LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    
    -- All incident children should cascade
    fk_def := 'ALTER TABLE ' || quote_ident(r.table_name) || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES incidents(id) ON DELETE CASCADE';
    BEGIN
      EXECUTE fk_def;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;

EXCEPTION WHEN OTHERS THEN 
  -- Log standard exceptions silently to prevent blocking the rest of the script 
  NULL;
END $$;

-- =========================================================================================
-- END OF IDEMPOTENT DB SCHEMA
-- =========================================================================================
