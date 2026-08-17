# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Stuurhut is a personal (single-user) Nuxt web app for the owner to track ongoing work
("trajecten"), plan the day and week, work with focus, and — over time — evolve into a
full "Life OS" (see `docs/concept-life-os.md` for the product vision and phase roadmap,
and `docs/design-system.md` for the concrete visual-design reference — tokens, the
folder-tab component, and motion conventions). It is being built in phases. What exists
today:

- **Fase 1**: trajecten overview, daily top-3 priorities ("Vandaag"), quick-capture inbox.
- **Fase 2 — AI-weekplanning**: an AI (`server/utils/ai.ts`, Google Gemini via `@google/genai`)
  proposes a week schedule from open tasks, fixed day-blocks and past time-estimate
  corrections. See "AI-weekplanning" below.
- **Fase 1.5 — Takenbord, ideeën-werkruimte, focus-timer, restyle**: a full kanban task
  board per traject, a standalone ideas workspace, a 50/10 focus timer, and the Komu New D
  / Helvetica Neue visual identity. See the matching sections below.
- **Fase 3 — Doelen & beloningen**: goals with milestones, a progress bar, and a
  self-chosen real reward per milestone; goals can optionally be linked from a traject.
  See "Doelen & beloningen" below.
- **Concept-restyle**: the whole visual layer was rebuilt to match a Figma concept for the
  dashboard (full-bleed photo hero, overlapping goal cards, a cross-traject "Vandaag"
  board, and the stacked folder-tab Trajecten band). Data model and API were untouched.
  See "Design system" / "UI structure" below and `docs/design-system.md`.
- **Journal**: a simple text-entry log — a textarea to add an entry, a chronological list
  below. See "Journal" below.
- **Supabase migration**: the backend was moved from Drizzle ORM over local/Turso SQLite +
  `nuxt-auth-utils` sessions to Supabase (Postgres + Supabase Auth), keeping every feature
  above unchanged. See "Database" and "Single-user auth model" below — those sections
  describe the current (Supabase) state; there is no SQLite/Drizzle code left in the repo.

Not yet built: the coaching/evaluation layer from `docs/concept-life-os.md`
(stagnation/"traject-hartslag" detection, periodic reflection) — do not assume its data
models or routes exist. There is intentionally no energy-level/mood tracking yet; the
concept doc's plan is to start with a purely behavior-derived evaluation (completed tasks,
focus sessions, stalled trajecten) rather than a daily check-in, if/when that phase gets
built. Fase 3 also does not yet feed goal-linkage into the AI-weekplanning priority logic
("grotere impact op een doel = hoger in het bord" from the original brief) — goals exist
and can be linked from a traject, but `server/utils/weekplanning.ts` doesn't read
`trajecten.doelId` yet.

## Commands

```bash
npm run dev          # start dev server
npm run build         # production build
npm run preview        # preview a production build locally
```

There is no test suite and no lint script configured yet. Schema changes go through the
Supabase MCP tools (`apply_migration` for DDL, `execute_sql` for one-off data work) against
project `rykjfdwxptfvrvbeltpg` — there is no local migration file / `drizzle-kit` step
anymore.

## Architecture

**Stack**: Nuxt 4 (`app/` directory structure) + Nuxt UI (Tailwind v4, bundled) +
`@nuxtjs/supabase` (Supabase Auth + `@supabase/supabase-js`, over Postgres) +
`@google/genai` (Gemini, for AI-weekplanning).

**Single-user auth model**: there is exactly one account, created once via `/setup`.
`server/api/auth/setup.post.ts` uses `serverSupabaseServiceRole(event)` to check
`auth.admin.listUsers()` — if any account already exists it 403s, otherwise it creates one
via `auth.admin.createUser()`, and the client immediately calls
`useSupabaseClient().auth.signInWithPassword()` to establish the session. `/login` is a
plain `signInWithPassword()` call; logout is `useSupabaseClient().auth.signOut()`
(`AppNav.vue`). `app/middleware/auth.global.ts` reads `useSupabaseUser()` and does 100% of
the redirect decision itself (logged-in users away from `/login`/`/setup`, logged-out users
to `/setup` if no account exists yet, else `/login`) — the module's own auto-redirect is
disabled via `supabase: { redirect: false }` in `nuxt.config.ts` so it never fights with
this. `GET /api/auth/status` (public) reports whether an account exists, same
`admin.listUsers()` check as setup.

**`server/utils/supabaseAuth.ts`'s `requireSupabaseUser(event)`** is the one helper every
protected route calls: `const { user, supabase } = await requireSupabaseUser(event)`. Two
non-obvious things it exists to paper over — worth knowing before touching auth code:
- `serverSupabaseUser(event)` (from `@nuxtjs/supabase`) returns raw **JWT claims**, not a
  Supabase `User` object — the user id is the `sub` claim, not `.id`. `requireSupabaseUser`
  normalizes this to `{ id: claims.sub, email: claims.email }` so every route can just use
  `user.id`, matching the shape the whole codebase expects.
- `serverSupabaseClient`/`serverSupabaseUser`/`serverSupabaseServiceRole` are **not**
  auto-imported into `server/api/**` — only `useSupabaseClient`/`useSupabaseUser` are
  (client/SSR composables, via the module's `addImportsDir`). Server-side services must be
  imported explicitly from `#supabase/server`.

**Database**: Supabase Postgres, project `Stuurhut` (`rykjfdwxptfvrvbeltpg`, `eu-west-3`).
12 tables in `public`, all with `uuid` primary keys (`gen_random_uuid()` default) and a
`user_id uuid references auth.users(id)` — there is no app-level `users` table, auth is
entirely Supabase Auth's `auth.users`. Core tables: `trajecten` (has a `kleur` column — a
fixed palette enum, see `TRAJECT_KLEUREN` in `app/utils/kleuren.ts` — not free-form hex, to
keep the visual identity consistent — and a nullable `doel_id` FK, see "Doelen &
beloningen" below), `vandaag_prioriteiten`, `inbox_items`. AI-weekplanning tables:
`dag_blokken`, `subtaken`, `geplande_taken`, `tijdschatting_correcties`. Fase 1.5 tables:
`ideeen`, `focus_sessies`. Fase 3 tables: `doelen`, `doel_mijlpalen`. Journal table:
`journal_entries`. Every table has RLS enabled with one `for all using (auth.uid() =
user_id) with check (auth.uid() = user_id)` policy — this is the actual authorization
boundary (see "API routes" below). **Row-level security alone is not enough**: a table
also needs plain Postgres `GRANT`s (`select, insert, update, delete`) to the
`authenticated` role or every query 500s with "permission denied for table X" regardless
of RLS — this bit the initial migration (the tables had RLS but no grants) and is easy to
forget again if a new table gets added by hand instead of copying the pattern from an
existing `apply_migration` call.

**API routes** (`server/api/**`) follow a consistent pattern: call
`requireSupabaseUser(event)` to get `{ user, supabase }`, validate the body with a Zod
schema via `readValidatedBody`, then use the Supabase client's `.from(table).select()` /
`.insert()` / `.update()` / `.delete()`. Reads/updates/deletes do **not** need a manual
`.eq('user_id', user.id)` filter — RLS already scopes every query to the caller's own rows
via `serverSupabaseClient(event)` forwarding the request's JWT — but inserts still need
`user_id: user.id` set explicitly (RLS's `with check` validates it, it doesn't fill it in).
Each table's snake_case Postgres columns are mapped to the camelCase shape the frontend
expects via PostgREST select-aliasing (`titel, eerstvolgendeActie:eerstvolgende_actie, ...`)
— the alias strings live once per table in `server/utils/columns.ts` (e.g.
`TRAJECTEN_SELECT`), reused across that table's route files so the mapping can't drift
between them. IDs are `uuid` strings end-to-end, including in the frontend composables'
TS interfaces (`Traject['id']` etc. are `string`, not `number`).

**"Vandaag" (today's priorities) date scoping**: rows are scoped by a `datum` column
(`YYYY-MM-DD`, computed server-side by `server/utils/date.ts`'s `today()` using
`toLocaleDateString('en-CA')` for the server's local timezone) rather than by "is today"
logic in the client. This is deliberate: it keeps daily history around for free. The API
enforces a hard cap of 3 items per day (`server/api/vandaag/index.post.ts` and the inbox
move endpoint both check this) — this is a deliberate "focus, not overwhelm" constraint,
kept even though the Takenbord (below) gives a place for the full, unfiltered task list.

**Inbox "move" semantics** (`server/api/inbox/[id]/move.post.ts`): moving an inbox item is
modeled as a union-typed action, not a generic PATCH — `{ target: 'vandaag' }` inserts a
new `vandaag_prioriteiten` row for today, `{ target: 'traject', trajectId }` overwrites
that traject's `eerstvolgendeActie` field. Either way the inbox row is deleted after. This
is intentionally simple: moving to a traject does not append/history a list of actions, it
just replaces the "next action" field.

**AI-weekplanning**: `server/api/weekplanning/genereer.post.ts` gathers the user's
`dag_blokken` (recurring weekday time blocks, prive/zakelijk), open trajecten, `subtaken`
with `status = 'to_do'`, already-confirmed `geplande_taken`, and recent
`tijdschatting_correcties`, then calls `genereerWeekplanning()`
(`server/utils/weekplanning.ts` → `server/utils/ai.ts`, Gemini) to produce a proposed
schedule. Results are written as `geplande_taken` rows (status `gepland`); the user can
drag tasks between day/blok cells, "vastzetten" (lock, status → `bevestigd`, which excludes
them from future regeneration and drag-and-drop) or mark done (`klaar`) in
`WeekplanningOverzicht.vue`. Editing a `geplande_taken.geschatteDuur` logs a
`tijdschatting_correctie` so future AI runs learn from the correction
(`server/api/weekplanning/taken/[id].patch.ts`). `DagindelingInstellingen.vue` +
`useDagindeling.ts` manage the `dag_blokken` that AI-weekplanning schedules into.

**Takenbord (kanban) per traject**: rather than a separate "tasks" table, the board in
`app/pages/trajecten/[id].vue` is a kanban UI directly over the existing `subtaken` table
(`server/api/taken/**`, `app/composables/useTaken.ts`) — the same table AI-weekplanning
reads from. `subtaken.status` has four values (`to_do`/`bezig`/`review`/`klaar`);
AI-weekplanning only ever picks up `to_do` tasks, so tasks already in progress or review on
the board aren't silently rescheduled. Keeping one task table (instead of a board-only
table plus the planning table) means a task created on the board is automatically visible
to "Plan mijn week" once it's back in `to_do`.

**Ideeën-werkruimte**: `ideeen` table + `server/api/ideeen/**` + `useIdeeen.ts` +
`app/pages/ideeen/index.vue`. A responsive card grid (title + body + optional traject
link), not a free-positioned canvas — `trajectId` is nullable so an idea can exist
standalone.

**Journal**: `journal_entries` table (`id`/`user_id`/`inhoud`/`created_at` only — no
`bron`/source column, since the Telegram-capture idea from the original concept brief is
out of scope) + `server/api/journal/**` + `useJournal.ts` + `app/pages/journal/index.vue`.
Add-only: a textarea posts a new entry, the list below is read-only, ordered
`desc(createdAt)`. No edit/delete endpoints exist.

**Doelen & beloningen**: `doelen` (titel/omschrijving/deadline/status) + `doel_mijlpalen`
(titel/beloning/`afgerond`, FK `doelId`) + `server/api/doelen/**` + `useDoelen.ts` +
`app/components/DoelenOverzicht.vue`. A goal's progress bar is derived, not stored: `%
afgerond mijlpalen / totaal mijlpalen` (computed client-side in `DoelenOverzicht.vue`, no
`voortgang` column). Each mijlpaal carries its own `beloning` (the self-chosen, real
reward from the original brief — "geen symbolisch in-app-badge") — there's no separate
rewards table or redemption tracking, the text just switches from "Beloning: …" to
"Ontgrendeld: …" once `afgerond` flips. `GET /api/doelen` returns goals with mijlpalen
already nested (two parallel queries grouped in JS server-side, no Postgres join — matches
the existing "fetch flat, join in JS" convention from `server/utils/weekplanning.ts`). A
traject can optionally link to a
goal it contributes to via `trajecten.doelId` (nullable FK, set from a `USelect` in
`TrajectForm.vue`, shown as a small label in `TrajectenLijst.vue`'s expanded detail) —
this is the only cross-link built so far; AI-weekplanning does not yet use it (see the
"Not yet built" note above).

**Focus-timer (50/10)**: `app/composables/useFocusTimer.ts` runs the countdown entirely
client-side (a module-level singleton `setInterval`, state persisted to `localStorage` so
a page refresh doesn't lose progress) — the server only receives a log entry per finished
or aborted phase via `server/api/focus-sessies/index.post.ts` (`focus_sessies` table),
there is no "live" server-side timer state. `FocusTimer.vue` is mounted globally in
`app/app.vue` (visible on every page while logged in) so a session survives navigation.

**Client-side data flow**: each entity has a composable (`useTrajecten.ts`, `useVandaag.ts`,
`useInbox.ts`, `useTaken.ts`, `useIdeeen.ts`, `useWeekplanning.ts`, `useDagindeling.ts`,
`useDoelen.ts`, `useJournal.ts`)
that wraps a `useState`-backed list plus a `refresh()` function, shared across whatever
components call the composable (e.g. `InboxQuickCapture` refreshes both `useTrajecten` and
`useVandaag` after a successful move, so the other sections stay in sync without a page
reload). These composables use **`useRequestFetch()`** rather than the global `$fetch` for
`refresh()` — this matters: Nuxt's `$fetch` does not forward the incoming request's cookies
when called from server-side code (during SSR), so calling a session-protected API route
with plain `$fetch` during SSR silently 401s and leaves the list empty on first render.
`useRequestFetch()` is a drop-in replacement that forwards cookies during SSR and behaves
like plain `$fetch` on the client. If you add a new composable that fetches a
session-protected endpoint, use `useRequestFetch()`, not `$fetch`, for the SSR-triggered
fetch. Types exported from composables (e.g. `Traject`, `Taak`, `Idee`) and from
`app/utils/kleuren.ts` (`TrajectKleur`) are imported explicitly with `import type` where
used in other files — they are not reliably auto-imported as *types* (only the runtime
composable/util functions are), matching the existing `GeplandeTaak`/`DagBlok` imports in
`WeekplanningOverzicht.vue`.

**Design system**: fonts are Komu New D (display/headlines) and Helvetica Neue (body),
loaded via an Adobe Fonts (Typekit) kit stylesheet added in `nuxt.config.ts`
(`app.head.link`) — exact CSS `font-family` names (`"komu-new-d"`,
`"helvetica-neue-lt-pro"`, `"helvetica-neue-lt-pro-cond"`) are set as `--font-display` /
`--font-sans` / `--font-condensed` in the Tailwind v4 `@theme` block in
`app/assets/css/main.css`, along with the mist/ink palette and the `trajecten.kleur`
palette tokens. The visual layer was rebuilt to match the Figma concept (file `Stuurhut`,
frame `Web 1920 – 1`) — **`docs/design-system.md` is the authoritative spec** for the
column, the type scale, the folder-tab geometry and the card patterns; read it before
touching layout or colour. Two things that are easy to get wrong and are documented there:
the traject colours live in *two* places (`@theme` tokens and `trajectKleurHex` in
`app/utils/kleuren.ts`) and must be changed in both; and the traject colours were eyeballed
from the concept rather than read out of Figma dev-mode, so they are approximations.
`AppHeaderFoto.vue` is the full-bleed photo hero (wordmark + `AppNav.vue` pills on top,
date/greeting/quote at the bottom), with a `compact` prop for subpages; when no explicit
`afbeelding` prop is given it picks one of four time-of-day photos in `public/images/`
(`hero-dawn.jpg`/`hero-day.jpg`/`hero-sunset.jpg`/`hero-night.jpg`, chosen from the local
hour at render time) — the "dynamic wallpaper" from the original brief, without
live/crossfade updates while a page stays open. `app/components/FolderTab.vue` is the
GSAP-animated stacked folder-bar used by `TrajectenLijst.vue`; the traject-detail section
nav is a separate component (`SectieTabs.vue`) rather than a second mode of FolderTab.

**UI structure**: there is no page-wide `max-w-*` wrapper — sections are full-bleed and
each puts a `.stuurhut-kolom` inside itself (see `docs/design-system.md` §2).
`app/pages/index.vue` is the main dashboard, following the concept top to bottom:
`AppHeaderFoto` → `DoelenOverzicht` (three goal cards that overlap the bottom of the hero;
goals stay first per the original brief's "Doelen en voortgang zijn het eerste wat je
ziet") → `VandaagBord` → a full-bleed dark (`bg-stuurhut-ink`) `TrajectenLijst` band → a
"Plannen & vastleggen" section holding `WeekplanningOverzicht`, `VandaagPrioriteiten` and
`InboxQuickCapture`. That last section is deliberately outside the concept: those three
features are still in use, so they were moved below the concept's content rather than
dropped.
`VandaagBord.vue` is the dashboard's four-column board (To-do/In progress/Review/Ready)
over **all** trajecten — the same `subtaken` table as `TakenBord.vue`, just unfiltered by
traject, with a traject-coloured pill per card. It does not replace
`VandaagPrioriteiten.vue`; the 3-per-day cap still exists as its own thing further down
the page.
`TrajectForm.vue` is a shared form used both for creating and editing a traject (inline
within `TrajectenLijst.vue`'s expanded `FolderTab`, not a modal) and includes the
kleur-swatch picker. `app/pages/trajecten/[id].vue` is the per-traject detail page: a
`SectieTabs` nav (Taken/Meetings/Offertes/Overig) above a content panel that cross-fades
between them. Taken renders the kanban board from `app/components/TakenBord.vue` (prop:
`trajectId`); Meetings/Offertes are visual placeholders only (no data model yet); Overig is
a read-only view of `status`/`eerstvolgendeActie` (editing those stays on the dashboard
list). `app/pages/ideeen/index.vue` is the ideas workspace. `FocusTimer.vue` is mounted
globally rather than embedded in a specific page.
