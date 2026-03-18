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
