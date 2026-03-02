-- CostaSpine OS — Database Schema
-- Supabase PostgreSQL Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE ENTITIES
-- =============================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  google_maps_url TEXT,
  google_review_url TEXT,
  timezone TEXT DEFAULT 'Europe/Madrid',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('chiropractic','physiotherapy','massage','general')),
  equipment TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'available' CHECK (status IN ('available','occupied','maintenance')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  profession TEXT NOT NULL,
  sub_specialties TEXT[] DEFAULT '{}',
  skill_tags TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  max_patients_per_day INT DEFAULT 12,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE practitioner_locations (
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  PRIMARY KEY (practitioner_id, location_id)
);

CREATE TABLE practitioner_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT UNIQUE NOT NULL,
  date_of_birth DATE,
  language TEXT DEFAULT 'en',
  marketing_consent BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  source TEXT DEFAULT 'phone' CHECK (source IN ('phone','ai_phone','whatsapp','web','referral','walk_in')),
  visit_count INT DEFAULT 0,
  forms_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  room_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  room_id UUID REFERENCES rooms(id),
  service_id UUID NOT NULL REFERENCES services(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending_deposit' CHECK (status IN (
    'pending_deposit','confirmed','attended','no_show','cancelled','rescheduled'
  )),
  booking_source TEXT DEFAULT 'manual' CHECK (booking_source IN (
    'manual','ai_phone','whatsapp','web','walk_in'
  )),
  deposit_paid BOOLEAN DEFAULT false,
  stripe_session_id TEXT,
  clinical_notes TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  triage_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id),
  amount NUMERIC(10,2) NOT NULL,
  type TEXT DEFAULT 'deposit' CHECK (type IN ('deposit','full','refund')),
  stripe_payment_id TEXT,
  stripe_session_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('indemnity','consent','intake','other')),
  signed_at TIMESTAMPTZ,
  pdf_url TEXT,
  ip_address TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('24h','6h','post_visit','review_request')),
  channel TEXT DEFAULT 'whatsapp',
  message_sid TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_call_id TEXT UNIQUE,
  caller_phone TEXT,
  patient_id UUID REFERENCES patients(id),
  direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound')),
  duration_seconds INT,
  triage_result JSONB DEFAULT '{}',
  matched_practitioner_id UUID REFERENCES practitioners(id),
  matched_service_id UUID REFERENCES services(id),
  appointment_id UUID REFERENCES appointments(id),
  transcript TEXT,
  recording_url TEXT,
  analysis JSONB DEFAULT '{}',
  status TEXT DEFAULT 'in_progress' CHECK (status IN (
    'in_progress','completed','no_answer','busy','voicemail','failed'
  )),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID UNIQUE REFERENCES locations(id) ON DELETE CASCADE,
  vapi_settings JSONB DEFAULT '{}',
  twilio_settings JSONB DEFAULT '{}',
  stripe_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_practitioner ON appointments(practitioner_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(start_time, end_time);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_call_logs_vapi ON call_logs(vapi_call_id);
CREATE INDEX idx_call_logs_patient ON call_logs(patient_id);
CREATE INDEX idx_reminders_appointment ON reminders(appointment_id);
CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_practitioner_schedules_day ON practitioner_schedules(practitioner_id, day_of_week);

-- =============================================
-- RLS POLICIES (basic)
-- =============================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data (clinic staff)
CREATE POLICY "Staff can read locations" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can read rooms" ON rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can read practitioners" ON practitioners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can read patients" ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can read appointments" ON appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can read services" ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can read payments" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can read call_logs" ON call_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can read reminders" ON reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can read settings" ON clinic_settings FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update (role-based refinement later)
CREATE POLICY "Staff can insert patients" ON patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update patients" ON patients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert appointments" ON appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update appointments" ON appointments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can insert call_logs" ON call_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update call_logs" ON call_logs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can insert reminders" ON reminders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update reminders" ON reminders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Staff can update settings" ON clinic_settings FOR UPDATE TO authenticated USING (true);

-- Service role bypass for edge functions
CREATE POLICY "Service role all locations" ON locations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all rooms" ON rooms FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all practitioners" ON practitioners FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all patients" ON patients FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all appointments" ON appointments FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all services" ON services FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all payments" ON payments FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all call_logs" ON call_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all reminders" ON reminders FOR ALL TO service_role USING (true);
CREATE POLICY "Service role all settings" ON clinic_settings FOR ALL TO service_role USING (true);
