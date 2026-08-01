BEGIN;
-- Rotate remaining cron jobs to include the mandatory CRON_SECRET header.

-- whatsapp-schedule-runner every minute
DO $$ BEGIN
  PERFORM cron.unschedule('whatsapp-schedule-runner');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'whatsapp-schedule-runner',
  '* * * * *',
  $$ SELECT net.http_post(
    url := 'https://bnupitnrxyferelwroas.supabase.co/functions/v1/whatsapp-schedule-runner',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJudXBpdG5yeHlmZXJlbHdyb2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjU3MTUsImV4cCI6MjA5MDc0MTcxNX0.oFDPafl8-vTfEQ-a1KNgph8sTO4zynEH9_erKycncWg","x-cron-secret":"46acf04c77693e72dfff21391c61996837903e824b60063c0922fc52f94b2786"}'::jsonb,
    body := jsonb_build_object('time', now())
  ); $$
);

-- whatsapp-followup every 30 minutes
SELECT cron.unschedule('whatsapp-followup-every-30min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='whatsapp-followup-every-30min');

SELECT cron.schedule(
  'whatsapp-followup-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bnupitnrxyferelwroas.supabase.co/functions/v1/whatsapp-followup',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJudXBpdG5yeHlmZXJlbHdyb2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjU3MTUsImV4cCI6MjA5MDc0MTcxNX0.oFDPafl8-vTfEQ-a1KNgph8sTO4zynEH9_erKycncWg","x-cron-secret":"46acf04c77693e72dfff21391c61996837903e824b60063c0922fc52f94b2786"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
COMMIT;