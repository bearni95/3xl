<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import CharacterGridCard from '$components/core/CharacterGridCard.svelte';
	import type { CharacterOption } from '@3xl/data';
	import type { CharacterTemplateStatus } from '$types/character-template.type';
	import type { ShowCharacterAssignments, ShowTemplate } from '$types/show-template.type';

	// The full character list to lay out, the active selection, and each
	// character's Supabase sync state (badged by the grid card). This component
	// only reorganises the flat grid into per-show sections — selection and
	// sync-status ownership stay with the parent page.
	export let characters: CharacterOption[] = [];
	export let selectedId: string;
	export let syncStatusById: Map<string, CharacterTemplateStatus> = new Map();
	// Each character's Supabase rarity, seeding the per-card rarity editor.
	export let rarityById: Map<string, number> = new Map();

	// Which show each character belongs to lives only in Supabase (the
	// `show_characters` join), read through @3xl/backend (default :2002) — same
	// endpoints the /shows "Show cast" panel uses.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	const dispatch = createEventDispatcher<{ select: CharacterOption }>();

	let assignments: ShowCharacterAssignments = {};
	let showTemplates: ShowTemplate[] = [];
	let loading = false;
	let loadError = '';
	let loaded = false;

	onMount(load);

	async function load() {
		loading = true;
		loadError = '';
		try {
			const [assignRes, showsRes] = await Promise.all([
				fetch(`${API_BASE}/api/show-templates/assignments`),
				fetch(`${API_BASE}/api/show-templates`)
			]);
			if (!assignRes.ok) throw new Error(`Failed to load assignments (${assignRes.status})`);
			if (!showsRes.ok) throw new Error(`Failed to load shows (${showsRes.status})`);
			assignments = ((await assignRes.json()) as { assignments: ShowCharacterAssignments })
				.assignments;
			showTemplates = ((await showsRes.json()) as { templates: ShowTemplate[] }).templates;
			loaded = true;
		} catch (err) {
			loadError = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	// Invert the show→characters map to characterId→showId. Each character
	// belongs to a single show, so the first show that claims it wins.
	$: showIdByCharacter = buildShowIdByCharacter(assignments);
	$: showNameById = new Map(showTemplates.map((t) => [t.id, t.name]));

	function buildShowIdByCharacter(map: ShowCharacterAssignments): Map<string, number> {
		const result = new Map<string, number>();
		for (const [showId, characterIds] of Object.entries(map)) {
			const numericShowId = Number(showId);
			for (const characterId of characterIds) {
				if (!result.has(characterId)) result.set(characterId, numericShowId);
			}
		}
		return result;
	}

	// One section per show that has assigned characters, sorted by show name,
	// with an "Unassigned" section last for characters no show claims. Characters
	// keep the registry order inside each section.
	interface ShowGroup {
		key: string;
		name: string;
		characters: CharacterOption[];
	}

	$: groups = buildGroups(characters, showIdByCharacter, showNameById);

	function buildGroups(
		all: CharacterOption[],
		showByCharacter: Map<string, number>,
		names: Map<number, string>
	): ShowGroup[] {
		const byShow = new Map<number, CharacterOption[]>();
		const unassigned: CharacterOption[] = [];
		for (const character of all) {
			const showId = showByCharacter.get(character.id);
			if (showId === undefined) {
				unassigned.push(character);
			} else {
				(byShow.get(showId) ?? byShow.set(showId, []).get(showId)!).push(character);
			}
		}
		const showGroups: ShowGroup[] = [...byShow.entries()]
			.map(([showId, chars]) => ({
				key: `show-${showId}`,
				name: names.get(showId) ?? `Show ${showId}`,
				characters: chars
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
		if (unassigned.length > 0) {
			showGroups.push({ key: 'unassigned', name: 'Unassigned', characters: unassigned });
		}
		return showGroups;
	}
</script>

{#if loaded && !loadError}
	<div class="flex flex-col gap-6">
		{#each groups as group (group.key)}
			<section class="flex flex-col gap-3">
				<div class="flex items-center gap-2">
					<h2 class="text-lg font-semibold">{group.name}</h2>
					<span class="badge badge-neutral badge-sm">{group.characters.length}</span>
				</div>
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{#each group.characters as character (character.id)}
						<CharacterGridCard
							{character}
							selected={character.id === selectedId}
							syncStatus={syncStatusById.get(character.id)}
							rarity={rarityById.get(character.id)}
							on:select={(event) => dispatch('select', event.detail)}
							on:raritysaved
						/>
					{/each}
				</div>
			</section>
		{/each}
	</div>
{:else}
	<!-- Still loading, or the grouping fetch failed: fall back to one flat grid so
	     the characters are always reachable. -->
	{#if loadError}
		<div class="alert alert-warning">
			<span>Couldn't group by show ({loadError}) — showing every character together.</span>
		</div>
	{:else if loading}
		<div class="flex items-center gap-2 opacity-70">
			<span class="loading loading-spinner loading-sm"></span>
			<span>Loading show assignments…</span>
		</div>
	{/if}
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
		{#each characters as character (character.id)}
			<CharacterGridCard
				{character}
				selected={character.id === selectedId}
				syncStatus={syncStatusById.get(character.id)}
				rarity={rarityById.get(character.id)}
				on:select={(event) => dispatch('select', event.detail)}
				on:raritysaved
			/>
		{/each}
	</div>
{/if}
