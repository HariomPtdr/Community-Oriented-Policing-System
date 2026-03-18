-- =============================================
-- STEP 1: DROP EVERYTHING (run this FIRST)
-- =============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS set_incidents_updated_at ON incidents;
DROP TRIGGER IF EXISTS set_officer_profiles_updated_at ON officer_profiles;
DROP TRIGGER IF EXISTS set_forum_posts_updated_at ON forum_posts;
DROP TRIGGER IF EXISTS set_complaints_updated_at ON complaints;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at();

DROP TABLE IF EXISTS survey_responses CASCADE;
DROP TABLE IF EXISTS survey_templates CASCADE;
DROP TABLE IF EXISTS community_events CASCADE;
DROP TABLE IF EXISTS patrol_logs CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS directives CASCADE;
DROP TABLE IF EXISTS escalation_log CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS sos_events CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS officer_profiles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS neighborhoods CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS zones CASCADE;

DROP TYPE IF EXISTS complaint_status CASCADE;
DROP TYPE IF EXISTS alert_type CASCADE;
DROP TYPE IF EXISTS incident_category CASCADE;
DROP TYPE IF EXISTS incident_priority CASCADE;
DROP TYPE IF EXISTS incident_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
