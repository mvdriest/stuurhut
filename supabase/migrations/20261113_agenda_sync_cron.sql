-- Agenda-sync elk kwartier: Supabase roept /api/sync/agenda aan (Vercel Hobby kan maar één cron per dag).
-- Het geheim staat in Vault (cron_secret) en in Vercel als NUXT_CRON_SECRET.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret', 'Bearer-geheim voor /api/sync/* op stuurhut.vercel.app')
where not exists (select 1 from vault.secrets where name = 'cron_secret');

select cron.unschedule('agenda-sync') where exists (select 1 from cron.job where jobname = 'agenda-sync');
select cron.schedule(
  'agenda-sync',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://stuurhut.vercel.app/api/sync/agenda',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
