-- Migration: 011_whatsapp_webhook
-- Status: TODO / IN PROGRESS

-- 1. Safely alter `reminders` table check constraint to support onboarding & confirmation
DO $$
BEGIN
    ALTER TABLE IF EXISTS reminders DROP CONSTRAINT IF EXISTS reminders_type_check;
    ALTER TABLE reminders ADD CONSTRAINT reminders_type_check CHECK (type IN ('24h','6h','post_visit','review_request','onboarding','confirmation'));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 2. Create the Trigger Function using pg_net
CREATE OR REPLACE FUNCTION invoke_booking_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    webhook_url TEXT;
BEGIN
    -- Ensure pg_net is available (usually installed by default on Supabase logic)
    -- Select the environment URL or default to the local/edge function endpoint
    -- Note: In production, SUPABASE_URL would be set or passed here. Let's use a hardcoded 
    -- internal URL standard for supabase locally and remotely if not defined in vault.
    -- For safety, we use the standard API internal networking:
    
    -- When using pg_net in Supabase, calling an edge function locally is tricky if URL is unknown, 
    -- but usually standard edge functions can be called via URL structure:
    webhook_url := current_setting('custom.booking_webhook_url', true);
    
    IF webhook_url IS NULL OR webhook_url = '' THEN
        -- Fallback to standard local/hosted URL structure if not set
        -- In hosted Supabase, it often points to https://<ref>.supabase.co/functions/v1/booking-notifications
        -- We will use a placeholder or local default that can be overwritten
        webhook_url := 'http://host.docker.internal:54321/functions/v1/booking-notifications';
    END IF;

    -- Make the HTTP POST request to the Edge Function async
    PERFORM net.http_post(
        url := webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
            'type', 'INSERT',
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'record', row_to_json(NEW)
        )::jsonb
    );

    RETURN NEW;
END;
$$;

-- 3. Attach standard AFTER INSERT Trigger to appointments
DROP TRIGGER IF EXISTS after_appointment_insert ON appointments;

CREATE TRIGGER after_appointment_insert
AFTER INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION invoke_booking_webhook();
