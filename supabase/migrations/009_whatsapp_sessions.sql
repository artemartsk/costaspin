-- 009_whatsapp_sessions.sql

CREATE TABLE IF NOT EXISTS public.whatsapp_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'handed_to_human')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_threads_patient_id ON public.whatsapp_threads(patient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_threads_phone_number ON public.whatsapp_threads(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_threads_status ON public.whatsapp_threads(status);

-- RLS
ALTER TABLE public.whatsapp_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.whatsapp_threads
    FOR SELECT USING (true);

CREATE POLICY "Enable all access for authenticated users" ON public.whatsapp_threads
    FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_whatsapp_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_threads_modtime
    BEFORE UPDATE ON public.whatsapp_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_threads_updated_at();
