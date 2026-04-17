-- Epic 4: 018_notes_rls_update.sql
-- Subtask: Allow editing of clinical notes within 24 hours of creation.

-- Add updated_at if not exists
ALTER TABLE clinical_notes
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Drop any existing UPDATE policy to avoid conflicts
DROP POLICY IF EXISTS "Enable update for practitioner owners" ON clinical_notes;

-- Create UPDATE policy with 24h constraint
-- "A practitioner can update their own note ONLY IF it's within 24 hours of created_at"
CREATE POLICY "Enable update for practitioner owners" ON clinical_notes
FOR UPDATE TO authenticated
USING (
  -- Must be the owner
  auth.uid() = practitioner_id 
  AND 
  -- Must be within 24 hours of original creation
  now() < (created_at + interval '24 hours')
)
WITH CHECK (
  auth.uid() = practitioner_id
);

-- Trigger to auto-update 'updated_at'
CREATE OR REPLACE FUNCTION update_clinical_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_clinical_notes_updated_at ON clinical_notes;

CREATE TRIGGER trigger_update_clinical_notes_updated_at
BEFORE UPDATE ON clinical_notes
FOR EACH ROW
EXECUTE FUNCTION update_clinical_notes_updated_at();
