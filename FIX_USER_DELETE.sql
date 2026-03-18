-- =========================================================================================
-- FIX USER DELETION - Run this in Supabase SQL Editor
-- Fixes: "Failed to delete user: Database error deleting user"
-- 
-- This script ensures ALL foreign keys cascade properly when a user is deleted
-- from the Supabase Dashboard (auth.users -> profiles -> all dependent tables)
-- =========================================================================================

-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 1: Diagnostic - See what's currently blocking deletion
-- ─────────────────────────────────────────────────────────────────────────────────

-- First, let's see ALL FKs referencing auth.users(id)
DO $$
DECLARE
  r RECORD;
  cnt INTEGER := 0;
BEGIN
  RAISE NOTICE '========== FKs referencing auth.users(id) ==========';
  FOR r IN (
    SELECT tc.table_schema, tc.table_name, kcu.column_name, tc.constraint_name, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc 
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth' AND ccu.table_name = 'users' AND ccu.column_name = 'id'
    ORDER BY tc.table_name
  ) LOOP
    RAISE NOTICE 'FK: %.%.% -> auth.users(id) [%] constraint=%', 
      r.table_schema, r.table_name, r.column_name, r.delete_rule, r.constraint_name;
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Total FKs on auth.users: %', cnt;

  cnt := 0;
  RAISE NOTICE '';
  RAISE NOTICE '========== FKs referencing profiles(id) ==========';
  FOR r IN (
    SELECT tc.table_schema, tc.table_name, kcu.column_name, tc.constraint_name, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc 
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public' AND ccu.table_name = 'profiles' AND ccu.column_name = 'id'
      AND tc.table_name != 'profiles'
    ORDER BY tc.table_name, kcu.column_name
  ) LOOP
    RAISE NOTICE 'FK: %.%.% -> profiles(id) [%] constraint=%', 
      r.table_schema, r.table_name, r.column_name, r.delete_rule, r.constraint_name;
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'Total FKs on profiles(id): %', cnt;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 2: Fix profiles.id -> auth.users(id) with ON DELETE CASCADE
-- ─────────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop ALL existing FK constraints on profiles.id -> auth.users
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
    RAISE NOTICE 'Dropped: profiles.%', r.constraint_name;
  END LOOP;

  -- Re-add with CASCADE
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

  RAISE NOTICE '✅ profiles.id -> auth.users(id) ON DELETE CASCADE';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 3: Fix ALL FK constraints referencing profiles(id) 
--         Use CASCADE for "identity" FKs (id columns, user_id, officer_id, etc.)
--         Use SET NULL for "reference" FKs (assigned_officer_id, supervisor_id, etc.)
-- ─────────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  action TEXT;
  sql_stmt TEXT;
  is_not_null BOOLEAN;
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
      AND tc.table_name != 'profiles'
    ORDER BY tc.table_name, kcu.column_name
  ) LOOP
    -- Drop the old constraint
    EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name)
      || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);

    -- Columns that ARE the user's identity should CASCADE (delete their data)
    -- Columns that merely REFERENCE a user should SET NULL (keep the record, remove reference)
    IF r.column_name IN ('id', 'user_id', 'officer_id', 'author_id', 'organizer_id', 
                          'reporter_id', 'sender_id', 'recipient_id', 'respondent_id',
                          'uploaded_by', 'from_officer', 'to_officer', 'created_by') THEN
      action := 'ON DELETE CASCADE';
    ELSE
      action := 'ON DELETE SET NULL';
    END IF;

    -- For SET NULL, we need to make sure the column is nullable
    IF action = 'ON DELETE SET NULL' THEN
      -- Check if column has NOT NULL constraint
      SELECT is_nullable = 'NO' INTO is_not_null
      FROM information_schema.columns
      WHERE table_schema = r.table_schema
        AND table_name = r.table_name
        AND column_name = r.column_name;

      IF is_not_null THEN
        -- Drop the NOT NULL constraint so SET NULL can work
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name)
          || ' ALTER COLUMN ' || quote_ident(r.column_name) || ' DROP NOT NULL';
        RAISE NOTICE '  Dropped NOT NULL on %.%', r.table_name, r.column_name;
      END IF;
    END IF;

    sql_stmt := 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name)
      || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name)
      || ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES public.profiles(id) ' || action;

    BEGIN
      EXECUTE sql_stmt;
      RAISE NOTICE '✅ %.% -> profiles(id) %', r.table_name, r.column_name, action;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Failed: %.% - %', r.table_name, r.column_name, SQLERRM;
    END;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 4: Fix ALL FK constraints referencing incidents(id) -> ON DELETE CASCADE
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
    ORDER BY tc.table_name
  ) LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name)
      || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);

    sql_stmt := 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name)
      || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name)
      || ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES public.incidents(id) ON DELETE CASCADE';

    BEGIN
      EXECUTE sql_stmt;
      RAISE NOTICE '✅ %.% -> incidents(id) CASCADE', r.table_name, r.column_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Failed: %.% - %', r.table_name, r.column_name, SQLERRM;
    END;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 5: Fix FK constraints on survey_responses -> survey_templates (CASCADE)
-- ─────────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'survey_responses'
      AND ccu.table_name = 'survey_templates'
  ) LOOP
    EXECUTE 'ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;

  ALTER TABLE survey_responses
    ADD CONSTRAINT survey_responses_survey_id_fkey
    FOREIGN KEY (survey_id) REFERENCES survey_templates(id) ON DELETE CASCADE;
  RAISE NOTICE '✅ survey_responses.survey_id -> survey_templates(id) CASCADE';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'survey_responses fix skipped: %', SQLERRM;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 6: Clean up any old custom delete triggers/functions
-- ─────────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_profile_delete ON profiles;
DROP FUNCTION IF EXISTS delete_user_data();
DROP TRIGGER IF EXISTS on_user_delete ON auth.users;
DROP FUNCTION IF EXISTS handle_user_delete();


-- ─────────────────────────────────────────────────────────────────────────────────
-- STEP 7: Verify - Run this to check everything is CASCADE/SET NULL
-- ─────────────────────────────────────────────────────────────────────────────────
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column,
  rc.delete_rule,
  CASE 
    WHEN rc.delete_rule IN ('CASCADE', 'SET NULL') THEN '✅'
    ELSE '❌ NEEDS FIX'
  END AS status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
