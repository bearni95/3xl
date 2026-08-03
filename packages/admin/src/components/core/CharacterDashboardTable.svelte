<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterDashboardRow from '$components/core/CharacterDashboardRow.svelte';
	import type { CharacterOption } from '@3xl/data';
	import { DEFAULT_RARITY, type CharacterTemplate } from '$types/character-template.type';
	import type { ShowCharacterAssignments, ShowTemplate } from '$types/show-template.type';

	// Everything this table adds to the registry — which show claims a character
	// and its rarity tier — lives only in Supabase, read through @3xl/backend
	// (default :2002): the same endpoints the /characters grid reads. Each row
	// owns its own writes.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The full character list to lay out, one row each.
	export let characters: CharacterOption[] = [];

	let rarityById = new Map<string, number>();
	let assignments: ShowCharacterAssignments = {};
	let showTemplates: ShowTemplate[] = [];
	let loading = false;
	let loadError = '';

	onMount(load);

	async function load() {
		loading = true;
		loadError = '';
		try {
			const [templatesRes, assignRes, showsRes] = await Promise.all([
				fetch(`${API_BASE}/api/character-templates`),
				fetch(`${API_BASE}/api/show-templates/assignments`),
				fetch(`${API_BASE}/api/show-templates`)
			]);
			if (!templatesRes.ok) throw new Error(`Failed to load templates (${templatesRes.status})`);
			if (!assignRes.ok) throw new Error(`Failed to load assignments (${assignRes.status})`);
			if (!showsRes.ok) throw new Error(`Failed to load shows (${showsRes.status})`);
			const { templates } = (await templatesRes.json()) as { templates: CharacterTemplate[] };
			rarityById = new Map(templates.map((t) => [t.id, t.rarity ?? DEFAULT_RARITY]));
			assignments = ((await assignRes.json()) as { assignments: ShowCharacterAssignments })
				.assignments;
			showTemplates = ((await showsRes.json()) as { templates: ShowTemplate[] }).templates;
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
	// Shows a character can be moved to, by name — the order the select reads in.
	$: showOptions = [...showTemplates].sort((a, b) => a.name.localeCompare(b.name));

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

	/** One table row: a character with the show and rarity it reads as. */
	interface Row {
		character: CharacterOption;
		showId: number | null;
		showName: string;
		rarity: number;
	}

	// Ordered exactly as the /characters grid orders its sections and cards — by
	// show name, characters with no show last, and by rarity (highest first)
	// inside each show — so the same table reads as that grid unrolled.
	//
	// Built from what the load returned and left alone after that: a row that has
	// just been given another show or another tier keeps its place until the page
	// is reloaded, rather than jumping out from under the field being edited.
	$: rows = buildRows(characters, showIdByCharacter, showNameById, rarityById);

	function buildRows(
		all: CharacterOption[],
		showByCharacter: Map<string, number>,
		names: Map<number, string>,
		rarities: Map<string, number>
	): Row[] {
		return all
			.map((character) => {
				const showId = showByCharacter.get(character.id) ?? null;
				return {
					character,
					showId,
					showName: showId === null ? '' : (names.get(showId) ?? `Show ${showId}`),
					rarity: rarities.get(character.id) ?? DEFAULT_RARITY
				};
			})
			.sort((a, b) => {
				// An empty show name sorts last rather than first: it is "no show",
				// not a name that happens to precede every other one.
				if (a.showName !== b.showName) {
					if (!a.showName) return 1;
					if (!b.showName) return -1;
					return a.showName.localeCompare(b.showName);
				}
				return b.rarity - a.rarity;
			});
	}
</script>

{#if loadError}
	<div class="alert alert-warning">
		<span>{loadError}</span>
	</div>
{:else if loading}
	<div class="flex items-center gap-2 opacity-70">
		<span class="loading loading-spinner loading-sm"></span>
		<span>Loading characters…</span>
	</div>
{/if}

<div class="overflow-x-auto">
	<table class="table table-zebra">
		<thead>
			<tr>
				<!-- Wide enough for the row's portrait and the two animation previews it
				     spans, and no wider: the editable fields are what the table is for. -->
				<th class="w-44"></th>
				<th>Character</th>
				<th>Show</th>
				<th>Rarity</th>
				<th>Detail</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.character.id)}
				<CharacterDashboardRow
					character={row.character}
					showId={row.showId}
					rarity={row.rarity}
					shows={showOptions}
				/>
			{/each}
		</tbody>
	</table>
</div>
