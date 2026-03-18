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
