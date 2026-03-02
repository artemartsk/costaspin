-- CostaSpine — Digital Forms System
-- Adds form_token to patients for public form signing URLs
-- Tracks individual form completions

-- Add a unique token for each patient (used in public form URL)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS form_token uuid DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_form_token ON patients(form_token);

-- Track individual form submissions
CREATE TABLE IF NOT EXISTS patient_forms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES patients(id) NOT NULL,
    form_type text NOT NULL CHECK (form_type IN ('indemnity', 'cancellation_policy', 'newsletter_consent', 'patient_info')),
    signed_at timestamptz DEFAULT now(),
    ip_address text,
    signature_data text, -- base64 signature image or "agreed" for checkbox
    form_data jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE patient_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role all patient_forms" ON patient_forms FOR ALL TO service_role USING (true);
CREATE POLICY "Staff can read patient_forms" ON patient_forms FOR SELECT TO authenticated USING (true);

-- Allow anon to insert forms (public form page, validated by token)
CREATE POLICY "Anon can insert patient_forms" ON patient_forms FOR INSERT TO anon WITH CHECK (true);
-- Allow anon to read patients by form_token (for form page to show patient name)
CREATE POLICY "Anon can read patient by token" ON patients FOR SELECT TO anon USING (form_token IS NOT NULL);
