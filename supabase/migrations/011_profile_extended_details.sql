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
