# 3xl-game — Development Guidelines

This document guides Claude (and developers) on implementing features in this
project: a browser game built on SvelteKit whose characters are imported from
**MUGEN** sprite archives, with a **Països Catalans** (Catalan Countries) Leaflet
map and Supabase auth (magic link, Google, Discord). It's a pnpm monorepo with two SvelteKit apps
(player + admin) and a small authoring backend. Follow these conventions strictly
to keep the codebase consistent.

## Monorepo Structure

This is a **pnpm workspace** (`pnpm-workspace.yaml` → `packages/*`). Run everything
from the repo root; scripts delegate to the right package via `pnpm --filter`.

```
packages/
├── frontend/  (@3xl/frontend)  SvelteKit player web app (port 2000)
├── admin/     (@3xl/admin)      SvelteKit authoring SPA (port 2001)
├── backend/   (@3xl/backend)    Express authoring API (port 2002)
├── shared/    (@3xl/shared)     framework-agnostic types + utils + adapters (TS source)
├── mugen/     (@3xl/mugen)      MUGEN import/assembly scripts (write assets + data)
├── assets/    (@3xl/assets)     generated sprite frames + manifests + auras (public/)
└── data/      (@3xl/data)       character registry module + JSON definitions + movesets + geo
```

**Apps and ports** (all hardcoded / `--strictPort`, so the dev servers always agree):

| Package        | Kind                     | Port | Notes                                        |
| -------------- | ------------------------ | ---- | -------------------------------------------- |
| `@3xl/frontend`| SvelteKit (adapter-static) | 2000 | The player-facing game. Ships to a static bundle. |
| `@3xl/admin`   | SvelteKit (adapter-static) | 2001 | Character/TMDB authoring SPA. Talks to the backend. |
| `@3xl/backend` | Node/Express 5 (`tsx`)     | 2002 | Dev/authoring only — reads/writes `@3xl/data`, proxies TMDB. |

Both SvelteKit apps build to a **static SPA** (`@sveltejs/adapter-static`,
`fallback: index.html`) and render MUGEN sprites with **PixiJS**.

**Data flow — MUGEN:** `@3xl/mugen` reads raw archives (`mugen-characters/`) + decode
inputs (`characters-src/<id>/`) and *writes into* `@3xl/assets` (`public/<id>/frames/`,
`public/auras/`) and `@3xl/data` (`registry.generated.ts`, plus each character's
`public/characters/<id>/definition.json` and `public/characters/<id>/mugen-moves.json`).
`@3xl/frontend` and `@3xl/admin` *install* `@3xl/assets` + `@3xl/data` as `workspace:*`
deps: they import the registry as a module (`import { characters } from '@3xl/data'`) and
serve each package's `public/` dir at the `/assets` and `/data` URL prefixes via the
identical `serveWorkspacePublic()` Vite plugin in each app's `vite.config.ts` (dev/preview
mount it as middleware; build copies the dirs into `dist/`).

**Data flow — geo:** `@3xl/data`'s `generate-geo.js` reads the Eurostat GISCO "LAU 2024"
municipalities layer (downloaded to the repo root as `ref-lau-2024-01m.geojson/`) and
writes four dissolved GeoJSON layers under `public/geo/` (`municipis.json`,
`comarques.json`, `provincies.json`, `territoris.json`), served to the frontend map at
`/data/geo/*`. The comarca tier (between municipality and province) is assigned per
municipality at build time from Wikidata (Catalunya / Catalunya Nord), a GADM-derived
layer (País Valencià), and the comarques de les illes Balears (Illes Balears); Andorra and
l'Alguer have no comarca tier. See the script header for the full sourcing notes.

**Data flow — show icons:** `@3xl/assets`' `generate-show-icons.js` takes the Noun
Project SVGs dropped at the repo root, strips the attribution `<text>` baked into every
download, crops the viewBox to the artwork, and re-emits it at `width`/`height` `1em`
with `fill="currentColor"`, into `public/icons/shows/<slug>.svg` — then deletes the root
original (it is a move) and records the stripped credit in that folder's `license.txt`.
Which show gets which glyph is the hand-maintained `showIconName` map in
`@3xl/shared/utils/show/show-icon.ts`, keyed by TMDB show id.

**Icons.** Where an icon is *drawn* decides how it is stored, and the two are not
interchangeable:

- **Into the document** — the show glyphs above. Inlined into the bundle by
  `icon-markup.ts` (`import.meta.glob` + `?raw`), keyed `<folder>/<slug>`
  (`shows/straw-hat`), and rendered by `ShowIcon.svelte`. An `<img>` is an opaque
  document whose artwork cannot inherit anything from the page, so inlining is what
  lets `fill="currentColor"` resolve against the surrounding text — colour *and* size
  follow whatever the glyph sits in.
- **Into a canvas** — the game-icons.net artwork under `public/icons/<artist>/`:
  the combat orders' glyphs go into a Pixi texture, which is not a place a stylesheet
  reaches, so these are fetched by URL and carry a baked **white** fill, which the
  canvas then tints (tinting only
  ever darkens, so white artwork is what makes any colour reachable). The **whole**
  game-icons.net collection is vendored here — ~4,200 glyphs across 36 contributor
  folders, downloaded in the site's `ffffff / transparent` variant, which is why
  nothing had to be stripped: that variant is already white artwork on nothing, the
  form both the canvas and the achievement picker want. Take the same variant when
  adding more (the site also offers white-on-an-opaque-black-square, whose background
  path would have to come out first). Attribution for the set is
  `public/icons/license.txt`; keep it with the folders.

Inlining a canvas glyph would put white on white, which is why `icon-markup.ts`'s
glob deliberately takes only the show set. The admin's achievement editor is the one
place a game-icons glyph is shown *outside* a canvas — it stays an `<img>` by URL and
is always given a dark tile to stand on (`GameIcon.svelte`), because the white it
carries is the canvas's requirement and is not negotiable from a page.

**Do not hand-edit generated files** (`registry.generated.ts`, `manifest.json`,
`mugen-moves.json`, `public/geo/*.json`, `public/icons/shows/*`) or decoded assets —
re-run the relevant script.

**Root scripts** (from repo root):

```
pnpm dev            # frontend + admin + backend in parallel
pnpm dev:frontend   # just the player app (2000)
pnpm dev:admin      # just the admin SPA (2001)
pnpm dev:backend    # just the Express API (2002)
pnpm build          # build frontend + admin static bundles
pnpm preview        # preview the frontend build
pnpm check          # svelte-check (frontend + admin) + tsc (backend)
pnpm test           # frontend vitest suite
pnpm import:mugen   # (re)build the character registry from MUGEN archives
pnpm generate:sprites
pnpm generate:auras
pnpm generate:geo   # rebuild the Països Catalans map layers
pnpm generate:show-icons  # move any root *.svg into the show-icon set
pnpm clean          # remove build output across all packages
```

### App structure (`packages/frontend/src/`, and `packages/admin/src/` similarly)

```
src/
├── components/core/      # Reusable UI components (per app)
├── routes/               # SvelteKit pages and layouts
├── services/classes/     # State management with localStorage persistence
├── css/                  # Global styles (Tailwind imports)
└── services/i18n/        # Internationalization
```

Frontend routes: `/` (home), `/map` (Països Catalans map), `/roster` (the player's claimed
cards). Neither claiming nor combat has a route of its own — the booster packs live on the
map's right-hand panel (its Booster tab), and `CombatArena` is hosted in a panel over the
map (the Challenge button on a municipality). The roster and the achievements have no route
either: both are full-view modals over the map, drawn on the shared `FullScreenModal` sheet
and raised from the panel's account row. The map's top-left corner is the town panel and the
Location plate under it; `MusicPlayer.svelte` and `music.service.ts` are still here but are
mounted nowhere, so the game plays no music. Admin routes: `/characters` (definition editor),
`/shows` (TMDB browser), `/achievements` (badge editor + Supabase rule sync) and `/music`
(what each vendored song is called and which show it opens).

**Types, utils, and adapters no longer live in the apps** — they moved to `@3xl/shared`
(see below). Only `components/`, `routes/`, `services/`, `css/`, and `i18n/` are per-app.

### Path Aliases

Import aliases are declared identically in each app's `svelte.config.js`. Note that
`$components`/`$services` stay **local to the app**, while `$utils`/`$types`/`$adapters`
resolve into the **`@3xl/shared`** package:

```typescript
$components  → src/components/*              (this app)
$services    → src/services/*                (this app)
$adapters    → ../shared/src/adapters/*      (@3xl/shared)
$utils       → ../shared/src/utils/*         (@3xl/shared)
$types       → ../shared/src/types/*         (@3xl/shared)
```

So `import { ThemeColors } from '$types/core.type'` and
`import type { CharacterDefinition } from '@3xl/shared/types/character-definition.type'`
reach the same files — use the `$`-alias form inside the SvelteKit apps, and the
`@3xl/shared/...` subpath form from `@3xl/backend` (which has no aliases).

The character registry is **not** an alias — import it from the workspace package:
`import { characters, defaultCharacterId, type CharacterOption } from '@3xl/data';`

---

## Shared package (`@3xl/shared`)

Framework-agnostic code consumed by **all three** runtime packages (`frontend`,
`admin`, `backend`). It **ships raw TypeScript source** — no build step; consumers
transpile it (the SvelteKit apps via Vite, the backend via `tsx`). It has three
subpath exports, which map to the app aliases above:

```
@3xl/shared/types/*       → src/types/*.ts        ($types  in the apps)
@3xl/shared/utils/*       → src/utils/*.ts         ($utils  in the apps)
@3xl/shared/adapters/*    → src/adapters/*.ts      ($adapters in the apps)
```

What lives here today:

- **types** — `core.type` (`ThemeColors`, `ThemeSizes`, `ID`, …), `character-definition.type`,
  `mugen-move.type`, `map.type`, `location.type`, `profile.type`, `player-card.type`,
  `tmdb.type`, `navigation.type`.
- **utils** — `mugen/*` (frame sheets, animation, board engine, square board grid,
  PixiJS player),
  `achievement/*` (the formula language, templating, variable rules),
  `geo/pointInPolygon`, `dice/roll`, `color/compare`, `string/*`, `tmdb/*`
  (client + rate limiter), `routes/get-routes`, `localStorageWritableStore`.
- **adapters** — `adapter.class`, `tmdb.adapter`, `location.adapter`, `profile.adapter`,
  `route.adapter`.

**Rule of thumb:** anything more than one runtime package needs, or that is pure and
framework-agnostic (types, transformers, pure helpers), goes in `@3xl/shared`. App-only
UI state and components stay in the app. When you add a type/util/adapter, add it here,
not in an app.

### Achievement formulas

A badge's wording is authored once and read by every player, so the numbers in it are not
typed in: an achievement may declare `variables` — a name plus a formula — and quote them
in its own name and description between braces (`Conquereix {target} municipalitats.`). A
variable belongs to the achievement that declares it and is reachable from nowhere else,
so two badges may both call a number `target`.

A formula is arithmetic (`+ - * / % ^`, unary minus, parentheses) over what the game knows
about the player being rendered for, and *only* that: `level`; `cards` — every owned
card, or the ones matching a compound filter written in its parentheses
(`cards(box = white and not color = orange)`, `cards(color in [red, blue]) / 2`); and
`towns`, how many municipalities they occupy (one per `municipality_holders` row of theirs —
a count, not a list, since which comarca a town sits in is map data Postgres does not have
and Postgres is the side that has to reach the same answer). There are
no functions to call and no way to name anything outside the evaluation context, which is
what makes a formula safe to run against whoever turns out to be reading.

The `level` a formula reads is **the day's, not the moment's** — see the pinning below.

- `utils/achievement/formula.ts` — the language: tokenizer, parser, evaluator, and
  `CARD_FIELDS`, the one table saying which card fields a filter may test and which values
  each accepts. Every mistake is caught at **parse** time (unknown source or field, a colour
  that is not a colour, an unclosed paren); evaluation never fails and always yields a finite
  number, because by then it is going into a line a player is reading.
The same language writes the other half of a badge: its **requirement**, the condition that
earns it — two amounts compared (`>= <= > < = !=`), any number of those combined with
`and`/`or`/`not` and parentheses, and free to quote the badge's own variables by name
(`cards(color = red) >= target`). A badge with no requirement is set and shown like any
other — the day's draw is over every badge the game has — and simply cannot be completed by
anybody until one is written for it; the panel words it "Not available yet".

- `utils/achievement/template.ts` — the braces: `renderAchievement(achievement, context)` is
  what a surface calls to get one player's wording.
- `utils/achievement/requirement.ts` — `achievementMet(achievement, context)`: whether a
  player has earned it. A preview, not the authority (see below).
- `utils/achievement/progress.ts` — `achievementProgress` / `progressPercent`: how far along
  an unmet badge is, as the percentage its tile prints. A **reading**, not a rule — it has no
  PL/pgSQL counterpart, the RPC is told no percentage and computes none — so it is the one
  place in this language that makes a judgement the language does not: a comparison is the
  ratio of the two amounts, `and` is the mean of its parts, `or` the best of them. An
  unearned badge never prints 100.
- `utils/achievement/daily.ts` — the badges a player is set today: a seed hashed from their
  id and the Catalan day, and a draw from every badge the game has. Nothing is
  stored, so there is no table of assignments to seed or to disagree about, and everyone's
  set changes at midnight Europe/Madrid. **How many** is a setting, not a constant:
  `achievement_settings.daily_count` (three as provisioned), read by
  `daily_achievement_count()` in the database and handed to the browser with the pool, so
  both sides draw the same set. `DAILY_ACHIEVEMENT_COUNT` is only the fallback for a reader
  that has not got the row yet.
- `utils/achievement/variables.ts` — the rules about the *set* (names that collide or shadow
  a source, placeholders naming nothing, a requirement quoting a name nobody declared),
  called by both the admin editor and the backend
  route, so the message the author sees is the message the API would have refused with.

### Awarding an achievement — the rule lives in Postgres

Everything above is what the *browser* computes so it can show a badge and grey out one that
is not ready. None of it awards anything. Awarding is a rule, so it is enforced where a
browser cannot edit it: `claim_achievements()`, a security-definer RPC that takes **no
arguments**. It recomputes today's three itself, walks each requirement itself, and decides
the experience itself; the client submits an intention and nothing else — the same trust
model as `claim_booster` and `award_combat_exp`.

Which means the formula language has a **second implementation**, in PL/pgSQL, in
`packages/backend/supabase/achievement_templates.sql` — and two copies of an awarding rule
that drift apart pay out badges nobody earned. So:

- The **parser** stays in TypeScript and runs once, at sync time: `POST
  /api/achievement-templates/sync` compiles each requirement into a syntax tree and pushes it
  (with the source text it came from, and the badge's variables' compiled formulas) into
  `achievement_templates`. The database evaluates trees; it never parses.
- The tree is therefore a **wire format** between the two evaluators. Changing a node's shape
  means changing both, and the parity checks that hold them together are the pinned values in
  `packages/frontend/test/utils/achievement-daily.test.ts` (the seed and the draw) plus a
  formula/condition table run against both engines.
- That .sql file is the one file under `supabase/` that is **not** reference-only: the backend
  reads it off disk and executes it (`achievement-templates.ts`), so the server's evaluator and
  the browser's can be read side by side rather than one of them living inside a TypeScript
  string.
- Supabase therefore holds a badge's id **and its rule** — never its wording. A rule edited
  locally leaves the database enforcing the old one until the next sync, which is what the
  admin's `mismatch` status is for.
- The award is a third of the span of the level the player is on **at completion time**
  (`achievementExpAward` mirrors it), re-read per badge inside one claim, and recorded on
  `player_achievements.exp_awarded`.
- A completion also pays **booster packs**: one added to today's allowance per badge granted,
  plus **two** for finishing the whole of the day's set (every one of them completed *today* —
  a badge carried over from an earlier day does not count towards it). They go into
  `booster_grants`, the same day-scoped ledger `recycle_spawns` and the admin write and that
  `claim_booster` / `boosters_status` already add to the level to get the cap, so they lapse
  at Catalan midnight and nothing else had to be taught about achievements. The two amounts
  live only in `claim_achievements` and reach the browser as `boosters_granted` /
  `set_completed` on every row of the claim — the client never names them.
- The level a **rule** is read at is a different level: the day's pinned one.
  `achievement_day_levels` holds one row per player per Catalan day, written by
  `daily_achievement_level()` (security definer, no arguments) on that day's first look and
  by nothing else, and read by both the browser drawing the targets and
  `claim_achievements` walking them. Otherwise a target written as `level * 5` got harder
  while it was being worked on, and the experience a claim paid could raise the bar that
  same claim was judging against. Only the bar is pinned: `cards` and `towns` stay live, or
  a badge could not be progressed on the day it was set. What it pins is the level as it
  stood when the day was first *seen* — nothing runs at midnight Europe/Madrid, so that is
  the earliest moment there is anything to pin.
- Anything both sides of the draw have to agree on lives in Supabase for the same reason:
  the pool (`achievement_templates.requirement`), and how many are drawn
  (`achievement_settings.daily_count`, moved from the admin through
  `PUT /api/achievement-templates/settings`). A number written into two languages is one
  that can be changed in only one of them.

## Backend API (`@3xl/backend`)

A small **Node/Express 5** server (run with `tsx`) that exists only so the admin SPA can
stay a pure static app. **Dev/authoring only — it is not part of the shipped game.** Pinned
to `http://localhost:2002`; CORS allows only the admin origin (`http://localhost:2001`).

- `GET/POST /api/characters/:id` — read/write a character's
  `definition.json` in `@3xl/data`'s `public/characters/<id>/` (writes straight into the
  git tree; `:id` is constrained to `^[a-z0-9-]+$` to prevent path traversal). Validated
  against constants exported from `@3xl/shared/types/character-definition.type`.
- `GET /api/character-templates` + `POST /api/character-templates/sync` — read/sync the
  Supabase `character_templates` table (id + frontend name only) against the local `@3xl/data`
  registry, which is the source of truth. Connects directly to Postgres with the DB password
  (`SUPABASE_DB_KEY`, host derived from `PUBLIC_SUPABASE_URL`) and auto-creates the table;
  the admin `/characters` screen visualises the local↔remote diff and triggers the manual
  sync. `packages/backend/supabase/character_templates.sql` is kept for reference only.
- `GET/POST /api/achievements` + `DELETE /api/achievements/:id` — read/upsert/retire one
  achievement in `@3xl/data`'s `public/achievements.json` (glyph + name + description, plus
  any **formula variables** and its **requirement** — see above),
  validated against `@3xl/shared/types/achievement.type`. `GET /api/achievements/icons`
  lists the game-icons.net glyphs an achievement may use, read off `@3xl/assets`'
  `public/icons/<artist>/` — the same listing the save validates against, so the admin's
  picker can never offer a glyph the save would refuse.
- `GET/POST /api/music` + `DELETE /api/music/:file` — read/upsert/retire one song's
  definition in `@3xl/data`'s `public/music.json` (title + the TMDB id of the show it
  opens), validated against `@3xl/shared/types/music.type`. The songs themselves are
  assets, not entries: `GET /api/music/files` lists the mp3s found in `@3xl/assets`'
  `public/music/`, which is the list the admin `/music` screen is built from — a
  definition answers a file, so a save naming a file that is not there is refused, as is
  a link to a show `public/shows.json` does not hold.
- `GET /api/achievement-templates` + `POST /api/achievement-templates/sync` — mirror the
  local achievement **ids and compiled rules** into Supabase's `achievement_templates`. A
  badge's wording lives only in the JSON and can never go stale up there; its requirement
  *can*, which is why the sync compiles each one (with the TypeScript parser — Postgres
  evaluates trees, it never parses) and reports an `updated` list beside `added`/`removed`.
  The table is the FK target of `player_achievements` (who holds what) — world-readable, with
  no client write policy at all, so the only writer is the security-definer
  `claim_achievements()` RPC. Retiring a badge locally and syncing deletes the row *and* every
  award of it (cascade); `GET /api/achievement-templates/holders` reports the per-badge holder
  count so the admin can see that cost first. Provisions its own schema by **executing**
  `packages/backend/supabase/achievement_templates.sql` — the one file in that folder that is
  not reference-only.
- `GET/POST /api/shows` + `POST /api/shows/refresh` — read/upsert the saved-show collection in
  `@3xl/data`'s `public/shows.json` (a show, every image TMDB holds for it, and the author's
  enabled selection per section), and re-read every saved show's **title and description** from
  TMDB. The game is Catalan, so a saved show's text is Catalan text: `TMDB_LANGUAGE`
  (`@3xl/shared/types/tmdb.type`, `ca-ES` — the only Catalan variant TMDB has) goes on every
  text-bearing call. TMDB answers a field it has no Catalan text for with an empty string rather
  than falling back itself, and a Catalan title with no Catalan overview is common, so each
  field falls back independently to `TMDB_FALLBACK_LANGUAGE`: a details fetch takes it from the
  `translations` appended to the same payload, a search from one extra search of the same query
  matched by id. The refresh moves **only the text** — images, the enabled selection, votes and
  the proxied URLs are language-independent or hand-curated — and is the one call here that is
  deliberately *not* disk-cached, its whole point being to ask again. A show's name is therefore
  translated data: things that select shows key on the TMDB id instead (`showIconName`,
  `generate-shows.js`'s allowlist), and `show_templates` in Supabase needs a re-sync after a
  refresh to carry the new names.
- `/api/tmdb/*` — proxy for the admin `/shows` screen. Keeps the TMDB key server-side and
  **disk-caches** every search response, image-list, and image binary under
  `packages/backend/.cache/` (git-ignored) so TMDB is never queried twice for the same thing.
  The cache key includes the language, so a Catalan search never reads an entry written when
  results came back in English.

## Environment variables

Live in the **repo-root `.env`** (git-ignored). The backend loads it explicitly; the
frontend reads the `PUBLIC_`-prefixed ones via SvelteKit's `$env/dynamic/public`.

| Var                        | Used by  | Purpose                                   |
| -------------------------- | -------- | ----------------------------------------- |
| `TMDB_API_KEY`             | backend  | Server-only TMDB key (never sent to browser). |
| `PUBLIC_SUPABASE_URL`      | frontend | Supabase project URL for auth (magic link + OAuth). |
| `PUBLIC_SUPABASE_ANON_KEY` | frontend | Supabase anon key.                        |
| `SUPABASE_DB_KEY`          | backend  | Supabase **database password** — backend connects to Postgres to sync `character_templates` (never sent to browser). |

The Supabase client degrades gracefully when the `PUBLIC_SUPABASE_*` vars are unset,
so auth-less local dev still works.

### Sign-in providers

The sign-in panel offers a passwordless email link plus the OAuth providers listed in
`OAUTH_PROVIDERS` (`@3xl/shared/types/profile.type`) — **Google** and **Discord**. Their
client ids/secrets are *not* env vars: they are configured per project in the Supabase
dashboard (Authentication → Providers), where each provider must be enabled and given
Supabase's callback URL (`<PUBLIC_SUPABASE_URL>/auth/v1/callback`) as its redirect URI.
The app returns to the site root after consent, so `http://localhost:2000` (and the
deployed origin) must also be listed under Authentication → URL Configuration.

Adding a provider is: enable it in the dashboard, add its id to the `OAuthProvider` enum
and `OAUTH_PROVIDERS`, and add its brand mark to `ProviderIcon.svelte`. Supabase links
identities that share a *verified* email onto one user, so a player who signs in by a
different route keeps the same account. Google and Discord supply a name in
`user_metadata`, so those accounts skip the username prompt that email sign-ups get.

---

## Git & commits

- **Commit directly to `main`** — no feature branches.
- Author is the repo's configured identity (`bearni95` / bernatcanal@gmail.com); do not
  change author or add other authors.
- Commit messages are **concise plain text, no emoji**.
- **Never add a `Co-Authored-By` trailer or a "Generated with …" line** — anywhere.

---

## Architecture Principles

### Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                    Svelte Components                         │
│              (UI only - no business logic)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   Services    │ │   Adapters    │ │    Utils      │
│ (State/Data)  │ │(Transformers) │ │(Pure helpers) │
└───────────────┘ └───────────────┘ └───────────────┘
```

**Components**: Render UI, handle user interactions, dispatch events
**Services**: Manage state, persist to localStorage, provide CRUD operations
**Adapters**: Transform data between formats (API ↔ internal)
**Utils**: Pure functions for common operations

---

## Services

Services manage application state using Svelte stores with automatic localStorage persistence.

### When to Create a Service

- When data needs to persist across sessions (localStorage)
- When multiple components need access to shared state
- When you need CRUD operations on a data collection

### Service Classes

#### ArrayServiceClass<T>

For managing collections of items with unique IDs:

```typescript
// src/services/myItems.service.ts
import { ArrayServiceClass } from '$services/classes/array-service.class';

interface MyItem {
	id: string;
	name: string;
	value: number;
}

export const myItemsService = new ArrayServiceClass<MyItem>('my-items', []);
```

**Available Methods:**

- `add(item)` - Add a new item (throws if ID exists)
- `remove(item)` - Remove an item
- `update(item)` - Update an existing item by ID
- `exists(id)` - Check if item exists, returns item or null
- `all()` - Get all items
- `find(predicate)` - Find first matching item
- `filter(predicate)` - Filter items by predicate

**Using in Components:**

```svelte
<script lang="ts">
	import { myItemsService } from '$services/myItems.service';

	// Subscribe to store for reactive updates
	$: items = $myItemsService.store;

	// Or use methods for operations
	function addItem() {
		myItemsService.add({ id: crypto.randomUUID(), name: 'New', value: 0 });
	}
</script>
```

#### ObjectServiceClass<T>

For managing single objects:

```typescript
// src/services/settings.service.ts
import { ObjectServiceClass } from '$services/classes/object-service.class';

interface Settings {
	id: string;
	theme: 'light' | 'dark';
	language: string;
}

export const settingsService = new ObjectServiceClass<Settings>('settings', {
	id: 'user-settings',
	theme: 'light',
	language: 'en'
});
```

### localStorage Keys

Services automatically namespace their localStorage keys:

- Array services: `array-service:{id}`
- Object services: `object-service:{id}`

### SSR Considerations

Services use the `localStorageWritableStore` utility which automatically handles SSR by falling back to a regular Svelte writable store when `browser` is false.

---

## Adapters

Adapters transform data between external formats (APIs, raw data) and internal application formats. **All data transformation logic belongs in adapters, not in components or services.**

### When to Create an Adapter

- When consuming external API responses
- When transforming data for display
- When preparing data for API submissions
- When mapping between different data structures

### Creating an Adapter

```typescript
// packages/shared/src/adapters/classes/user.adapter.ts
import { AdapterClass } from '$adapters/classes/adapter.class';

interface ApiUser {
	user_id: string;
	first_name: string;
	last_name: string;
	email_address: string;
}

interface User {
	id: string;
	fullName: string;
	email: string;
}

export class UserAdapter extends AdapterClass {
	constructor() {
		super('user');
	}

	fromApi(apiUser: ApiUser): User {
		return {
			id: apiUser.user_id,
			fullName: `${apiUser.first_name} ${apiUser.last_name}`,
			email: apiUser.email_address
		};
	}

	toApi(user: User): Partial<ApiUser> {
		const [firstName, ...lastNameParts] = user.fullName.split(' ');
		return {
			first_name: firstName,
			last_name: lastNameParts.join(' '),
			email_address: user.email
		};
	}

	toDisplayFormat(user: User): string {
		return `${user.fullName} <${user.email}>`;
	}
}

export const userAdapter = new UserAdapter();
```

### Adapter Patterns

1. **Always create static instances** for adapters (singleton pattern)
2. **Name methods clearly**: `fromApi`, `toApi`, `toDisplayFormat`, etc.
3. **Keep transformations pure** - no side effects
4. **Type both input and output** for type safety

---

## Svelte Components

Components must be **modular, atomic, and reusable**. They contain **only UI logic** - all business logic lives in services and adapters.

### Component Rules

1. **No business logic in components** - delegate to services/adapters
2. **No `<style>` tags** - use Tailwind classes only
3. **No inline styles** - use Tailwind classes only
4. **Use `classnames` package** for conditional styling
5. **Props should be typed** with TypeScript
6. **Dispatch events** for parent communication
7. **Keep components small** - break into smaller pieces when needed

### Component Template

```svelte
<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { ThemeColors, ThemeSizes } from '$types/core.type';

	// Props - typed with defaults
	export let label: string = '';
	export let variant: ThemeColors = ThemeColors.Primary;
	export let size: ThemeSizes = ThemeSizes.Medium;
	export let disabled: boolean = false;
	export let classes: string = '';

	// Event dispatcher for parent communication
	const dispatch = createEventDispatcher();

	// Variant mappings (keep in component for UI concerns)
	const variantClasses: Record<ThemeColors, string> = {
		[ThemeColors.Primary]: 'bg-primary text-primary-content',
		[ThemeColors.Secondary]: 'bg-secondary text-secondary-content'
		// ... other variants
	};

	// Reactive class computation using classnames
	$: computedClasses = classNames(
		'base-class',
		variantClasses[variant],
		{
			'opacity-50 cursor-not-allowed': disabled,
			'hover:scale-105': !disabled
		},
		classes // Allow parent to extend classes
	);

	// Event handlers
	function handleClick() {
		if (!disabled) {
			dispatch('click');
		}
	}
</script>

<button class={computedClasses} {disabled} on:click={handleClick}>
	{#if label}
		{label}
	{:else}
		<slot />
	{/if}
</button>
```

### Using `classnames` for Conditional Styling

The `classnames` package is **required** for all conditional class rendering:

```typescript
import classNames from 'classnames';

// String arguments (always applied)
classNames('btn', 'relative', 'flex');

// Object syntax (conditional)
classNames({
	'bg-primary': isPrimary,
	'bg-secondary': isSecondary,
	'opacity-50': disabled
});

// Mixed usage
classNames(
	'btn',
	'relative',
	typeClasses[type],
	{
		'btn-outline': outline,
		'w-full': wide,
		'cursor-pointer': !disabled
	},
	customClasses
);

// Null/undefined values are safely ignored
classNames('btn', null, undefined, '', 'active'); // => 'btn active'
```

### Component Composition

Break complex UIs into smaller, focused components:

```
Card.svelte
├── CardHeader.svelte
├── CardBody.svelte
└── CardFooter.svelte

Form.svelte
├── FormField.svelte
├── FormLabel.svelte
└── FormError.svelte
```

### Event Handling

Components should dispatch events for parent communication:

```svelte
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher<{
		click: void;
		change: { value: string };
		submit: { data: FormData };
	}>();

	function handleSubmit(data: FormData) {
		dispatch('submit', { data });
	}
</script>
```

---

## CSS & Styling Guidelines

### Absolute Rules

1. **NEVER use `<style>` tags** in Svelte components
2. **NEVER use inline `style` attributes**
3. **ALWAYS use Tailwind CSS classes**
4. **ALWAYS use `classnames`** for conditional rendering

### Tailwind Configuration

This project uses:

- **TailwindCSS v4** (with `@tailwindcss/vite` plugin)
- **DaisyUI v5** for pre-built component classes

### Theme Colors & Sizes

Use the enums from `$types/core.type.ts`:

```typescript
import { ThemeColors, ThemeSizes, ColorsToBackgrounds, ColorsToText } from '$types/core.type';

// Available colors
ThemeColors.Primary; // 'primary'
ThemeColors.Secondary; // 'secondary'
ThemeColors.Accent; // 'accent'
ThemeColors.Success; // 'success'
ThemeColors.Error; // 'error'
ThemeColors.Info; // 'info'
ThemeColors.Warning; // 'warning'
ThemeColors.Neutral; // 'neutral'

// Available sizes
ThemeSizes.XSmall; // 'xs'
ThemeSizes.Small; // 'sm'
ThemeSizes.Medium; // 'md'
ThemeSizes.Large; // 'lg'
ThemeSizes.XLarge; // 'xl'
```

### DaisyUI Components

Prefer DaisyUI classes for common UI patterns:

```html
<!-- Buttons -->
<button class="btn btn-primary btn-sm">Click</button>

<!-- Cards -->
<div class="card bg-base-100 shadow-xl">
	<div class="card-body">Content</div>
</div>

<!-- Inputs -->
<input class="input input-bordered input-primary" />

<!-- Badges -->
<span class="badge badge-success">Active</span>
```

### Responsive Design

Use Tailwind's responsive prefixes:

```html
<div class="flex flex-col md:flex-row lg:gap-4">
	<div class="w-full md:w-1/2 lg:w-1/3">Content</div>
</div>
```

---

## Type Definitions

### Core Types Location

Shared types live in the `@3xl/shared` package (`packages/shared/src/types/`), reached
via the `$types` alias in the apps or the `@3xl/shared/types/*` subpath from the backend:

```typescript
// packages/shared/src/types/core.type.ts             - ThemeColors/Sizes, ID, enums
// packages/shared/src/types/character-definition.type.ts - move kinds, stats, colors
// packages/shared/src/types/tmdb.type.ts              - TMDB API/display shapes
```

### ID Type

Always use the `ID` type for entity identifiers:

```typescript
import type { ID } from '$types/core.type';

interface Entity {
	id: ID; // string | number
	// ...
}
```

---

## Utilities

Utilities are **pure functions** with no side effects.

### Creating Utilities

```typescript
// packages/shared/src/utils/string/slugify.ts
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '');
}
```

### Using Utilities

```typescript
import { capitalize } from '$utils/string/capitalize';
import { normalize } from '$utils/string/normalize';

const name = capitalize(normalize(rawInput));
```

---

## Testing

Tests live in the frontend package's `packages/frontend/test/` directory (Vitest +
`@testing-library/svelte`, config in `packages/frontend/vitest.config.ts`). They cover
app services plus the `@3xl/shared` utils/adapters the frontend consumes.

```
packages/frontend/test/
├── services/     # Service unit tests
├── adapters/     # Adapter unit tests
├── utils/        # Utility function tests (dice, board grid, color, localStorage store…)
└── components/   # Component tests (with @testing-library/svelte)
```

### Running Tests

```bash
pnpm test           # Run all tests (from repo root; delegates to @3xl/frontend)
pnpm --filter @3xl/frontend test:ui        # Interactive test UI
pnpm --filter @3xl/frontend test:coverage  # Coverage report
```

---

## i18n (Internationalization)

Use `svelte-i18n` for translations:

```svelte
<script lang="ts">
	import { _ } from 'svelte-i18n';
</script>

<h1>{$_('common.welcome')}</h1><p>{$_('errors.notFound')}</p>
```

Each app has its own translations under `src/services/i18n/locales/` (`en.json`, plus a
generated `qq.json` pseudo-locale — regenerate the frontend's with `pnpm dev:qq`).

---

## Quick Reference Checklist

When implementing a new feature:

- [ ] Create types in `@3xl/shared` (`packages/shared/src/types/`) if needed
- [ ] Put pure helpers/transformers in `@3xl/shared` (`utils/`, `adapters/`)
- [ ] Create/extend service in the app's `src/services/` for state management
- [ ] Create component(s) in the app's `src/components/` for UI
- [ ] Use `classnames` for all conditional styling
- [ ] No `<style>` tags or inline styles
- [ ] Components dispatch events, don't contain business logic
- [ ] Write tests in `packages/frontend/test/`
- [ ] Use path aliases (`$services`, `$adapters`, etc.); import the registry from `@3xl/data`
- [ ] Don't hand-edit generated files (registry, manifests, moves, geo) — re-run the script
