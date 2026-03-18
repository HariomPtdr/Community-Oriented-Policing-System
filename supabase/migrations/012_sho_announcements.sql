-- =============================================
-- 012_sho_announcements.sql — SHO Announcements to Citizens
-- Messages/Announcements that SHO can broadcast to citizens in their area
-- =============================================

-- SHO Announcements table
CREATE TABLE IF NOT EXISTS sho_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'safety', 'advisory', 'traffic', 'festival', 'weather', 'curfew', 'other')),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  target_neighborhoods UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sho_announcements_station ON sho_announcements(station_id);
CREATE INDEX IF NOT EXISTS idx_sho_announcements_active ON sho_announcements(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sho_announcements_created ON sho_announcements(created_at DESC);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS set_sho_announcements_updated_at ON sho_announcements;
CREATE TRIGGER set_sho_announcements_updated_at 
  BEFORE UPDATE ON sho_announcements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE sho_announcements ENABLE ROW LEVEL SECURITY;

-- Citizens can read active announcements
DROP POLICY IF EXISTS "Citizens can view announcements" ON sho_announcements;
CREATE POLICY "Citizens can view announcements" ON sho_announcements
  FOR SELECT TO authenticated
  USING (is_active = true);

-- SHO/Admin can manage announcements
DROP POLICY IF EXISTS "SHO can manage announcements" ON sho_announcements;
CREATE POLICY "SHO can manage announcements" ON sho_announcements
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================
-- Monthly Police Stats (aggregated view for citizens)
-- This stores pre-computed monthly statistics per station
-- =============================================

CREATE TABLE IF NOT EXISTS monthly_police_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  total_cases INTEGER DEFAULT 0,
  cases_solved INTEGER DEFAULT 0,
  cases_pending INTEGER DEFAULT 0,
  fir_registered INTEGER DEFAULT 0,
  arrests_made INTEGER DEFAULT 0,
  chargesheeted INTEGER DEFAULT 0,
  conviction_count INTEGER DEFAULT 0,
  avg_response_time_mins INTEGER DEFAULT 0,
  patrol_hours INTEGER DEFAULT 0,
  safety_score INTEGER DEFAULT 0 CHECK (safety_score >= 0 AND safety_score <= 100),
  crime_rate_change DECIMAL(5,2) DEFAULT 0,
  top_crime_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(station_id, month, year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monthly_stats_station ON monthly_police_stats(station_id, year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_period ON monthly_police_stats(year, month);

-- Auto-update timestamp
DROP TRIGGER IF EXISTS set_monthly_stats_updated_at ON monthly_police_stats;
CREATE TRIGGER set_monthly_stats_updated_at 
  BEFORE UPDATE ON monthly_police_stats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE monthly_police_stats ENABLE ROW LEVEL SECURITY;

-- Everyone can read stats (public transparency data)
DROP POLICY IF EXISTS "Anyone can view monthly stats" ON monthly_police_stats;
CREATE POLICY "Anyone can view monthly stats" ON monthly_police_stats
  FOR SELECT TO authenticated
  USING (true);

-- Admin/SHO can manage stats
DROP POLICY IF EXISTS "Admin can manage monthly stats" ON monthly_police_stats;
CREATE POLICY "Admin can manage monthly stats" ON monthly_police_stats
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
