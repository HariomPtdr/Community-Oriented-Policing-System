-- =============================================
-- seed.sql — Initial data for development
-- =============================================

-- Insert zones
INSERT INTO zones (id, name, city, state) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Zone West', 'Indore', 'Madhya Pradesh'),
  ('a2222222-2222-2222-2222-222222222222', 'Zone East', 'Indore', 'Madhya Pradesh');

-- Insert stations
INSERT INTO stations (id, name, zone_id, address, phone) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Palasia Police Station', 'a1111111-1111-1111-1111-111111111111', 'Palasia Square, Indore', '+91-731-2555100'),
  ('b2222222-2222-2222-2222-222222222222', 'Vijay Nagar Police Station', 'a1111111-1111-1111-1111-111111111111', 'Vijay Nagar, Indore', '+91-731-2555200'),
  ('b3333333-3333-3333-3333-333333333333', 'Rajwada Police Station', 'a2222222-2222-2222-2222-222222222222', 'Near Rajwada, Indore', '+91-731-2555300');

-- Insert neighborhoods (beats)
INSERT INTO neighborhoods (id, name, station_id) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Beat 1 — Palasia Square', 'b1111111-1111-1111-1111-111111111111'),
  ('c2222222-2222-2222-2222-222222222222', 'Beat 2 — Sapna Sangeeta', 'b1111111-1111-1111-1111-111111111111'),
  ('c3333333-3333-3333-3333-333333333333', 'Beat 3 — AB Road', 'b1111111-1111-1111-1111-111111111111'),
  ('c4444444-4444-4444-4444-444444444444', 'Beat 4 — MG Road', 'b1111111-1111-1111-1111-111111111111'),
  ('c5555555-5555-5555-5555-555555555555', 'Beat 5 — Vijay Nagar Main', 'b2222222-2222-2222-2222-222222222222'),
  ('c6666666-6666-6666-6666-666666666666', 'Beat 6 — Scheme No. 54', 'b2222222-2222-2222-2222-222222222222'),
  ('c7777777-7777-7777-7777-777777777777', 'Beat 7 — New Palasia', 'b2222222-2222-2222-2222-222222222222');

-- Insert sample survey template
INSERT INTO survey_templates (title, questions, is_active) VALUES
  ('Community Safety Survey Q1 2026', '[
    {"id": "q1", "text": "How safe do you feel in your neighborhood?", "type": "rating", "scale": 5},
    {"id": "q2", "text": "Have you interacted with your beat officer this month?", "type": "boolean"},
    {"id": "q3", "text": "Any safety concerns you want to report?", "type": "text"},
    {"id": "q4", "text": "Rate your overall experience with the police", "type": "rating", "scale": 5}
  ]'::jsonb, true);
