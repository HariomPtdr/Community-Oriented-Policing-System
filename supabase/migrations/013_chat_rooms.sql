-- =============================================
-- 013_chat_rooms.sql — Citizen-Officer Chat System
-- Chat rooms linked to incidents for real-time communication
-- =============================================

-- Chat Rooms table (one per incident, linking citizen and assigned officer)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  citizen_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  officer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(incident_id)
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_citizen ON chat_rooms(citizen_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_officer ON chat_rooms(officer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_incident ON chat_rooms(incident_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_msg ON chat_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

-- Auto-update timestamp on chat_rooms
DROP TRIGGER IF EXISTS set_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER set_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat room policies: only participants can see their rooms
DROP POLICY IF EXISTS "Users can view own chat rooms" ON chat_rooms;
CREATE POLICY "Users can view own chat rooms" ON chat_rooms
  FOR SELECT TO authenticated
  USING (citizen_id = auth.uid() OR officer_id = auth.uid());

DROP POLICY IF EXISTS "System can create chat rooms" ON chat_rooms;
CREATE POLICY "System can create chat rooms" ON chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Participants can update chat rooms" ON chat_rooms;
CREATE POLICY "Participants can update chat rooms" ON chat_rooms
  FOR UPDATE TO authenticated
  USING (citizen_id = auth.uid() OR officer_id = auth.uid());

-- Chat messages policies: only room participants can read/write messages
DROP POLICY IF EXISTS "Participants can view messages" ON chat_messages;
CREATE POLICY "Participants can view messages" ON chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = room_id
      AND (cr.citizen_id = auth.uid() OR cr.officer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can send messages" ON chat_messages;
CREATE POLICY "Participants can send messages" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = room_id
      AND (cr.citizen_id = auth.uid() OR cr.officer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Sender can update own messages" ON chat_messages;
CREATE POLICY "Sender can update own messages" ON chat_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- Function to auto-create chat room when officer is assigned to incident
CREATE OR REPLACE FUNCTION create_chat_room_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_officer_id IS NOT NULL AND (OLD.assigned_officer_id IS NULL OR OLD.assigned_officer_id != NEW.assigned_officer_id) THEN
    INSERT INTO chat_rooms (incident_id, citizen_id, officer_id)
    VALUES (NEW.id, NEW.reporter_id, NEW.assigned_officer_id)
    ON CONFLICT (incident_id) DO UPDATE SET
      officer_id = EXCLUDED.officer_id,
      status = 'active',
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_chat_room ON incidents;
CREATE TRIGGER auto_create_chat_room
  AFTER UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_room_on_assignment();
