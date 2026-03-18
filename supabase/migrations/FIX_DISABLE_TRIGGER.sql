-- =============================================
-- DISABLE the trigger - we'll handle profile creation in app code
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
