-- =============================================
-- 007_rank_rls.sql — Rank-scoped RLS policies
-- Constables see only their beat, SI sees supervised beats, etc.
-- =============================================

-- Constable: Only see incidents in their beat
CREATE POLICY "Constable: beat-scoped incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM officer_profiles op
      WHERE op.id = auth.uid()
      AND op.role = 'constable'
      AND op.beat_id = incidents.neighborhood_id
    )
  );

-- SI: See incidents in supervised beats
CREATE POLICY "SI: supervised-beat incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM officer_profiles op
      JOIN neighborhoods n ON n.assigned_si_id = op.id
      WHERE op.id = auth.uid()
      AND op.role = 'si'
      AND n.id = incidents.neighborhood_id
    )
  );

-- SHO: See all incidents in their station
CREATE POLICY "SHO: station-scoped incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM officer_profiles op
      JOIN stations s ON s.sho_id = op.id
      JOIN neighborhoods n ON n.station_id = s.id
      WHERE op.id = auth.uid()
      AND op.role = 'sho'
      AND n.id = incidents.neighborhood_id
    )
  );

-- DSP: See all incidents in their zone
CREATE POLICY "DSP: zone-scoped incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM officer_profiles op
      JOIN zones z ON z.dsp_id = op.id
      JOIN stations s ON s.zone_id = z.id
      JOIN neighborhoods n ON n.station_id = s.id
      WHERE op.id = auth.uid()
      AND op.role = 'dsp'
      AND n.id = incidents.neighborhood_id
    )
  );

-- Admin: See all incidents
CREATE POLICY "Admin: all incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Oversight: Read-only access to all data
CREATE POLICY "Oversight: read-only all incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'oversight'
    )
  );

-- Constable: beat-scoped complaints view
CREATE POLICY "Constable cannot view complaints" ON complaints
  FOR SELECT USING (
    NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'constable'
    )
    OR filed_by = auth.uid()
  );

-- Oversight: read-only on complaints
CREATE POLICY "Oversight: read-only complaints" ON complaints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'oversight'
    )
  );

-- Prevent oversight from modifying anything
-- (They can only SELECT — no INSERT, UPDATE, DELETE policies)
