-- =============================================
-- FIX: Replace broken RLS policies on profiles
-- This fixes the infinite recursion error
-- =============================================

-- Drop the broken policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Officers can view profiles" ON profiles;
DROP POLICY IF EXISTS "Officers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role full access" ON profiles;

-- Simple, safe policies that don't cause recursion:

-- Everyone can see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Authenticated users can see all profiles (needed for officer lookups etc)
CREATE POLICY "Authenticated can view profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow the signup trigger to insert profiles (runs as service_role)
CREATE POLICY "Allow insert for signup trigger" ON profiles
  FOR INSERT WITH CHECK (true);

-- Fix officer_profiles too
DROP POLICY IF EXISTS "View own officer profile" ON officer_profiles;
DROP POLICY IF EXISTS "Update own officer profile" ON officer_profiles;
DROP POLICY IF EXISTS "Supervisors view officers" ON officer_profiles;
DROP POLICY IF EXISTS "SHO/Admin verify officers" ON officer_profiles;

CREATE POLICY "Authenticated can view officers" ON officer_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Update own officer profile" ON officer_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Allow insert officer profile" ON officer_profiles
  FOR INSERT WITH CHECK (true);
