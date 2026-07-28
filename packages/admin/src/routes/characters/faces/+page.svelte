<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterFacesCard from '$components/core/CharacterFacesCard.svelte';
	import CharacterShowGroups from '$components/core/CharacterShowGroups.svelte';
	import { characters } from '@3xl/data';
	import { DEFAULT_RARITY, type CharacterTemplate } from '$types/character-template.type';

	// Rarity lives only in Supabase, read through @3xl/backend (default :2002).
	// This page doesn't edit it — it only needs the map so the grid orders each
	// show's characters exactly like /characters does.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	let rarityById = new Map<string, number>();

	onMount(async () => {
		try {
			const res = await fetch(`${API_BASE}/api/character-templates`);
			if (!res.ok) return;
			const { templates } = (await res.json()) as { templates: CharacterTemplate[] };
			rarityById = new Map(templates.map((t) => [t.id, t.rarity ?? DEFAULT_RARITY]));
		} catch {
			// Ordering is cosmetic — without rarities the grid keeps registry order.
		}
	});
</script>

<div class="min-h-screen bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-6xl flex-col gap-6">
		<header class="flex flex-col gap-2">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold">Character faces</h1>
				<span class="badge badge-neutral">{characters.length} characters</span>
			</div>
			<p class="text-sm opacity-70">
				Every MUGEN-defined face and avatar each character ships in sprite group 9000. Pick which
				portrait the board shows for a character, then save straight into the git tree.
			</p>
			<a class="link link-primary text-sm" href="/characters">← Back to character frames</a>
		</header>

		<CharacterShowGroups {characters} {rarityById} let:character>
			<CharacterFacesCard {character} />
		</CharacterShowGroups>
	</div>
</div>
