-- Add profile_completed column to profiles table
-- This field locks identity fields (name, father's name, gender, ID proof, address) 
-- after registration so they cannot be changed

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- For existing users who already have all registration data filled, mark as completed
UPDATE profiles 
SET profile_completed = TRUE 
WHERE full_name IS NOT NULL 
  AND father_husband_name IS NOT NULL 
  AND gender IS NOT NULL 
  AND id_proof_type IS NOT NULL 
  AND id_number IS NOT NULL 
  AND state IS NOT NULL;
