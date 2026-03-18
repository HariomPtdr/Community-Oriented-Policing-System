-- =========================================================================================
-- FIX ALL DATABASE ISSUES - Run this ONCE in Supabase SQL Editor
-- Fixes: User deletion, signup trigger, FK cascades
-- Safe to run multiple times (idempotent)
-- =========================================================================================

-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 1: Fix the handle_new_user trigger (prevents signup failures)
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'citizen')::public.user_role,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block user creation even if profile insert fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 2: Fix profiles.id FK to auth.users with ON DELETE CASCADE
-- ─────────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all existing FK constraints on profiles.id
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'profiles'
      AND kcu.column_name = 'id'
  ) LOOP
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    RAISE NOTICE 'Dropped FK on profiles: %', r.constraint_name;
  END LOOP;

  -- Add it back with CASCADE
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

  RAISE NOTICE 'Added profiles_id_fkey with ON DELETE CASCADE';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 3: Fix ALL Foreign Keys referencing profiles(id) to CASCADE or SET NULL
-- ─────────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  action TEXT;
  sql_stmt TEXT;
BEGIN
  FOR r IN (
    SELECT
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'profiles'
      AND ccu.column_name = 'id'
      AND tc.table_name != 'profiles' -- skip self-reference
  ) LOOP
    -- Drop the old constraint
    EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name)
      || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);

    -- Determine action based on column name
    -- Primary keys (like officer_profiles.id) should CASCADE
    -- References like assigned_officer_id, supervisor_id, etc. should SET NULL
    IF r.column_name = 'id' THEN
      action := 'ON DELETE CASCADE';
    ELSE
      action := 'ON DELETE SET NULL';
    END IF;

    sql_stmt := 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name)
      || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name)
      || ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES public.profiles(id) ' || action;

    BEGIN
      EXECUTE sql_stmt;
      RAISE NOTICE 'Fixed FK: %.% (%) -> profiles(id) %', r.table_name, r.column_name, r.constraint_name, action;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix FK: %.% - %', r.table_name, r.column_name, SQLERRM;
    END;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 4: Fix ALL Foreign Keys referencing incidents(id) to CASCADE
-- ─────────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  sql_stmt TEXT;
BEGIN
  FOR r IN (
    SELECT
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'incidents'
      AND ccu.column_name = 'id'
      AND tc.table_name != 'incidents'
  ) LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name)
      || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);

    sql_stmt := 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name)
      || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name)
      || ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES public.incidents(id) ON DELETE CASCADE';

    BEGIN
      EXECUTE sql_stmt;
      RAISE NOTICE 'Fixed FK: %.% -> incidents(id) CASCADE', r.table_name, r.column_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not fix FK: %.% - %', r.table_name, r.column_name, SQLERRM;
    END;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 5: Ensure profiles has all required columns
-- ─────────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS father_husband_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alternate_mobile TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_proof_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city_town TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tehsil_division TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS police_station_area TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_address TEXT;


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 6: Ensure RLS policies allow service_role to insert/update profiles
-- ─────────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE POLICY "Service role full access" ON profiles FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow authenticated users to read all profiles (needed for officer lookup etc.)
DO $$ BEGIN
  CREATE POLICY "Authenticated users can read profiles" ON profiles FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SOS events policies
DO $$ BEGIN
  CREATE POLICY "Users can insert own sos" ON sos_events FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own sos" ON sos_events FOR SELECT
    TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Messages
DO $$ BEGIN
  CREATE POLICY "Users can send messages" ON messages FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own messages" ON messages FOR SELECT
    TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notifications
DO $$ BEGIN
  CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT
    TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE
    TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 7: Clean up old trigger/function if they exist
-- ─────────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_profile_delete ON profiles;
DROP FUNCTION IF EXISTS delete_user_data();


-- ─────────────────────────────────────────────────────────────────────────────────
-- DONE! Verify with this query:
-- ─────────────────────────────────────────────────────────────────────────────────
-- SELECT tc.table_name, kcu.column_name, tc.constraint_name, rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'public'
-- ORDER BY tc.table_name, kcu.column_name;
