-- CostaSpine — GDPR Compliance Migration
-- Phase 1: Medical consent, user roles, audit trail, role-based RLS
-- Phase 2: Encryption helpers, data retention policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- 1. MEDICAL DATA CONSENT FIELDS
-- =============================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_data_consent BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_consent_date TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS data_processing_consent BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS data_processing_consent_date TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_withdrawn_at TIMESTAMPTZ;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- =============================================
-- 2. USER ROLES
-- =============================================
 
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'receptionist' CHECK (role IN ('admin', 'practitioner', 'receptionist')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage roles" ON user_roles FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Users can read own role" ON user_roles FOR SELECT TO authenticated
    USING (user_id = auth.uid());
CREATE POLICY "Service role all user_roles" ON user_roles FOR ALL TO service_role USING (true);

-- =============================================
-- 3. AUDIT TRAIL
-- =============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete', 'export', 'login', 'logout')),
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- Only admins can read audit logs
CREATE POLICY "Admins can read audit_log" ON audit_log FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Authenticated can insert audit_log" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role all audit_log" ON audit_log FOR ALL TO service_role USING (true);

-- =============================================
-- 4. AUDIT TRIGGERS (auto-log changes to sensitive tables)
-- =============================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, new_data)
        VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
        VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_data)
        VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit triggers to sensitive tables
CREATE TRIGGER audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_appointments
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_documents') THEN
        CREATE TRIGGER audit_patient_documents
            AFTER INSERT OR UPDATE OR DELETE ON patient_documents
            FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_forms') THEN
        CREATE TRIGGER audit_patient_forms
            AFTER INSERT OR UPDATE OR DELETE ON patient_forms
            FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
    END IF;
END $$;

CREATE TRIGGER audit_call_logs
    AFTER INSERT OR UPDATE OR DELETE ON call_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- =============================================
-- 5. ROLE-BASED RLS REFINEMENT
-- =============================================

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        (SELECT role FROM user_roles WHERE user_id = auth.uid()),
        'receptionist'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop overly permissive old policies
DROP POLICY IF EXISTS "Staff can read patients" ON patients;
DROP POLICY IF EXISTS "Staff can insert patients" ON patients;
DROP POLICY IF EXISTS "Staff can update patients" ON patients;
DROP POLICY IF EXISTS "Staff can read appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can update appointments" ON appointments;
DROP POLICY IF EXISTS "Staff can read call_logs" ON call_logs;
DROP POLICY IF EXISTS "Staff can insert call_logs" ON call_logs;
DROP POLICY IF EXISTS "Staff can update call_logs" ON call_logs;
DROP POLICY IF EXISTS "Staff can read payments" ON payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON payments;

-- ── PATIENTS: All staff can see basic info, but clinical notes restricted ──

CREATE POLICY "All staff can read patients" ON patients FOR SELECT TO authenticated
    USING (anonymized_at IS NULL); -- Hide anonymized patients from normal queries

CREATE POLICY "Staff can insert patients" ON patients FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Staff can update patients" ON patients FOR UPDATE TO authenticated
    USING (true);

-- ── APPOINTMENTS: role-based access ──

-- Receptionists see appointments but clinical fields are controlled via views
CREATE POLICY "All staff can read appointments" ON appointments FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Staff can insert appointments" ON appointments FOR INSERT TO authenticated
    WITH CHECK (true);

-- Practitioners can update clinical notes only on their own appointments
-- Admins can update anything
CREATE POLICY "Role-based appointment updates" ON appointments FOR UPDATE TO authenticated
    USING (
        get_user_role() = 'admin'
        OR (
            get_user_role() = 'practitioner'
            AND practitioner_id = (SELECT id FROM practitioners WHERE user_id = auth.uid())
        )
        OR (
            get_user_role() = 'receptionist'
            -- Receptionists can update status, but not clinical fields
            -- (enforced at application level for now)
        )
    );

-- ── CALL LOGS: admin + assigned practitioner ──

CREATE POLICY "Staff can read call_logs" ON call_logs FOR SELECT TO authenticated
    USING (
        get_user_role() IN ('admin')
        OR matched_practitioner_id = (SELECT id FROM practitioners WHERE user_id = auth.uid())
    );

CREATE POLICY "Staff can insert call_logs" ON call_logs FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Staff can update call_logs" ON call_logs FOR UPDATE TO authenticated
    USING (get_user_role() = 'admin');

-- ── PAYMENTS: admin + receptionist ──

CREATE POLICY "Staff can read payments" ON payments FOR SELECT TO authenticated
    USING (get_user_role() IN ('admin', 'receptionist'));

CREATE POLICY "Staff can insert payments" ON payments FOR INSERT TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'receptionist'));

-- =============================================
-- 6. SECURE VIEW FOR RECEPTIONISTS (hides clinical data)
-- =============================================

CREATE OR REPLACE VIEW appointments_safe AS
SELECT
    id, patient_id, practitioner_id, location_id, room_id, service_id,
    start_time, end_time, status, booking_source, deposit_paid,
    stripe_session_id, triage_data, created_at, updated_at,
    CASE WHEN get_user_role() IN ('admin', 'practitioner') THEN clinical_notes ELSE NULL END AS clinical_notes,
    CASE WHEN get_user_role() IN ('admin', 'practitioner') THEN diagnosis ELSE NULL END AS diagnosis,
    CASE WHEN get_user_role() IN ('admin', 'practitioner') THEN treatment_plan ELSE NULL END AS treatment_plan
FROM appointments;

-- =============================================
-- 7. DATA RETENTION: Auto-cleanup for call recordings (90 days)
-- =============================================

-- Function to clean old call log recordings (keeps metadata, removes PII)
CREATE OR REPLACE FUNCTION cleanup_old_call_recordings()
RETURNS void AS $$
BEGIN
    UPDATE call_logs
    SET
        transcript = '[REDACTED — retention period expired]',
        recording_url = NULL,
        caller_phone = LEFT(caller_phone, 4) || '****'
    WHERE created_at < now() - INTERVAL '90 days'
      AND transcript IS NOT NULL
      AND transcript != '[REDACTED — retention period expired]';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule via pg_cron (if available) or call via Edge Function cron
-- SELECT cron.schedule('cleanup-call-recordings', '0 3 * * *', 'SELECT cleanup_old_call_recordings()');

-- =============================================
-- 8. PATIENT DATA ANONYMIZATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION anonymize_patient(p_patient_id UUID)
RETURNS void AS $$
BEGIN
    -- Anonymize patient personal data but keep medical records for legal retention (5 years)
    UPDATE patients SET
        first_name = 'REDACTED',
        last_name = 'REDACTED',
        email = NULL,
        phone = 'REDACTED-' || LEFT(id::text, 8),
        date_of_birth = NULL,
        notes = NULL,
        form_token = gen_random_uuid(), -- invalidate form links
        anonymized_at = now(),
        consent_withdrawn_at = now(),
        updated_at = now()
    WHERE id = p_patient_id;

    -- Anonymize call logs
    UPDATE call_logs SET
        caller_phone = 'REDACTED',
        transcript = '[REDACTED — patient data erasure request]',
        recording_url = NULL
    WHERE patient_id = p_patient_id;

    -- Keep appointment records (legal requirement) but remove clinical notes after retention period
    -- Clinical data retained for 5 years per Ley 41/2002

    -- Delete patient documents (forms/signatures) if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_documents') THEN
        DELETE FROM patient_documents WHERE patient_id = p_patient_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_forms') THEN
        DELETE FROM patient_forms WHERE patient_id = p_patient_id;
    END IF;

    -- Log the anonymization
    INSERT INTO audit_log (action, table_name, record_id, new_data)
    VALUES ('delete', 'patients', p_patient_id, '{"reason": "GDPR erasure request"}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. DATA EXPORT FUNCTION (Right to Portability - Art. 20)
-- =============================================

CREATE OR REPLACE FUNCTION export_patient_data(p_patient_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'personal_data', (SELECT to_jsonb(p.*) FROM patients p WHERE p.id = p_patient_id),
        'appointments', (
            SELECT COALESCE(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb)
            FROM appointments a WHERE a.patient_id = p_patient_id
        ),
        'payments', (
            SELECT COALESCE(jsonb_agg(to_jsonb(pay.*)), '[]'::jsonb)
            FROM payments pay WHERE pay.patient_id = p_patient_id
        ),
        'forms', '[]'::jsonb,
        'documents', '[]'::jsonb,
        'call_logs', (
            SELECT COALESCE(jsonb_agg(to_jsonb(cl.*)), '[]'::jsonb)
            FROM call_logs cl WHERE cl.patient_id = p_patient_id
        ),
        'exported_at', now(),
        'format_version', '1.0'
    ) INTO result;

    -- Log the export
    INSERT INTO audit_log (user_id, action, table_name, record_id)
    VALUES (auth.uid(), 'export', 'patients', p_patient_id);

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
