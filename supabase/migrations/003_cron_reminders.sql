-- CostaSpine — Cron job for automated reminders
-- Runs every 30 minutes to send 24h and 6h appointment reminders via WhatsApp

-- Note: This requires pg_cron and pg_net extensions to be enabled in Supabase Dashboard.
-- Go to: Database → Extensions → enable pg_cron and pg_net

-- Schedule reminders every 30 minutes
SELECT cron.schedule(
  'send-appointment-reminders',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nwimftdzygtesqgjljqq.supabase.co/functions/v1/schedule-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
