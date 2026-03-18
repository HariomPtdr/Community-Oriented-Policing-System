-- =============================================
-- 004_indexes_triggers.sql — Performance indexes
-- =============================================

-- Incident indexes
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_officer ON incidents(assigned_officer_id);
CREATE INDEX idx_incidents_neighborhood ON incidents(neighborhood_id);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_incidents_location ON incidents(latitude, longitude);

-- Profile indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_neighborhood ON profiles(neighborhood_id);

-- Officer indexes
CREATE INDEX idx_officer_station ON officer_profiles(station_id);
CREATE INDEX idx_officer_beat ON officer_profiles(beat_id);
CREATE INDEX idx_officer_zone ON officer_profiles(zone_id);
CREATE INDEX idx_officer_verified ON officer_profiles(is_verified);

-- Messages
CREATE INDEX idx_messages_incident ON messages(incident_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_read ON messages(is_read);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Alerts
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_neighborhood ON alerts(neighborhood_id);
CREATE INDEX idx_alerts_active ON alerts(is_active);

-- SOS
CREATE INDEX idx_sos_user ON sos_events(user_id);
CREATE INDEX idx_sos_created ON sos_events(created_at DESC);

-- Forum
CREATE INDEX idx_forum_neighborhood ON forum_posts(neighborhood_id);
CREATE INDEX idx_forum_created ON forum_posts(created_at DESC);

-- Complaints
CREATE INDEX idx_complaints_officer ON complaints(against_officer_id);
CREATE INDEX idx_complaints_status ON complaints(status);

-- Audit log
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- Geography
CREATE INDEX idx_stations_zone ON stations(zone_id);
CREATE INDEX idx_neighborhoods_station ON neighborhoods(station_id);
