-- =========================================================================================
-- FIX 500 ERROR ON PROFILES TABLE - Run this NOW in Supabase SQL Editor
-- This fixes the "login page not loading" issue caused by RLS policy recursion
-- =========================================================================================

-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 1: Drop ALL problematic policies on profiles that cause recursion
-- ─────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Officers can view profiles" ON profiles;       -- THIS ONE CAUSES RECURSION!
DROP POLICY IF EXISTS "Officers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role full access" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow insert for signup trigger" ON profiles;
DROP POLICY IF EXISTS "Allow delete own profile" ON profiles;

-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 2: Create SAFE policies (no recursion)
-- ─────────────────────────────────────────────────────────────────────────────────

-- Any authenticated user can read any profile (safe, no sub-query on profiles)
CREATE POLICY "Authenticated can view profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow profile creation (signup trigger runs as service_role, but also allow direct insert)
CREATE POLICY "Allow insert for signup trigger" ON profiles
  FOR INSERT
  WITH CHECK (true);

-- Allow delete for cascades
CREATE POLICY "Allow delete own profile" ON profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 3: Fix officer_profiles policies too
-- ─────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "View own officer profile" ON officer_profiles;
DROP POLICY IF EXISTS "Update own officer profile" ON officer_profiles;
DROP POLICY IF EXISTS "Supervisors view officers" ON officer_profiles;
DROP POLICY IF EXISTS "SHO/Admin verify officers" ON officer_profiles;
DROP POLICY IF EXISTS "Authenticated can view officers" ON officer_profiles;
DROP POLICY IF EXISTS "Allow insert officer profile" ON officer_profiles;

CREATE POLICY "Authenticated can view officers" ON officer_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Update own officer profile" ON officer_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Allow insert officer profile" ON officer_profiles
  FOR INSERT
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────────
-- DONE! The login page should work now. Refresh your browser.
-- ─────────────────────────────────────────────────────────────────────────────────
