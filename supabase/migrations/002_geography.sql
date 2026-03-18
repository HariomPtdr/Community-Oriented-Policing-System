-- =============================================
-- 002_geography.sql — Zones, Stations, Neighborhoods
-- Must run BEFORE core_tables (profiles needs station_id FK)
-- =============================================

CREATE TABLE zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Indore',
  state TEXT NOT NULL DEFAULT 'Madhya Pradesh',
  dsp_id UUID,
  boundary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  zone_id UUID REFERENCES zones(id),
  sho_id UUID,
  address TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE neighborhoods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Indore',
  state TEXT NOT NULL DEFAULT 'Madhya Pradesh',
  station_id UUID REFERENCES stations(id),
  assigned_constable_id UUID,
  assigned_si_id UUID,
  boundary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE zones IS 'Geographic zones managed by DSPs';
COMMENT ON TABLE stations IS 'Police stations within zones, managed by SHOs';
COMMENT ON TABLE neighborhoods IS 'Beat areas within stations, patrolled by constables';
