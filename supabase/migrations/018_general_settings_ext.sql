-- Add emergency and volunteer fields to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT FALSE;
