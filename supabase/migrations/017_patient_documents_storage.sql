-- Epic 4: 017_patient_documents_storage.sql
-- Description: Create the immutable storage bucket and setup RLS policies.

-- Create the storage bucket for patient documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'patient_documents',
    'patient_documents',
    false, -- Private bucket
    5242880, -- 5 MB limit
    ARRAY['application/pdf']
) ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = 5242880, allowed_mime_types = ARRAY['application/pdf'];

-- RLS: Authenticated users can insert
CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'patient_documents');

-- RLS: Authenticated users can read
CREATE POLICY "Allow authenticated users to read documents" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'patient_documents');

-- Since it's an immutable audit record, NO UPDATE or DELETE policies are granted
-- for storage.objects in bucket_id = 'patient_documents'.

-- Optional: Add RLS for the public.patient_documents table if not fully covered
DROP POLICY IF EXISTS "Enable read access for all users" ON public.patient_documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.patient_documents;

CREATE POLICY "Enable read access for all users" ON public.patient_documents FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.patient_documents FOR INSERT TO authenticated WITH CHECK (true);
