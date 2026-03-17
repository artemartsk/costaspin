-- CostaSpine — Room Details Backend Support
-- Adds capacity, supported services, maintenance logs, indexes, and RLS

-- =============================================
-- 1. EXTEND ROOMS TABLE
-- =============================================

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 1;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =============================================
-- 2. ROOM ↔ SERVICE JUNCTION (Supported Treatments)
-- =============================================

CREATE TABLE IF NOT EXISTS room_supported_services (
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, service_id)
);

ALTER TABLE room_supported_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read room_supported_services" ON room_supported_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage room_supported_services" ON room_supported_services FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Service role all room_supported_services" ON room_supported_services FOR ALL TO service_role USING (true);

-- =============================================
-- 3. ROOM MAINTENANCE LOGS
-- =============================================

CREATE TABLE IF NOT EXISTS room_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    reported_by TEXT NOT NULL DEFAULT 'Staff',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maintenance_logs_room ON room_maintenance_logs(room_id);
CREATE INDEX idx_maintenance_logs_created ON room_maintenance_logs(created_at DESC);

ALTER TABLE room_maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read maintenance_logs" ON room_maintenance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert maintenance_logs" ON room_maintenance_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update maintenance_logs" ON room_maintenance_logs FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Service role all maintenance_logs" ON room_maintenance_logs FOR ALL TO service_role USING (true);

-- =============================================
-- 4. MISSING INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_location ON rooms(location_id);

-- =============================================
-- 5. RLS: Allow staff to UPDATE rooms (status toggle)
-- =============================================

CREATE POLICY "Staff can update rooms" ON rooms FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can insert rooms" ON rooms FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- =============================================
-- 6. SEED: Link rooms to supported services
-- =============================================

-- Room 1 (Chiropractic) → chiropractic services
INSERT INTO room_supported_services (room_id, service_id)
SELECT '20000000-0000-0000-0000-000000000001'::uuid, id
FROM services WHERE category IN ('chiropractic', 'assessment')
ON CONFLICT DO NOTHING;

-- Room 2 (Massage) → massage services
INSERT INTO room_supported_services (room_id, service_id)
SELECT '20000000-0000-0000-0000-000000000002'::uuid, id
FROM services WHERE category = 'massage'
ON CONFLICT DO NOTHING;

-- Room 3 (Physio Suite) → physiotherapy services
INSERT INTO room_supported_services (room_id, service_id)
SELECT '20000000-0000-0000-0000-000000000003'::uuid, id
FROM services WHERE category = 'physiotherapy'
ON CONFLICT DO NOTHING;

-- Set capacity
UPDATE rooms SET capacity = 2 WHERE type = 'physiotherapy';

-- Seed maintenance logs
INSERT INTO room_maintenance_logs (room_id, note, reported_by, resolved, created_at) VALUES
('20000000-0000-0000-0000-000000000001'::uuid, 'Adjustment table hydraulics serviced', 'BioMed', true, '2026-03-15T10:00:00Z'),
('20000000-0000-0000-0000-000000000001'::uuid, 'Decompression unit annual calibration', 'BioMed', true, '2026-03-10T14:00:00Z'),
('20000000-0000-0000-0000-000000000002'::uuid, 'Massage table re-padded, new upholstery installed', 'Facilities', true, '2026-03-15T09:00:00Z'),
('20000000-0000-0000-0000-000000000002'::uuid, 'Hot stones kit replaced — old stones cracked', 'Staff', true, '2026-03-08T11:00:00Z'),
('20000000-0000-0000-0000-000000000003'::uuid, 'TENS unit calibration completed, all electrodes replaced', 'BioMed', true, '2026-03-10T15:00:00Z'),
('20000000-0000-0000-0000-000000000003'::uuid, 'Deep clean & sanitization after maintenance window', 'Cleaning Team', true, '2026-03-03T08:00:00Z'),
('20000000-0000-0000-0000-000000000003'::uuid, 'Resistance bands worn — need replacement', 'Dr. Chen', false, '2026-03-16T16:00:00Z');
