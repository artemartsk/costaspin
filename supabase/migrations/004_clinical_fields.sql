-- CostaSpine — Add clinical fields to appointments
-- Adds diagnosis and treatment_plan columns for Phase 5 (Appointment Occurs) workflow

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS diagnosis text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS treatment_plan text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
