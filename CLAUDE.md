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
  ever darkens, so white artwork is what makes any colour reachable). A
  game-icons.net SVG ships as white artwork on an opaque black square: strip the
  background path and keep the white before committing it.

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
map (the Challenge button on a municipality). Admin routes: `/characters` (definition editor), `/shows` (TMDB browser) and
`/achievements` (badge editor + Supabase id sync).

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
- **utils** — `mugen/*` (frame sheets, animation, board engine, hex, PixiJS player),
  `geo/pointInPolygon`, `dice/roll`, `color/compare`, `string/*`, `tmdb/*`
  (client + rate limiter), `routes/get-routes`, `localStorageWritableStore`.
- **adapters** — `adapter.class`, `tmdb.adapter`, `location.adapter`, `profile.adapter`,
  `route.adapter`.

**Rule of thumb:** anything more than one runtime package needs, or that is pure and
framework-agnostic (types, transformers, pure helpers), goes in `@3xl/shared`. App-only
UI state and components stay in the app. When you add a type/util/adapter, add it here,
not in an app.

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
  achievement in `@3xl/data`'s `public/achievements.json` (glyph + name + description),
  validated against `@3xl/shared/types/achievement.type`. `GET /api/achievements/icons`
  lists the game-icons.net glyphs an achievement may use, read off `@3xl/assets`'
  `public/icons/<artist>/` — the same listing the save validates against, so the admin's
  picker can never offer a glyph the save would refuse.
- `GET /api/achievement-templates` + `POST /api/achievement-templates/sync` — mirror the
  local achievement **ids** into Supabase's `achievement_templates`, which holds nothing
  else: a badge's wording lives only in the JSON, so it can never go stale up there. The
  table exists to be the FK target of `player_achievements` (who holds what) — world-readable,
  with no client write policy at all, so awarding will come from a security-definer RPC.
  Retiring a badge locally and syncing deletes the row *and* every award of it (cascade);
  `GET /api/achievement-templates/holders` reports the per-badge holder count so the admin
  can see that cost first. Provisions its own tables;
  `packages/backend/supabase/achievement_templates.sql` is kept for reference only.
- `/api/tmdb/*` — proxy for the admin `/shows` screen. Keeps the TMDB key server-side and
  **disk-caches** every search response, image-list, and image binary under
  `packages/backend/.cache/` (git-ignored) so TMDB is never queried twice for the same thing.

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
├── utils/        # Utility function tests (dice, hex, color, localStorage store…)
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
