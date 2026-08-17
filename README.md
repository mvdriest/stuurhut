# Stuurhut

Persoonlijke webapp om overzicht te houden over lopende trajecten, de dag te plannen
en (in latere fases) de week te laten plannen door AI en doelen bij te houden.

Fase 1: trajecten-overzicht, dagelijkse top-3 prioriteiten, en een snel-vastleggen inbox.

## Stack

- **Nuxt 4** — framework
- **Nuxt UI** — componenten/styling (Tailwind v4 onder de motorkap)
- **Supabase** — Postgres-database + Auth (sessie-auth, één account, e-mail + wachtwoord)
- **@google/genai (Gemini)** — AI-weekplanning

## Development

```bash
npm install
npm run dev
```

Open de app — bij de eerste keer word je naar `/setup` gestuurd om je (enige) account
aan te maken. Daarna log je in via `/login`.

## Omgevingsvariabelen

Zie `.env.example`.

- `SUPABASE_URL` / `SUPABASE_KEY` — project-URL en publishable key (Settings → API in het
  Supabase-dashboard).
- `NUXT_SUPABASE_SECRET_KEY` — de service_role/secret key (Settings → API). Alleen
  server-side gebruikt, voor de single-account setup-check via de Supabase admin API. Nooit
  client-side blootstellen.
- `NUXT_GEMINI_API_KEY` — voor AI-weekplanning.

## Database

Schema en RLS-policies leven in het Supabase-project zelf (12 tabellen in `public`, elk met
een `uuid`-primary key en RLS scoped op `auth.uid() = user_id`) — er is geen lokaal
migratiebestand in deze repo. Schema-wijzigingen gaan via de Supabase MCP-tools
(`apply_migration` voor DDL) of het Supabase-dashboard.
