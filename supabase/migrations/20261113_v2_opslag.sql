-- V2: aanvullend op het V1-schema. V1 en de Telegram-bot blijven werken.

-- 1. Wat V2 extra weet over bestaande dingen, zonder voor elk veld een kolom.
alter table public.klanten      add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.trajecten    add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.subtaken     add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.afspraken    add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.inbox_items  add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.doelen       add column if not exists extra jsonb not null default '{}'::jsonb;

-- 2. De browser schrijft rechtstreeks (RLS bewaakt): user_id vult zichzelf.
alter table public.klanten      alter column user_id set default auth.uid();
alter table public.trajecten    alter column user_id set default auth.uid();
alter table public.subtaken     alter column user_id set default auth.uid();
alter table public.afspraken    alter column user_id set default auth.uid();
alter table public.inbox_items  alter column user_id set default auth.uid();
alter table public.doelen       alter column user_id set default auth.uid();

-- 3. Het bord kent ook "Wacht op klant".
alter table public.subtaken drop constraint if exists subtaken_status_check;
alter table public.subtaken add constraint subtaken_status_check
  check (status = any (array['to_do', 'bezig', 'wacht', 'review', 'klaar']));
alter table public.subtaken alter column geschatte_duur set default 60;

-- 4. Alles wat alleen V2 kent (taken in de agenda, routines, ritme, momenten,
--    uren, offertes, kansen, levensadmin, voorkeuren …): één rij per ding.
create table if not exists public.v2_items (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  collection text not null,
  item_id    text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, item_id)
);
alter table public.v2_items enable row level security;
create policy v2_items_owner_policy on public.v2_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Rechten: nieuwe tabellen krijgen hier niet vanzelf rechten (RLS bewaakt welke rijen).
grant select, insert, update, delete on public.v2_items to authenticated, service_role;
grant select, insert, update, delete on public.klanten, public.contacten, public.afspraken, public.traject_bestanden, public.traject_haltes to service_role;
