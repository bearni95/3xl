<script lang="ts">
	import CharacterTemplateSync from '$components/core/CharacterTemplateSync.svelte';
	import CharacterShowGroups from '$components/core/CharacterShowGroups.svelte';
	import { characters, defaultCharacterId } from '@3xl/data';
	import type { CharacterTemplateStatus } from '$types/character-template.type';

	// Which card is highlighted. The detail views a selection used to open are
	// per-character routes under /characters/dashboard now, so this is the grid's
	// own state and nothing else reads it.
	let selectedId = defaultCharacterId;

	// Per-character Supabase sync status, published by CharacterTemplateSync once
	// the remote templates load; drives the badge on each grid card.
	let syncStatusById = new Map<string, CharacterTemplateStatus>();

	// Per-character Supabase rarity, published by CharacterTemplateSync; seeds the
	// per-card rarity editor and is kept current as cards save their edits.
	let rarityById = new Map<string, number>();

	function handleRaritySaved(event: CustomEvent<{ id: string; rarity: number }>) {
		rarityById = new Map(rarityById).set(event.detail.id, event.detail.rarity);
	}
</script>

<div class="flex-1 bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-6xl flex-col gap-6">
		<header class="flex flex-col gap-2">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold">Characters</h1>
				<span class="badge badge-neutral">{characters.length} characters</span>
			</div>
			<p class="text-sm opacity-70">
				Every imported character, grouped by the show it belongs to, with its Supabase sync state and
				rarity tier on the card. A character's definition, stats, frames and imported moves are its
				own pages, reached from the dashboard.
			</p>
			<div class="flex flex-wrap gap-4 text-sm">
				<a class="link link-primary" href="/characters/dashboard">Character dashboard →</a>
				<a class="link link-primary" href="/">← Back to stage</a>
			</div>
		</header>

		<CharacterTemplateSync
			on:statuschange={(event) => (syncStatusById = event.detail)}
			on:raritychange={(event) => (rarityById = event.detail)}
		/>

		<CharacterShowGroups
			{characters}
			{selectedId}
			{syncStatusById}
			{rarityById}
			on:select={(event) => (selectedId = event.detail.id)}
			on:raritysaved={handleRaritySaved}
		/>
	</div>
</div>
