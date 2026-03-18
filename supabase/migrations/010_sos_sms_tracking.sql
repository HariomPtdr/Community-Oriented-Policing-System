-- =============================================
-- 010_sos_sms_tracking.sql — SMS/WhatsApp tracking for SOS
-- =============================================

-- Track which contacts were sent WhatsApp/SMS during SOS
ALTER TABLE sos_events ADD COLUMN IF NOT EXISTS sms_sent_to TEXT[] DEFAULT '{}';

-- Index for history lookup (most recent first)
CREATE INDEX IF NOT EXISTS idx_sos_events_user_created
  ON sos_events(user_id, created_at DESC);
