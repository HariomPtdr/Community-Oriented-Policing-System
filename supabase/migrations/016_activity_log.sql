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
