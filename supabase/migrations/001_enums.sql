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
