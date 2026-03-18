-- =============================================
-- 005_rls_base.sql — Row Level Security policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrol_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Officers can view citizen profiles (for case handling)
CREATE POLICY "Officers can view profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('constable', 'si', 'sho', 'dsp', 'admin', 'oversight')
    )
  );

-- ============ INCIDENTS ============
-- Citizens can create incidents
CREATE POLICY "Citizens can create incidents" ON incidents
  FOR INSERT WITH CHECK (auth.uid() = reporter_id OR is_anonymous = true);

-- Citizens can view own incidents
CREATE POLICY "Citizens can view own incidents" ON incidents
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR is_anonymous = true
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen'
    )
  );

-- Officers can update incidents assigned to them
CREATE POLICY "Officers can update assigned incidents" ON incidents
  FOR UPDATE USING (
    assigned_officer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('si', 'sho', 'dsp', 'admin')
    )
  );

-- ============ MESSAGES ============
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ============ NOTIFICATIONS ============
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============ ALERTS ============
CREATE POLICY "Anyone can view active alerts" ON alerts
  FOR SELECT USING (is_active = true);

CREATE POLICY "Officers can create alerts" ON alerts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('sho', 'dsp', 'admin')
    )
  );

-- ============ SOS ============
CREATE POLICY "Users can create SOS" ON sos_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own SOS" ON sos_events
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role != 'citizen'
    )
  );

-- ============ FORUM ============
CREATE POLICY "Anyone in community can read forum" ON forum_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create posts" ON forum_posts
  FOR INSERT WITH CHECK (author_id = auth.uid() OR is_anonymous = true);

-- ============ COMPLAINTS ============
CREATE POLICY "Citizens can file complaints" ON complaints
  FOR INSERT WITH CHECK (filed_by = auth.uid() OR is_anonymous = true);

CREATE POLICY "SHO+ can view complaints" ON complaints
  FOR SELECT USING (
    filed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('sho', 'dsp', 'admin', 'oversight')
    )
  );

-- ============ GEOGRAPHY (public read) ============
CREATE POLICY "Anyone can view zones" ON zones FOR SELECT USING (true);
CREATE POLICY "Anyone can view stations" ON stations FOR SELECT USING (true);
CREATE POLICY "Anyone can view neighborhoods" ON neighborhoods FOR SELECT USING (true);

CREATE POLICY "Admin can manage zones" ON zones FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Admin can manage stations" ON stations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============ PATROL LOGS ============
CREATE POLICY "Officers can manage own patrol logs" ON patrol_logs
  FOR ALL USING (officer_id = auth.uid());

CREATE POLICY "Supervisors can view patrol logs" ON patrol_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('si', 'sho', 'dsp', 'admin')
    )
  );

-- ============ AUDIT LOG ============
CREATE POLICY "Admin and oversight can view audit log" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'oversight')
    )
  );

-- ============ OFFICER PROFILES ============
CREATE POLICY "Officers can view own officer profile" ON officer_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Officers can update own profile" ON officer_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Supervisors can view officer profiles" ON officer_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('si', 'sho', 'dsp', 'admin')
    )
  );

-- SHO and admin can verify officers
CREATE POLICY "SHO/Admin can verify officers" ON officer_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('sho', 'admin')
    )
  );
