-- Migration: Clinical SOAP Notes
-- Adds a fully structured table for EMR clinical records

CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ensure at least one section has content
    CONSTRAINT clinical_notes_content_check CHECK (
        trim(coalesce(subjective, '')) <> '' OR
        trim(coalesce(objective, '')) <> '' OR
        trim(coalesce(assessment, '')) <> '' OR
        trim(coalesce(plan, '')) <> ''
    )
);

-- Index for querying notes by patient (since this is mostly loaded in EMR)
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_id ON clinical_notes(patient_id);
-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS idx_clinical_notes_created_at ON clinical_notes(created_at DESC);

-- Enable RLS
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated staff mapping
DROP POLICY IF EXISTS "Staff can read all clinical notes" ON clinical_notes;
CREATE POLICY "Staff can read all clinical notes"
    ON clinical_notes FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert access to authenticated staff
DROP POLICY IF EXISTS "Staff can insert clinical notes" ON clinical_notes;
CREATE POLICY "Staff can insert clinical notes"
    ON clinical_notes FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow updates
DROP POLICY IF EXISTS "Staff can update clinical notes" ON clinical_notes;
CREATE POLICY "Staff can update clinical notes"
    ON clinical_notes FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Service role all clinical notes" ON clinical_notes;
CREATE POLICY "Service role all clinical notes" 
    ON clinical_notes FOR ALL 
    TO service_role 
    USING (true);
