-- Enable pg_net for HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create a table to track outgoing WhatsApp notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
    patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
    type text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message text,
    message_sid text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
-- Allows the Edge Function backend to insert and update via service_role
CREATE POLICY "Service role all notification logs" ON public.notification_logs FOR ALL TO service_role USING (true);
-- Allows admins to view delivery statuses
CREATE POLICY "Staff can read notification logs" ON public.notification_logs FOR SELECT TO authenticated USING (true);

-- The trigger function
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url text := 'http://supabase_kong:8000/functions/v1/booking-notifications';
  anon_key text;
  payload jsonb;
BEGIN
  -- Extract anon key from postgres settings
  anon_key := current_setting('app.settings.anon_key', true);

  -- Only attempt networking if anon_key is available (avoids crashing during simple tests if misconfigured)
  IF anon_key IS NOT NULL THEN
    payload := json_build_object('type', TG_OP, 'table', TG_TABLE_NAME, 'record', row_to_json(NEW))::jsonb;
    
    PERFORM net.http_post(
        url := webhook_url,
        headers := json_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key)::jsonb,
        body := payload,
        timeout_milliseconds := 2000
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_appointment();
