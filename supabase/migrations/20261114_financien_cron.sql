-- e-Boekhouden: elk uur je boekhouding ophalen.
select cron.schedule(
  'financien-sync',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://stuurhut.vercel.app/api/sync/financien',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
