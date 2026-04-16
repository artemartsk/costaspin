-- CostaSpine OS — Seed Data for Elviria Pilot
-- Run after 001_initial_schema.sql

-- Location: Elviria
INSERT INTO locations (id, name, address, phone, email, google_maps_url, google_review_url) VALUES
  ('10000000-0000-0000-0000-000000000001', 'CostaSpine Elviria', 'Urb. Elviria, Marbella 29604, Spain', '+34 952 123 456', 'elviria@costaspine.com', 'https://maps.google.com/?q=CostaSpine+Elviria', 'https://g.page/costaspine-elviria');

-- Rooms
INSERT INTO rooms (id, location_id, name, type, equipment) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Room 1', 'chiropractic', ARRAY['Adjustment table', 'Decompression unit']),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Room 2', 'massage', ARRAY['Massage table', 'Hot stones kit', 'Aromatherapy']),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Physio Suite', 'physiotherapy', ARRAY['Ultrasound', 'TENS', 'Exercise area', 'Resistance bands']);

-- Practitioners
INSERT INTO practitioners (id, first_name, last_name, email, profession, sub_specialties, skill_tags, max_patients_per_day) VALUES
  ('30000000-0000-0000-0000-000000000001', 'James', 'Wilson', 'james.wilson@costaspine.com', 'Chiropractor', ARRAY['Sports injury', 'Pediatric'], ARRAY['acute_injury', 'chronic_pain', 'sports_injury'], 14),
  ('30000000-0000-0000-0000-000000000002', 'Sarah', 'Chen', 'sarah.chen@costaspine.com', 'Physiotherapist', ARRAY['Post-surgery rehab', 'Neurological'], ARRAY['post_surgery', 'chronic_pain', 'rehab'], 10),
  ('30000000-0000-0000-0000-000000000003', 'Mark', 'Thompson', 'mark.thompson@costaspine.com', 'Massage Therapist', ARRAY['Deep tissue', 'Sports massage'], ARRAY['relaxation', 'sports_injury', 'chronic_pain'], 12);

-- Practitioner-Location links
INSERT INTO practitioner_locations (practitioner_id, location_id) VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001');

-- Schedules (Mon-Fri, 09:00-17:00)
INSERT INTO practitioner_schedules (practitioner_id, location_id, day_of_week, start_time, end_time) VALUES
  -- Dr. Wilson: Mon-Fri
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, '09:00', '17:00'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2, '09:00', '17:00'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 3, '09:00', '17:00'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 4, '09:00', '17:00'),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 5, '09:00', '14:00'),
  -- Dr. Chen: Mon-Thu
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 1, '09:00', '16:00'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 2, '09:00', '16:00'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 3, '09:00', '16:00'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 4, '09:00', '16:00'),
  -- Mark: Mon-Sat
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 1, '10:00', '18:00'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 2, '10:00', '18:00'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 3, '10:00', '18:00'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 4, '10:00', '18:00'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 5, '10:00', '16:00'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 6, '10:00', '14:00');

-- Services
INSERT INTO services (id, name, category, duration_minutes, price, deposit_amount, room_type) VALUES
  ('40000000-0000-0000-0000-000000000001', 'Initial Consultation', 'assessment', 60, 120.00, 30.00, 'chiropractic'),
  ('40000000-0000-0000-0000-000000000002', 'Chiropractic Adjustment', 'chiropractic', 30, 75.00, 20.00, 'chiropractic'),
  ('40000000-0000-0000-0000-000000000003', 'Physiotherapy Session', 'physiotherapy', 45, 85.00, 20.00, 'physiotherapy'),
  ('40000000-0000-0000-0000-000000000004', 'Sports Massage', 'massage', 60, 70.00, 15.00, 'massage'),
  ('40000000-0000-0000-0000-000000000005', 'Deep Tissue Massage', 'massage', 45, 65.00, 15.00, 'massage'),
  ('40000000-0000-0000-0000-000000000006', 'Post-Surgery Rehab', 'physiotherapy', 60, 95.00, 25.00, 'physiotherapy');

-- Clinic Settings
INSERT INTO clinic_settings (location_id) VALUES
  ('10000000-0000-0000-0000-000000000001');
