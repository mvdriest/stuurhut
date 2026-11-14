-- Pushmeldingen: elke 5 minuten kijken welke seintjes aan de beurt zijn.
select cron.schedule(
  'push-stuur',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://stuurhut.vercel.app/api/push/stuur',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
