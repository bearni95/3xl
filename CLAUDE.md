# Arktosmos Boilerplate - Development Guidelines

This document guides Claude (and developers) on implementing features using this SvelteKit boilerplate. Follow these conventions strictly to maintain consistency across the codebase.

## Monorepo Structure

This is a **pnpm workspace** (`pnpm-workspace.yaml` → `packages/*`). Run everything
from the repo root; scripts delegate to the right package via `pnpm --filter`.

```
packages/
├── frontend/  (@3xl/frontend)  SvelteKit web app — the only UI package
├── mugen/     (@3xl/mugen)      MUGEN import/assembly scripts (write assets + data)
├── assets/    (@3xl/assets)     generated sprite frames + manifests + auras (public/)
└── data/      (@3xl/data)       character registry module + JSON definitions + movesets
```

**Data flow**: `@3xl/mugen` reads raw archives (`mugen-characters/`) + decode inputs
(`characters-src/<id>/`) and *writes into* `@3xl/assets` (`public/<id>/frames/`,
`public/auras/`) and `@3xl/data` (`registry.generated.ts`, plus each character's
`public/characters/<id>/definition.json` and `public/characters/<id>/mugen-moves.json`;
the unrelated Països Catalans map layers stay separate under `public/geo/`).
`@3xl/frontend` *installs* both as `workspace:*` deps:
it imports the registry as a module (`import { characters } from '@3xl/data'`) and serves
their `public/` dirs at the `/assets` and `/data` URL prefixes via the
`serveWorkspacePublic()` Vite plugin in `packages/frontend/vite.config.ts`. Do not
hand-edit generated files (`registry.generated.ts`, `manifest.json`, `mugen-moves.json`)
or the decoded assets — re-run `pnpm import:mugen` / `generate:sprites` / `generate:auras`.

Root scripts: `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm check`, `pnpm test`,
`pnpm import:mugen`, `pnpm generate:sprites`, `pnpm generate:auras`.

### Frontend structure (`packages/frontend/src/`)

```
src/
├── adapters/classes/     # Data transformation logic
├── components/core/      # Reusable UI components
├── routes/               # SvelteKit pages and layouts
├── services/classes/     # State management with localStorage persistence
├── types/                # TypeScript type definitions
├── utils/                # Pure utility functions
├── css/                  # Global styles (Tailwind imports)
└── services/i18n/        # Internationalization
```

### Path Aliases

Frontend import aliases (defined in `packages/frontend/svelte.config.js`, scoped to
the frontend package):

```typescript
$components  → src/components/*
$services    → src/services/*
$adapters    → src/adapters/*
$utils       → src/utils/*
$types       → src/types/*
```

The character registry is **not** an alias — import it from the workspace package:
`import { characters, defaultCharacterId, type CharacterOption } from '@3xl/data';`

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
// src/adapters/classes/user.adapter.ts
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

Define shared types in `src/types/`:

```typescript
// src/types/core.type.ts - shared across the app
// src/types/user.type.ts - user-specific types
// src/types/api.type.ts - API response types
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
// src/utils/string/slugify.ts
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

Tests are located in the `test/` directory mirroring the `src/` structure.

```
test/
├── services/     # Service unit tests
├── adapters/     # Adapter unit tests
├── utils/        # Utility function tests
└── components/   # Component tests (with @testing-library/svelte)
```

### Running Tests

```bash
pnpm test           # Run all tests
pnpm test:ui        # Interactive test UI
pnpm test:coverage  # Coverage report
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

Translations are in `src/services/i18n/locales/`.

---

## Quick Reference Checklist

When implementing a new feature:

- [ ] Create types in `src/types/` if needed
- [ ] Create/extend service in `src/services/` for state management
- [ ] Create adapter in `src/adapters/` for data transformation
- [ ] Create component(s) in `src/components/` for UI
- [ ] Use `classnames` for all conditional styling
- [ ] No `<style>` tags or inline styles
- [ ] Components dispatch events, don't contain business logic
- [ ] Write tests in `test/` directory
- [ ] Use path aliases (`$services`, `$adapters`, etc.)
